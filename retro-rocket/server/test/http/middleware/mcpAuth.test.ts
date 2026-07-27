import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mcpAuthMiddleware } from '../../../src/http/middleware/mcpAuth';
import { JoseMcpTokenAdapter } from '../../../src/adapters/session/JoseMcpTokenAdapter';
import { McpConnection } from '../../../src/domain/mcp/McpConnection';
import type { McpConnectionStorePort } from '../../../src/application/ports/mcp';

const NOW = 1_700_000_000;
const tokenService = new JoseMcpTokenAdapter('test-mcp-key');

function buildApp(connectionStore: McpConnectionStorePort) {
    const app = express();
    app.use(mcpAuthMiddleware({ tokenService, connectionStore, clock: { nowSeconds: () => NOW } }));
    app.get('/protected', (_req, res) => {
        res.status(200).json({ auth: res.locals.mcpAuth });
    });
    return app;
}

function storeWith(connection: McpConnection | null): McpConnectionStorePort {
    return {
        createAuthorizationRequest: async () => {},
        getAuthorizationRequest: async () => null,
        decideAuthorizationRequest: async () => {},
        consumeAuthorizationCode: async () => null,
        getConnectionById: async () => connection,
        getConnectionByRefreshTokenHash: async () => null,
        saveConnection: async () => {},
        listConnectionsForUser: async () => [],
    };
}

describe('mcpAuthMiddleware', () => {
    let activeConnection: McpConnection;
    let token: string;

    beforeEach(async () => {
        activeConnection = McpConnection.createPending({ id: 'conn1', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW }).activated(
            'hash',
        );
        token = await tokenService.issue({ sub: 'u1', connectionId: 'conn1', clientId: 'client1' }, NOW, 3600);
    });

    it('allows a request with a valid token and an active connection', async () => {
        const res = await request(buildApp(storeWith(activeConnection))).get('/protected').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.auth).toEqual({ sub: 'u1', connectionId: 'conn1', clientId: 'client1' });
    });

    it('rejects when the connection has been revoked (live check, Clarification Q1)', async () => {
        const revoked = activeConnection.revoked(NOW + 10);
        const res = await request(buildApp(storeWith(revoked))).get('/protected').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('unauthorized');
    });

    it('rejects when the connection no longer exists', async () => {
        const res = await request(buildApp(storeWith(null))).get('/protected').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    it('rejects a missing Authorization header', async () => {
        const res = await request(buildApp(storeWith(activeConnection))).get('/protected');
        expect(res.status).toBe(401);
    });

    it('rejects an expired token', async () => {
        const expired = await tokenService.issue({ sub: 'u1', connectionId: 'conn1', clientId: 'client1' }, NOW - 7200, 3600);
        const res = await request(buildApp(storeWith(activeConnection))).get('/protected').set('Authorization', `Bearer ${expired}`);
        expect(res.status).toBe(401);
    });

    it('rejects a tampered token', async () => {
        const res = await request(buildApp(storeWith(activeConnection)))
            .get('/protected')
            .set('Authorization', `Bearer ${token.slice(0, -3)}aaa`);
        expect(res.status).toBe(401);
    });
});
