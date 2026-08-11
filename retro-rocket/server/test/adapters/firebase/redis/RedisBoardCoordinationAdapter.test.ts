import { describe, it, expect, vi } from 'vitest';
import { RedisBoardCoordinationAdapter, ownerKey, eventsChannel, RENEW_SCRIPT, RELEASE_SCRIPT } from '../../../../src/adapters/firebase/redis/RedisBoardCoordinationAdapter';
import type { RedisLike } from '../../../../src/adapters/firebase/redis/RedisLike';
import type { RealtimeEvent } from '../../../../src/application/ports/realtime';

// RedisBoardCoordinationAdapter implements the lease acquire/renew/release protocol
// (contracts/redis-coordination-protocol.md §1-3) plus the pub/sub relay (§4-5). Unlike
// this codebase's Firestore adapters — which depend on firebase-admin's SDK and are
// deliberately verified only via Playwright E2E, per every adapter's own doc comment —
// this adapter depends on a narrow, project-owned `RedisLike` interface (not the full
// ioredis SDK), so a small in-memory fake double is practical and realistic here,
// letting the actual lease decision logic be unit-tested directly.

/** In-memory double implementing just the RedisLike surface this adapter uses,
 * including the two Lua scripts' compare-and-renew/compare-and-delete semantics
 * (identified by exact script-string equality, since a real Lua interpreter isn't
 * available in this fake). */
class FakeRedis implements RedisLike {
    private readonly store = new Map<string, { value: string; expiresAt: number }>();
    private readonly listeners: Array<(channel: string, message: string) => void> = [];
    readonly published: Array<{ channel: string; message: string }> = [];
    readonly subscribedChannels = new Set<string>();

    constructor(private readonly now: () => number = Date.now) {}

    private isPresent(key: string): boolean {
        const entry = this.store.get(key);
        if (!entry) return false;
        if (this.now() >= entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }

    async set(key: string, value: string, _mode: 'NX', _ttlFlag: 'PX', ttlMs: number): Promise<'OK' | null> {
        if (this.isPresent(key)) return null;
        this.store.set(key, { value, expiresAt: this.now() + ttlMs });
        return 'OK';
    }

    async eval(script: string, _numKeys: number, ...args: Array<string | number>): Promise<unknown> {
        const [key, expectedValue, ttlMs] = args as [string, string, string?];
        const entry = this.isPresent(key) ? this.store.get(key) : undefined;
        if (script === RENEW_SCRIPT) {
            if (!entry || entry.value !== expectedValue) return 0;
            entry.expiresAt = this.now() + Number(ttlMs);
            return 1;
        }
        if (script === RELEASE_SCRIPT) {
            if (!entry || entry.value !== expectedValue) return 0;
            this.store.delete(key);
            return 1;
        }
        throw new Error(`FakeRedis: unrecognized script`);
    }

    async publish(channel: string, message: string): Promise<number> {
        this.published.push({ channel, message });
        for (const listener of this.listeners) listener(channel, message);
        return this.listeners.length;
    }

    async subscribe(channel: string): Promise<void> {
        this.subscribedChannels.add(channel);
    }

    async unsubscribe(channel: string): Promise<void> {
        this.subscribedChannels.delete(channel);
    }

    on(_event: 'message', listener: (channel: string, message: string) => void): void {
        this.listeners.push(listener);
    }

    /** Test helper: directly seed a lease as held by a given instance, bypassing set(). */
    seedOwner(boardId: string, instanceId: string, ttlMs: number): void {
        this.store.set(ownerKey(boardId), { value: instanceId, expiresAt: this.now() + ttlMs });
    }
}

describe('ownerKey / eventsChannel', () => {
    it('produces the documented key/channel patterns', () => {
        expect(ownerKey('board-1')).toBe('board-owner:board-1');
        expect(eventsChannel('board-1')).toBe('board-events:board-1');
    });
});

describe('RedisBoardCoordinationAdapter.tryAcquire', () => {
    it('succeeds and reports ownership when the key is absent', async () => {
        const redis = new FakeRedis();
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });

        const acquired = await adapter.tryAcquire('board-1');

        expect(acquired).toBe(true);
        expect(adapter.isOwner('board-1')).toBe(true);
    });

    it('fails and does not report ownership when another instance already holds the lease', async () => {
        const redis = new FakeRedis();
        redis.seedOwner('board-1', 'instance-b', 5000);
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });

        const acquired = await adapter.tryAcquire('board-1');

        expect(acquired).toBe(false);
        expect(adapter.isOwner('board-1')).toBe(false);
    });

    it('is invokable repeatedly and independently of any registration event — the primitive trigger (b) periodic re-checking depends on', async () => {
        const redis = new FakeRedis();
        redis.seedOwner('board-1', 'instance-b', 1);
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });

        // First attempt fails (still held by instance-b).
        expect(await adapter.tryAcquire('board-1')).toBe(false);

        // A later, independent attempt (simulating a periodic re-check tick, not a new
        // registration) succeeds once the other lease has naturally expired.
        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(await adapter.tryAcquire('board-1')).toBe(true);
        expect(adapter.isOwner('board-1')).toBe(true);
    });
});

describe('RedisBoardCoordinationAdapter.renew', () => {
    it('renews and returns true while still holding the lease', async () => {
        const redis = new FakeRedis();
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });
        await adapter.tryAcquire('board-1');

        const renewed = await adapter.renew('board-1');

        expect(renewed).toBe(true);
        expect(adapter.isOwner('board-1')).toBe(true);
    });

    it('does not renew and reports lost ownership when another instance already took over', async () => {
        const redis = new FakeRedis();
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });
        await adapter.tryAcquire('board-1');
        // Simulate another instance winning the lease after expiry (bypassing this
        // adapter's own bookkeeping, the way a real crash/expiry scenario would).
        redis.seedOwner('board-1', 'instance-b', 5000);

        const renewed = await adapter.renew('board-1');

        expect(renewed).toBe(false);
        expect(adapter.isOwner('board-1')).toBe(false);
    });

    it('returns false without a Redis call when this instance never held the lease', async () => {
        const redis = new FakeRedis();
        const evalSpy = vi.spyOn(redis, 'eval');
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });

        const renewed = await adapter.renew('board-1');

        expect(renewed).toBe(false);
        expect(evalSpy).not.toHaveBeenCalled();
    });
});

describe('RedisBoardCoordinationAdapter.release', () => {
    it('deletes the lease and clears local ownership when still owned', async () => {
        const redis = new FakeRedis();
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });
        await adapter.tryAcquire('board-1');

        await adapter.release('board-1');

        expect(adapter.isOwner('board-1')).toBe(false);
        const other = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-b' });
        expect(await other.tryAcquire('board-1')).toBe(true);
    });

    it('is a safe no-op when this instance does not hold the lease', async () => {
        const redis = new FakeRedis();
        redis.seedOwner('board-1', 'instance-b', 5000);
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });

        await expect(adapter.release('board-1')).resolves.not.toThrow();

        // instance-b's lease must survive untouched.
        const other = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-c' });
        expect(await other.tryAcquire('board-1')).toBe(false);
    });
});

describe('RedisBoardCoordinationAdapter publish/subscribe', () => {
    it('publishes a RealtimeEvent as JSON on the board\'s events channel', async () => {
        const redis = new FakeRedis();
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });
        const event: RealtimeEvent = { type: 'entity_change', entity: 'card', op: 'created', id: 'card-1', data: { id: 'card-1' } };

        await adapter.publish('board-1', event);

        expect(redis.published).toEqual([{ channel: 'board-events:board-1', message: JSON.stringify(event) }]);
    });

    it('delivers a subscribed board\'s messages to the registered handler, ignoring other boards\' channels', async () => {
        const redis = new FakeRedis();
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });
        const received: RealtimeEvent[] = [];
        await adapter.subscribe('board-1', (event) => received.push(event));

        const event: RealtimeEvent = { type: 'entity_change', entity: 'card', op: 'created', id: 'card-1', data: { id: 'card-1' } };
        await redis.publish('board-events:board-1', JSON.stringify(event));
        await redis.publish('board-events:board-2', JSON.stringify({ ...event, id: 'card-2' }));

        expect(received).toEqual([event]);
        expect(redis.subscribedChannels.has('board-events:board-1')).toBe(true);
    });

    it('stops delivering after unsubscribe', async () => {
        const redis = new FakeRedis();
        const adapter = new RedisBoardCoordinationAdapter(redis, redis, { leaseMs: 5000, instanceId: 'instance-a' });
        const received: RealtimeEvent[] = [];
        await adapter.subscribe('board-1', (event) => received.push(event));
        await adapter.unsubscribe('board-1');

        const event: RealtimeEvent = { type: 'entity_change', entity: 'card', op: 'created', id: 'card-1', data: { id: 'card-1' } };
        await redis.publish('board-events:board-1', JSON.stringify(event));

        expect(received).toEqual([]);
        expect(redis.subscribedChannels.has('board-events:board-1')).toBe(false);
    });
});
