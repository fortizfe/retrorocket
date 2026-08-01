import { describe, it, expect } from 'vitest';
import { listConnections } from '../../../../src/application/use-cases/mcp/ListConnections';
import { revokeConnection } from '../../../../src/application/use-cases/mcp/RevokeConnection';
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
        const result = await listConnections({ connectionStore }, 'u1');
        expect(result).toEqual([{ id: 'c1', clientName: 'Claude', createdAt: NOW, status: 'active', origin: 'unknown', lastUsedAt: null }]);
    });

    it('returns an empty list for a user with no connections', async () => {
        const result = await listConnections({ connectionStore: await seeded() }, 'u-none');
        expect(result).toEqual([]);
    });

    it('excludes a revoked connection from the caller’s own list (reported bug: revoke doesn’t stick after reload)', async () => {
        const connectionStore = await seeded();
        const revoked = McpConnection.createPending({ id: 'c3', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW })
            .activated('h3')
            .revoked(NOW + 5);
        await connectionStore.saveConnection(revoked);
        const result = await listConnections({ connectionStore }, 'u1');
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
        const result = await listConnections({ connectionStore }, 'u1');
        const summary = result.find((c) => c.id === 'c4');
        expect(summary).toMatchObject({ origin: 'desktop', lastUsedAt: NOW + 30 });
    });
});

describe('revokeConnection', () => {
    it('revokes the caller’s own connection', async () => {
        const connectionStore = await seeded();
        const result = await revokeConnection({ connectionStore, clock: fixedClock(NOW + 10) }, { connectionId: 'c1', uid: 'u1' });
        expect(result).toBe('revoked');
        expect((await connectionStore.getConnectionById('c1'))?.data.status).toBe('revoked');
    });

    it('revoking one connection never touches a sibling connection for the same uid/clientId (spec.md US1 Acceptance Scenario 4 / FR-004 / SC-003)', async () => {
        const connectionStore = await seeded();
        const sibling = McpConnection.createPending({ id: 'c3', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW }).activated('h3');
        await connectionStore.saveConnection(sibling);
        const result = await revokeConnection({ connectionStore, clock: fixedClock(NOW + 10) }, { connectionId: 'c1', uid: 'u1' });
        expect(result).toBe('revoked');
        const untouched = await connectionStore.getConnectionById('c3');
        expect(untouched?.data.status).toBe('active');
        expect(untouched?.data).toEqual(sibling.data);
    });

    it('rejects revoking someone else’s connection (reported as not_found, not forbidden)', async () => {
        const connectionStore = await seeded();
        const result = await revokeConnection({ connectionStore, clock: fixedClock() }, { connectionId: 'c2', uid: 'u1' });
        expect(result).toBe('not_found');
        expect((await connectionStore.getConnectionById('c2'))?.data.status).toBe('active');
    });

    it('is idempotent: revoking an already-revoked connection still reports revoked', async () => {
        const connectionStore = await seeded();
        await revokeConnection({ connectionStore, clock: fixedClock(NOW + 10) }, { connectionId: 'c1', uid: 'u1' });
        const result = await revokeConnection({ connectionStore, clock: fixedClock(NOW + 999) }, { connectionId: 'c1', uid: 'u1' });
        expect(result).toBe('revoked');
    });
});
