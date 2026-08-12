import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import {
    mcpAuthMiddleware,
    recordAuthFailure,
    isBackedOff,
    MCP_AUTH_BACKOFF_THRESHOLD,
    type AuthBackoffState,
} from '../../../src/http/middleware/mcpAuth';
import { InMemoryTtlCache } from '../../../src/adapters/cache/InMemoryTtlCache';
import { JoseMcpTokenAdapter } from '../../../src/adapters/session/JoseMcpTokenAdapter';
import { McpConnection } from '../../../src/domain/mcp/McpConnection';
import type { McpConnectionStorePort } from '../../../src/application/ports/mcp';

const NOW = 1_700_000_000;
const tokenService = new JoseMcpTokenAdapter('test-mcp-key');

function buildApp(connectionStore: McpConnectionStorePort, connectionAuthCache = new InMemoryTtlCache<string, McpConnection>()) {
    const app = express();
    // Mirrors the rate limiter placed in front of mcpAuthMiddleware on the real
    // /api/mcp route (server/src/http/routes/mcp.ts) so this isolated test harness
    // has the same request shape as production, not just the middleware under test.
    app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, validate: false }));
    app.use(mcpAuthMiddleware({ tokenService, connectionStore, clock: { nowSeconds: () => NOW }, connectionAuthCache }));
    app.get('/protected', (_req, res) => {
        res.status(200).json({ auth: res.locals.mcpAuth });
    });
    return app;
}

function storeWith(connection: McpConnection | null, onSave?: (saved: McpConnection) => void): McpConnectionStorePort {
    return {
        createAuthorizationRequest: async () => {},
        getAuthorizationRequest: async () => null,
        decideAuthorizationRequest: async () => {},
        consumeAuthorizationCode: async () => null,
        getConnectionById: async () => connection,
        getConnectionByRefreshTokenHash: async () => null,
        saveConnection: async (saved) => {
            onSave?.(saved);
        },
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

    it('touches lastUsedAt to the current clock time on a successful request', async () => {
        let saved: McpConnection | undefined;
        const res = await request(buildApp(storeWith(activeConnection, (c) => (saved = c))))
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(saved?.data.lastUsedAt).toBe(NOW);
    });

    // --- 041, FR-001: connection-authorization cache -----------------------------

    describe('connection-authorization cache (041, FR-001)', () => {
        it('serves a second request for the same connection within the TTL window without a fresh getConnectionById() read', async () => {
            const getConnectionById = vi.fn(async () => activeConnection);
            const store: McpConnectionStorePort = { ...storeWith(activeConnection), getConnectionById };
            const app = buildApp(store);

            const first = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
            const second = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(getConnectionById).toHaveBeenCalledTimes(1);
        });

        it('performs a fresh getConnectionById() read once the cache entry has been evicted', async () => {
            const getConnectionById = vi.fn(async () => activeConnection);
            const store: McpConnectionStorePort = { ...storeWith(activeConnection), getConnectionById };
            const cache = new InMemoryTtlCache<string, McpConnection>();
            const app = buildApp(store, cache);

            const first = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
            expect(getConnectionById).toHaveBeenCalledTimes(1);

            // Simulates the eviction RevokeConnection.ts performs on this same cache
            // instance (T010) — proves mcpAuthMiddleware honors the eviction contract
            // independent of what actually calls .delete().
            cache.delete('conn1');

            const second = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(getConnectionById).toHaveBeenCalledTimes(2);
        });
    });

    // --- 041, FR-002: failed-authorization backoff --------------------------------

    describe('failed-authorization backoff (041, FR-002)', () => {
        it('rejects the 6th failed attempt from the same key within 30s with 429/auth_backoff, after 5 plain 401s', async () => {
            const app = buildApp(storeWith(null)); // every attempt fails: connection never found

            const responses = [];
            for (let i = 0; i < 6; i++) {
                responses.push(await request(app).get('/protected').set('Authorization', `Bearer ${token}`));
            }

            for (const res of responses.slice(0, 5)) {
                expect(res.status).toBe(401);
                expect(res.body.error.code).toBe('unauthorized');
            }
            const sixth = responses[5];
            expect(sixth.status).toBe(429);
            expect(sixth.body.error.code).toBe('auth_backoff');
            expect(sixth.headers['retry-after']).toBeDefined();
        });

        it('keys a verified-but-rejected token (revoked connection) by client_id, not IP', async () => {
            const revoked = activeConnection.revoked(NOW);
            const app = buildApp(storeWith(revoked));

            for (let i = 0; i < MCP_AUTH_BACKOFF_THRESHOLD; i++) {
                await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
            }
            // A different client_id's structurally-valid token must be unaffected —
            // proves the backoff key is client_id-scoped, not shared across all
            // requests from this same test-harness IP.
            const otherToken = await tokenService.issue({ sub: 'u2', connectionId: 'conn2', clientId: 'other-client' }, NOW, 3600);
            const other = await request(app).get('/protected').set('Authorization', `Bearer ${otherToken}`);
            expect(other.status).toBe(401);
            expect(other.body.error.code).toBe('unauthorized');
        });

        it('keys a structurally invalid/unparseable token by origin IP, and blocks further garbage attempts from it', async () => {
            const app = buildApp(storeWith(activeConnection));

            for (let i = 0; i < MCP_AUTH_BACKOFF_THRESHOLD; i++) {
                await request(app).get('/protected').set('Authorization', 'Bearer not-a-real-token');
            }
            const sixthGarbage = await request(app).get('/protected').set('Authorization', 'Bearer still-not-a-real-token');
            expect(sixthGarbage.status).toBe(429);
            expect(sixthGarbage.body.error.code).toBe('auth_backoff');
        });

        it('never blocks a token that verifies successfully, even from an IP with recent garbage-token failures (research.md §2)', async () => {
            const app = buildApp(storeWith(activeConnection));

            for (let i = 0; i < MCP_AUTH_BACKOFF_THRESHOLD; i++) {
                await request(app).get('/protected').set('Authorization', 'Bearer not-a-real-token');
            }
            // Same IP as the garbage attempts above, but this time a fully valid token —
            // must succeed: IP-keyed backoff only ever applies to missing/unverifiable
            // tokens, never to one that verifies, so one misbehaving client on a shared
            // network origin can't collaterally block a different, valid one.
            const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
    });
});

// --- Pure decision logic (research.md §2) ----------------------------------------

describe('recordAuthFailure / isBackedOff', () => {
    it('starts a new window on the first failure for a key', () => {
        const state = recordAuthFailure(undefined, 1000);
        expect(state).toEqual({ count: 1, windowStart: 1000, backoffUntil: null });
    });

    it('accumulates within the same fixed window', () => {
        let state: AuthBackoffState | undefined = recordAuthFailure(undefined, 1000);
        state = recordAuthFailure(state, 1500);
        expect(state).toEqual({ count: 2, windowStart: 1000, backoffUntil: null });
    });

    it('triggers backoff on reaching the threshold', () => {
        let state: AuthBackoffState | undefined;
        for (let i = 0; i < MCP_AUTH_BACKOFF_THRESHOLD; i++) state = recordAuthFailure(state, 1000 + i);
        expect(state?.count).toBe(MCP_AUTH_BACKOFF_THRESHOLD);
        expect(state?.backoffUntil).toBe(1000 + MCP_AUTH_BACKOFF_THRESHOLD - 1 + 30_000);
        expect(isBackedOff(state, 1000 + MCP_AUTH_BACKOFF_THRESHOLD)).toBe(true);
    });

    it('resets to a fresh window once the fixed 30s window has elapsed without reaching the threshold', () => {
        const first = recordAuthFailure(undefined, 0);
        const afterWindow = recordAuthFailure(first, 30_001);
        expect(afterWindow).toEqual({ count: 1, windowStart: 30_001, backoffUntil: null });
    });

    it('isBackedOff is false once now passes backoffUntil', () => {
        let state: AuthBackoffState | undefined;
        for (let i = 0; i < MCP_AUTH_BACKOFF_THRESHOLD; i++) state = recordAuthFailure(state, 0);
        expect(isBackedOff(state, state!.backoffUntil! - 1)).toBe(true);
        expect(isBackedOff(state, state!.backoffUntil!)).toBe(false);
    });
});
