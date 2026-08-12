import { describe, it, expect, vi } from 'vitest';
import { listConnections } from '../../../../src/application/use-cases/mcp/ListConnections';
import { revokeConnection } from '../../../../src/application/use-cases/mcp/RevokeConnection';
import { InMemoryTtlCache } from '../../../../src/adapters/cache/InMemoryTtlCache';
import { MCP_AUTHORIZATION_REQUEST_TTL_SECONDS } from '../../../../src/application/use-cases/mcp/AuthorizeMcpConnection';
import { McpConnection } from '../../../../src/domain/mcp/McpConnection';
import { inMemoryConnectionStore, fixedClock, NOW } from './mcpFakes';

async function seeded() {
    const connectionStore = inMemoryConnectionStore();
    const mine = McpConnection.createPending({ id: 'c1', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW }).activated('h');
    const someoneElses = McpConnection.createPending({ id: 'c2', uid: 'u2', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW }).activated('h2');
    await connectionStore.saveConnection(mine);
    await connectionStore.saveConnection(someoneElses);
    return connectionStore;
}

describe('listConnections', () => {
    it('lists only the caller’s own connections, with name and creation date', async () => {
        const connectionStore = await seeded();
        const result = await listConnections({ connectionStore, clock: fixedClock() }, 'u1');
        expect(result).toEqual([{ id: 'c1', clientName: 'Claude', createdAt: NOW, status: 'active', origin: 'unknown', lastUsedAt: null }]);
    });

    it('returns an empty list for a user with no connections', async () => {
        const result = await listConnections({ connectionStore: await seeded(), clock: fixedClock() }, 'u-none');
        expect(result).toEqual([]);
    });

    it('excludes a revoked connection from the caller’s own list (reported bug: revoke doesn’t stick after reload)', async () => {
        const connectionStore = await seeded();
        const revoked = McpConnection.createPending({ id: 'c3', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW })
            .activated('h3')
            .revoked(NOW + 5);
        await connectionStore.saveConnection(revoked);
        const result = await listConnections({ connectionStore, clock: fixedClock() }, 'u1');
        expect(result.map((c) => c.id)).not.toContain('c3');
        expect(result.map((c) => c.id)).toEqual(['c1']);
    });

    it('passes origin and lastUsedAt through on the ConnectionSummary', async () => {
        const connectionStore = await seeded();
        const withOriginAndLastUsed = McpConnection.createPending({
            id: 'c4',
            uid: 'u1',
            clientId: 'client1',
            clientName: 'Claude',
            nowSeconds: NOW,
            origin: 'desktop',
        })
            .activated('h4')
            .touched(NOW + 30);
        await connectionStore.saveConnection(withOriginAndLastUsed);
        const result = await listConnections({ connectionStore, clock: fixedClock() }, 'u1');
        const summary = result.find((c) => c.id === 'c4');
        expect(summary).toMatchObject({ origin: 'desktop', lastUsedAt: NOW + 30 });
    });

    it('excludes a fresh, still-in-progress pending connection from the result, and leaves it untouched (FR-001)', async () => {
        const connectionStore = await seeded();
        const freshPending = McpConnection.createPending({ id: 'c5', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW });
        await connectionStore.saveConnection(freshPending);
        const result = await listConnections({ connectionStore, clock: fixedClock(NOW) }, 'u1');
        expect(result.map((c) => c.id)).not.toContain('c5');
        expect((await connectionStore.getConnectionById('c5'))?.data.status).toBe('pending');
    });

    it('lazily expires a stale pending connection (past the authorization-code TTL) to failed, persists it, and excludes it from the result (FR-008b, FR-009)', async () => {
        const connectionStore = await seeded();
        const stalePending = McpConnection.createPending({ id: 'c6', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW });
        await connectionStore.saveConnection(stalePending);
        const laterNow = NOW + MCP_AUTHORIZATION_REQUEST_TTL_SECONDS + 1;
        const result = await listConnections({ connectionStore, clock: fixedClock(laterNow) }, 'u1');
        expect(result.map((c) => c.id)).not.toContain('c6');
        const persisted = await connectionStore.getConnectionById('c6');
        expect(persisted?.data.status).toBe('failed');
        expect(persisted?.data.failedAt).toBe(laterNow);
    });

    it('leaves a genuinely active connection untouched when a stale pending connection for the same client/uid expires alongside it (spec.md US1 Acceptance Scenario 2 / FR-003)', async () => {
        const connectionStore = await seeded(); // seeds 'c1' active for u1/client1
        const stalePendingSameClient = McpConnection.createPending({ id: 'c7', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW });
        await connectionStore.saveConnection(stalePendingSameClient);
        const laterNow = NOW + MCP_AUTHORIZATION_REQUEST_TTL_SECONDS + 1;
        const result = await listConnections({ connectionStore, clock: fixedClock(laterNow) }, 'u1');
        expect(result.map((c) => c.id)).toEqual(['c1']);
        const active = await connectionStore.getConnectionById('c1');
        expect(active?.data).toMatchObject({ status: 'active' });
        const failed = await connectionStore.getConnectionById('c7');
        expect(failed?.data.status).toBe('failed');
    });
});

function noopCache(): { delete(connectionId: string): void } {
    return { delete: vi.fn() };
}

describe('revokeConnection', () => {
    it('revokes the caller’s own connection', async () => {
        const connectionStore = await seeded();
        const result = await revokeConnection({ connectionStore, clock: fixedClock(NOW + 10), connectionAuthCache: noopCache() }, { connectionId: 'c1', uid: 'u1' });
        expect(result).toBe('revoked');
        expect((await connectionStore.getConnectionById('c1'))?.data.status).toBe('revoked');
    });

    it('revoking one connection never touches a sibling connection for the same uid/clientId (spec.md US1 Acceptance Scenario 4 / FR-004 / SC-003)', async () => {
        const connectionStore = await seeded();
        const sibling = McpConnection.createPending({ id: 'c3', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW }).activated('h3');
        await connectionStore.saveConnection(sibling);
        const result = await revokeConnection({ connectionStore, clock: fixedClock(NOW + 10), connectionAuthCache: noopCache() }, { connectionId: 'c1', uid: 'u1' });
        expect(result).toBe('revoked');
        const untouched = await connectionStore.getConnectionById('c3');
        expect(untouched?.data.status).toBe('active');
        expect(untouched?.data).toEqual(sibling.data);
    });

    it('rejects revoking someone else’s connection (reported as not_found, not forbidden)', async () => {
        const connectionStore = await seeded();
        const result = await revokeConnection({ connectionStore, clock: fixedClock(), connectionAuthCache: noopCache() }, { connectionId: 'c2', uid: 'u1' });
        expect(result).toBe('not_found');
        expect((await connectionStore.getConnectionById('c2'))?.data.status).toBe('active');
    });

    it('is idempotent: revoking an already-revoked connection still reports revoked', async () => {
        const connectionStore = await seeded();
        const connectionAuthCache = noopCache();
        await revokeConnection({ connectionStore, clock: fixedClock(NOW + 10), connectionAuthCache }, { connectionId: 'c1', uid: 'u1' });
        const result = await revokeConnection({ connectionStore, clock: fixedClock(NOW + 999), connectionAuthCache }, { connectionId: 'c1', uid: 'u1' });
        expect(result).toBe('revoked');
    });

    // --- 041, FR-001 ---------------------------------------------------------------

    it('evicts the connection from connectionAuthCache on revoke (041, FR-001)', async () => {
        const connectionStore = await seeded();
        const connectionAuthCache = new InMemoryTtlCache<string, unknown>();
        connectionAuthCache.set('c1', { cached: true }, 10_000);
        await revokeConnection({ connectionStore, clock: fixedClock(NOW + 10), connectionAuthCache }, { connectionId: 'c1', uid: 'u1' });
        expect(connectionAuthCache.get('c1')).toBeUndefined();
    });

    it('does not evict anything from connectionAuthCache when revoking someone else’s connection fails as not_found', async () => {
        const connectionStore = await seeded();
        const connectionAuthCache = new InMemoryTtlCache<string, unknown>();
        connectionAuthCache.set('c2', { cached: true }, 10_000);
        await revokeConnection({ connectionStore, clock: fixedClock(), connectionAuthCache }, { connectionId: 'c2', uid: 'u1' });
        // 'not_found' is returned for an ownership mismatch (c2 belongs to u2), so the
        // real connection's cache entry must be left untouched.
        expect(connectionAuthCache.get('c2')).toEqual({ cached: true });
    });
});
