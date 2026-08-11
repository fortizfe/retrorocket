import { randomUUID } from 'node:crypto';
import type { RealtimeEvent } from '../../../application/ports/realtime';
import type { RedisLike } from './RedisLike';

/** Default lease duration for board-listener ownership (contracts/redis-coordination-
 * protocol.md §1). Renewed at leaseMs/3 while owned; §1's trigger (b) periodic
 * re-acquire attempt for non-owners also runs on that same cadence. */
export const DEFAULT_LEASE_MS = 15_000;

export function ownerKey(retrospectiveId: string): string {
    return `board-owner:${retrospectiveId}`;
}

export function eventsChannel(retrospectiveId: string): string {
    return `board-events:${retrospectiveId}`;
}

function channelToRetrospectiveId(channel: string): string | undefined {
    const prefix = 'board-events:';
    return channel.startsWith(prefix) ? channel.slice(prefix.length) : undefined;
}

/** Atomic compare-and-renew: only extends the lease's TTL if this instance still holds
 * it (contracts/redis-coordination-protocol.md §2). KEYS[1] = owner key, ARGV[1] =
 * this instance's id, ARGV[2] = lease TTL in ms. */
export const RENEW_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
`;

/** Atomic compare-and-delete: only releases the lease if this instance still holds it
 * (contracts/redis-coordination-protocol.md §3). KEYS[1] = owner key, ARGV[1] = this
 * instance's id. */
export const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

export interface RedisBoardCoordinationAdapterOptions {
    /** Lease duration in ms. Defaults to DEFAULT_LEASE_MS. */
    leaseMs?: number;
    /** Opaque per-process instance identifier. Defaults to a random UUID generated
     * once per adapter instance (one per process boot in production). */
    instanceId?: string;
}

/**
 * Implements the Redis board-listener coordination protocol
 * (contracts/redis-coordination-protocol.md): the per-board ownership lease (§1-3) and
 * the pub/sub event relay (§4-5). Depends only on the narrow `RedisLike` interface, not
 * `ioredis` directly, so it stays testable with an in-memory fake (Constitution
 * Principle IV, SOLID).
 */
export class RedisBoardCoordinationAdapter {
    private readonly leaseMs: number;
    private readonly instanceId: string;
    private readonly ownedBoards = new Set<string>();
    private readonly subscriptions = new Map<string, (event: RealtimeEvent) => void>();

    /**
     * Takes two separate `RedisLike` connections deliberately: once `SUBSCRIBE` is
     * called on a real Redis connection, the Redis protocol puts that connection into
     * subscriber-only mode — it can no longer issue regular commands like `SET`/`EVAL`
     * (a fundamental Redis constraint, not an ioredis quirk). `commands` handles
     * tryAcquire/renew/release/publish; `subscriber` handles subscribe/unsubscribe/the
     * incoming message stream. A test double without this real-protocol restriction
     * (e.g. this class's own Vitest fake) may safely pass the same instance for both.
     */
    constructor(
        private readonly commands: RedisLike,
        private readonly subscriber: RedisLike,
        options: RedisBoardCoordinationAdapterOptions = {},
    ) {
        this.leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
        this.instanceId = options.instanceId ?? randomUUID();
        this.subscriber.on('message', (channel, message) => {
            const retrospectiveId = channelToRetrospectiveId(channel);
            if (!retrospectiveId) return;
            const handler = this.subscriptions.get(retrospectiveId);
            if (!handler) return;
            handler(JSON.parse(message) as RealtimeEvent);
        });
    }

    /** Attempts to become the owner of `retrospectiveId`'s real-time listeners.
     * Invokable at any time, independent of a registration event — this is the
     * primitive that both the first-registration trigger (a) and the periodic
     * re-acquire trigger (b) (contracts/redis-coordination-protocol.md §1) call. */
    async tryAcquire(retrospectiveId: string): Promise<boolean> {
        const result = await this.commands.set(ownerKey(retrospectiveId), this.instanceId, 'NX', 'PX', this.leaseMs);
        if (result === 'OK') {
            this.ownedBoards.add(retrospectiveId);
            return true;
        }
        return false;
    }

    /** Renews the lease if still held by this instance (§2). Skips the Redis round
     * trip entirely when this instance doesn't currently believe it's the owner. */
    async renew(retrospectiveId: string): Promise<boolean> {
        if (!this.ownedBoards.has(retrospectiveId)) return false;
        const result = await this.commands.eval(RENEW_SCRIPT, 1, ownerKey(retrospectiveId), this.instanceId, this.leaseMs);
        const renewed = result === 1;
        if (!renewed) this.ownedBoards.delete(retrospectiveId);
        return renewed;
    }

    /** Releases the lease if still held by this instance; a safe no-op otherwise (§3).
     * No hand-off notification is sent — recovery is trigger (b)'s responsibility. */
    async release(retrospectiveId: string): Promise<void> {
        await this.commands.eval(RELEASE_SCRIPT, 1, ownerKey(retrospectiveId), this.instanceId);
        this.ownedBoards.delete(retrospectiveId);
    }

    isOwner(retrospectiveId: string): boolean {
        return this.ownedBoards.has(retrospectiveId);
    }

    /** Publishes a translated Firestore change event for the owner to relay to every
     * subscribed instance (§4). */
    async publish(retrospectiveId: string, event: RealtimeEvent): Promise<void> {
        await this.commands.publish(eventsChannel(retrospectiveId), JSON.stringify(event));
    }

    /** Subscribes to a board's relay channel, delivering every received event to
     * `onEvent` (§5). Safe to call for a board this instance owns too — the uniform
     * subscribe-and-deliver path is shared by owner and non-owner instances alike. */
    async subscribe(retrospectiveId: string, onEvent: (event: RealtimeEvent) => void): Promise<void> {
        this.subscriptions.set(retrospectiveId, onEvent);
        await this.subscriber.subscribe(eventsChannel(retrospectiveId));
    }

    async unsubscribe(retrospectiveId: string): Promise<void> {
        this.subscriptions.delete(retrospectiveId);
        await this.subscriber.unsubscribe(eventsChannel(retrospectiveId));
    }
}
