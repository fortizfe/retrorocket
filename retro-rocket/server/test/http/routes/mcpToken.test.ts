import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildMcpTestApp, sessionCookieFor } from './mcpTestApp';
import { McpClientRegistration } from '../../../src/domain/mcp/McpClientRegistration';

const REDIRECT_URI = 'https://claude.ai/callback';
const VERIFIER = 'a-test-pkce-code-verifier-1234567890';
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url');

function client() {
    return McpClientRegistration.register({ clientId: 'client1', clientName: 'Claude', redirectUris: [REDIRECT_URI], nowSeconds: 0 });
}

async function issuedCode(app: import('express').Express) {
    const params = new URLSearchParams({
        client_id: 'client1',
        redirect_uri: REDIRECT_URI,
        code_challenge: CHALLENGE,
        code_challenge_method: 'S256',
        state: 'xyz',
    });
    const authorizeRes = await request(app).get(`/api/mcp/authorize?${params.toString()}`).set('Cookie', sessionCookieFor('u1'));
    const requestCode = new URL(authorizeRes.headers.location, 'http://x').searchParams.get('requestCode')!;
    const decisionRes = await request(app)
        .post('/api/mcp/authorize/decision')
        .set('Cookie', sessionCookieFor('u1'))
        .send({ requestCode, approve: true });
    return new URL(decisionRes.body.redirectUrl).searchParams.get('code')!;
}

describe('POST /api/mcp/token', () => {
    it('exchanges a valid code + PKCE verifier for an access + refresh token', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const code = await issuedCode(app);
        const res = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(res.status).toBe(200);
        expect(res.body.token_type).toBe('Bearer');
        expect(res.body.access_token).toBeTruthy();
        expect(res.body.refresh_token).toBeTruthy();
    });

    it('rejects reusing an already-consumed code', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const code = await issuedCode(app);
        const body = { grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER };
        await request(app).post('/api/mcp/token').send(body);
        const res = await request(app).post('/api/mcp/token').send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_grant');
    });

    it('rejects a PKCE verifier/redirect_uri mismatch', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const code = await issuedCode(app);
        const res = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: 'wrong' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_grant');
    });

    it('refresh_token grant mints a new access token for an active connection', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const code = await issuedCode(app);
        const first = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });

        const res = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'refresh_token', refresh_token: first.body.refresh_token, client_id: 'client1' });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeTruthy();
    });

    it('a fresh reconnection after revoking a prior connection succeeds and produces a new, distinct active connection (024, SC-002)', async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });

        const firstCode = await issuedCode(app);
        const first = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'authorization_code', code: firstCode, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(first.status).toBe(200);

        const firstConnections = await deps.connectionStore.listConnectionsForUser('u1');
        expect(firstConnections).toHaveLength(1);
        await deps.connectionStore.saveConnection(firstConnections[0].revoked(deps.clock.nowSeconds()));

        const secondCode = await issuedCode(app);
        const second = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'authorization_code', code: secondCode, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(second.status).toBe(200);
        expect(second.body.access_token).toBeTruthy();
        expect(second.body.refresh_token).toBeTruthy();
        expect(second.body.refresh_token).not.toBe(first.body.refresh_token);

        const allConnections = await deps.connectionStore.listConnectionsForUser('u1');
        expect(allConnections).toHaveLength(2);
        const revokedOne = allConnections.find((c) => c.data.id === firstConnections[0].data.id);
        const newOne = allConnections.find((c) => c.data.id !== firstConnections[0].data.id);
        expect(revokedOne?.data.status).toBe('revoked');
        expect(newOne?.data.status).toBe('active');
    });

    it('refresh_token grant fails for a revoked connection with a message identifying it as revoked, not generically "expired" (bug: revoking once blocked reconnecting)', async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });
        const code = await issuedCode(app);
        const first = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });

        const connections = await deps.connectionStore.listConnectionsForUser('u1');
        await deps.connectionStore.saveConnection(connections[0].revoked(deps.clock.nowSeconds()));

        const res = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'refresh_token', refresh_token: first.body.refresh_token, client_id: 'client1' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_grant');
        expect(res.body.error.message).toContain('revoked');
    });
});

// 021, research.md §1: MCP clients authenticate the token exchange itself with no
// rr_session cookie (it's a machine-to-machine OAuth call, not a browser fetch), so —
// unlike auth/boards/profile/retrospectives — tokenLimiter is NOT switched to the
// session-first resolver in rateLimiting.ts; it stays IP-keyed, which is already correct
// once app.ts trusts Vercel's proxy hop (T005) so distinct client IPs resolve correctly.
// What was still missing here specifically is the same ApiErrorBody envelope every other
// limiter in the app already returns (FR-004) — tokenLimiter had no custom `handler`.
describe('tokenLimiter — trust-proxy IP isolation + envelope (021, FR-002, FR-004)', () => {
    it('two distinct client IPs are throttled independently', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const body = { grant_type: 'authorization_code', code: 'bogus', redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER };

        let lastIp1;
        for (let i = 0; i < 61; i++) {
            lastIp1 = await request(app).post('/api/mcp/token').set('X-Forwarded-For', '203.0.113.30').send(body);
        }
        expect(lastIp1!.status).toBe(429);

        const ip2 = await request(app).post('/api/mcp/token').set('X-Forwarded-For', '203.0.113.40').send(body);
        expect(ip2.status).not.toBe(429);
    });

    it('a legitimately throttled request returns the ApiErrorBody envelope', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const body = { grant_type: 'authorization_code', code: 'bogus', redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER };

        let throttled;
        for (let i = 0; i < 61; i++) {
            throttled = await request(app).post('/api/mcp/token').set('X-Forwarded-For', '203.0.113.50').send(body);
        }
        expect(throttled!.status).toBe(429);
        expect(throttled!.body).toEqual({
            error: { code: 'rate_limited', message: expect.any(String) },
            correlationId: expect.any(String),
        });
    });
});
