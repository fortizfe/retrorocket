import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildMcpTestApp, sessionCookieFor } from './mcpTestApp';
import { McpConnection } from '../../../src/domain/mcp/McpConnection';

async function seedConnections(deps: import('../../../src/http/routes/mcp').McpRouterDeps) {
    const mine = McpConnection.createPending({ id: 'c1', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: deps.clock.nowSeconds() }).activated('h1');
    const someoneElses = McpConnection.createPending({ id: 'c2', uid: 'u2', clientId: 'client1', clientName: 'Claude', nowSeconds: deps.clock.nowSeconds() }).activated('h2');
    await deps.connectionStore.saveConnection(mine);
    await deps.connectionStore.saveConnection(someoneElses);
}

describe('GET /api/mcp/connections', () => {
    it('lists only the signed-in user’s own connections, with name and date', async () => {
        const { app, deps } = buildMcpTestApp();
        await seedConnections(deps);
        const res = await request(app).get('/api/mcp/connections').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.connections).toHaveLength(1);
        expect(res.body.connections[0]).toMatchObject({ id: 'c1', clientName: 'Claude', status: 'active' });
        expect(res.body.connections[0].createdAt).toBeTruthy();
    });

    it('401s without a session cookie', async () => {
        const { app } = buildMcpTestApp();
        const res = await request(app).get('/api/mcp/connections');
        expect(res.status).toBe(401);
    });

    it('does not include a revoked connection (reported bug: still shows as active after reload)', async () => {
        const { app, deps } = buildMcpTestApp();
        await seedConnections(deps);
        const revokeRes = await request(app).delete('/api/mcp/connections/c1').set('Cookie', sessionCookieFor('u1'));
        expect(revokeRes.status).toBe(204);

        const res = await request(app).get('/api/mcp/connections').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.connections).toEqual([]);
    });

    it('reflects origin and lastUsedAt on each connection', async () => {
        const { app, deps } = buildMcpTestApp();
        const withOriginAndLastUsed = McpConnection.createPending({
            id: 'c5',
            uid: 'u1',
            clientId: 'client1',
            clientName: 'Claude',
            nowSeconds: deps.clock.nowSeconds(),
            origin: 'mobile',
        })
            .activated('h5')
            .touched(deps.clock.nowSeconds() + 5);
        await deps.connectionStore.saveConnection(withOriginAndLastUsed);

        const res = await request(app).get('/api/mcp/connections').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.connections[0]).toMatchObject({ origin: 'mobile' });
        expect(res.body.connections[0].lastUsedAt).toBeTruthy();
    });
});

describe('DELETE /api/mcp/connections/:id', () => {
    it('revokes the caller’s own connection', async () => {
        const { app, deps } = buildMcpTestApp();
        await seedConnections(deps);
        const res = await request(app).delete('/api/mcp/connections/c1').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
        expect((await deps.connectionStore.getConnectionById('c1'))?.data.status).toBe('revoked');
    });

    it('rejects deleting someone else’s connection id (404, not leaking existence)', async () => {
        const { app, deps } = buildMcpTestApp();
        await seedConnections(deps);
        const res = await request(app).delete('/api/mcp/connections/c2').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
        expect((await deps.connectionStore.getConnectionById('c2'))?.data.status).toBe('active');
    });

    it('is idempotent: deleting an already-revoked connection is still 204', async () => {
        const { app, deps } = buildMcpTestApp();
        await seedConnections(deps);
        await request(app).delete('/api/mcp/connections/c1').set('Cookie', sessionCookieFor('u1'));
        const res = await request(app).delete('/api/mcp/connections/c1').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
    });
});
