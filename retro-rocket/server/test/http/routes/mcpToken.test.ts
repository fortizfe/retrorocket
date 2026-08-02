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

async function issuedCode(app: import('express').Express, uid = 'u1') {
    const params = new URLSearchParams({
        client_id: 'client1',
        redirect_uri: REDIRECT_URI,
        code_challenge: CHALLENGE,
        code_challenge_method: 'S256',
        state: 'xyz',
    });
    const authorizeRes = await request(app).get(`/api/mcp/authorize?${params.toString()}`).set('Cookie', sessionCookieFor(uid));
    const requestCode = new URL(authorizeRes.headers.location, 'http://x').searchParams.get('requestCode')!;
    const decisionRes = await request(app)
        .post('/api/mcp/authorize/decision')
        .set('Cookie', sessionCookieFor(uid))
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

    it('exchanges a valid code when sent as application/x-www-form-urlencoded (RFC 6749 §4.1.3/§6 — the content type real MCP clients use)', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const code = await issuedCode(app);
        const res = await request(app)
            .post('/api/mcp/token')
            .type('form')
            .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeTruthy();
        expect(res.body.refresh_token).toBeTruthy();
    });

    it('returns a 400 unsupported_grant_type, not a 500, when the request has no parseable body at all', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const res = await request(app).post('/api/mcp/token');
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('unsupported_grant_type');
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

// 025, research.md §1/§2: tokenLimiter now resolves the request's real per-user identity
// (the uid behind the authorization code or refresh token) and keys its bucket on that —
// two different RetroRocket users connecting through the same AI client (same apparent
// IP) must never share a bucket, since that collision is exactly what made connections
// "always" resolve as rejected. A request whose identity can't be resolved (garbage/
// unknown code or token) still falls back to the pre-025 IP-keyed behavior, so abuse
// protection against genuinely invalid input is unchanged.
describe('tokenLimiter — per-uid isolation with IP fallback (025, FR-001, FR-002, FR-005)', () => {
    it('two different users sharing an IP are never throttled because of each other (T002)', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const ip = '203.0.113.60';
        const codeA = await issuedCode(app, 'userA');
        const bodyFor = (code: string) => ({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: 'client1',
            code_verifier: VERIFIER,
        });

        // Exhaust user A's own bucket: getAuthorizationRequest resolves `uid` from the
        // record regardless of whether it has already been consumed, so reusing the same
        // code 61 times is sufficient — no need to mint 61 distinct codes here.
        for (let i = 0; i < 61; i++) {
            await request(app).post('/api/mcp/token').set('X-Forwarded-For', ip).send(bodyFor(codeA));
        }

        const codeB = await issuedCode(app, 'userB');
        const resB = await request(app).post('/api/mcp/token').set('X-Forwarded-For', ip).send(bodyFor(codeB));
        expect(resB.status).not.toBe(429);
    });

    it("a single resolvable user's own excessive activity is still throttled, even across varying IPs (T003)", async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        let last;
        for (let i = 0; i < 61; i++) {
            const code = await issuedCode(app, 'userA');
            last = await request(app)
                .post('/api/mcp/token')
                .set('X-Forwarded-For', `203.0.114.${i}`)
                .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        }
        expect(last!.status).toBe(429);
    });

    it('a 429 triggered by per-uid throttling still matches the existing ApiErrorBody envelope (T004)', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        let last;
        for (let i = 0; i < 61; i++) {
            const code = await issuedCode(app, 'userA');
            last = await request(app)
                .post('/api/mcp/token')
                .set('X-Forwarded-For', `203.0.115.${i}`)
                .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        }
        expect(last!.status).toBe(429);
        expect(last!.body).toEqual({
            error: { code: 'rate_limited', message: expect.any(String) },
            correlationId: expect.any(String),
        });
    });

    it('unresolvable/garbage requests still fall back to per-IP throttling, isolated across IPs', async () => {
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

// 025, data-model.md "rate-limit rejection metric": every 429 from tokenLimiter emits a
// structured mcp.token.rate_limited metric tagged by whether the rejected request's
// identity resolved to a real user (keyType: 'uid') or fell back to IP (keyType: 'ip').
describe('tokenLimiter — rate-limit rejection metric (025, T005, FR-008)', () => {
    it("emits keyType 'uid' when a resolvable user's own activity is throttled", async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });
        let last;
        for (let i = 0; i < 61; i++) {
            const code = await issuedCode(app, 'userA');
            last = await request(app)
                .post('/api/mcp/token')
                .set('X-Forwarded-For', `203.0.116.${i}`)
                .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        }
        expect(last!.status).toBe(429);
        expect(deps.metrics.increment).toHaveBeenCalledWith('mcp.token.rate_limited', { keyType: 'uid' });
    });

    it("emits keyType 'ip' when an unresolvable/garbage request is throttled", async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });
        const body = { grant_type: 'authorization_code', code: 'does-not-exist', redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER };

        let last;
        for (let i = 0; i < 61; i++) {
            last = await request(app).post('/api/mcp/token').set('X-Forwarded-For', '203.0.113.99').send(body);
        }
        expect(last!.status).toBe(429);
        expect(deps.metrics.increment).toHaveBeenCalledWith('mcp.token.rate_limited', { keyType: 'ip' });
    });

    it('does not emit the metric on a successful token exchange', async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });
        const code = await issuedCode(app);
        const res = await request(app)
            .post('/api/mcp/token')
            .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(res.status).toBe(200);
        expect(deps.metrics.increment).not.toHaveBeenCalled();
    });
});

// 025, spec.md User Story 1: a first-time connection attempt must actually succeed, even
// under the exact shared-IP condition the bug report describes — end-to-end through the
// real authorize -> consent -> token-exchange sequence, not directly-minted codes.
describe('User Story 1 — connecting an AI client actually succeeds under shared-IP load (spec.md US1)', () => {
    it('a never-before-connected client succeeds even while another user saturates a shared IP bucket (Acceptance Scenario 1, T012)', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const ip = '203.0.113.60';
        const bogusBody = { grant_type: 'authorization_code', code: 'bogus', redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER };

        // Saturate what would have been a shared IP bucket with 60 unrelated requests.
        for (let i = 0; i < 60; i++) {
            await request(app).post('/api/mcp/token').set('X-Forwarded-For', ip).send(bogusBody);
        }

        // A fresh, full authorize -> consent -> token-exchange sequence for a new user,
        // from that same apparent IP, must still succeed.
        const code = await issuedCode(app, 'userB');
        const res = await request(app)
            .post('/api/mcp/token')
            .set('X-Forwarded-For', ip)
            .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeTruthy();
        expect(res.body.refresh_token).toBeTruthy();
    });

    it('a second, independent connection attempt shortly after the first also succeeds under the same shared-IP load (Acceptance Scenario 2, T013)', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const ip = '203.0.113.61';
        const bogusBody = { grant_type: 'authorization_code', code: 'bogus', redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER };

        for (let i = 0; i < 30; i++) {
            await request(app).post('/api/mcp/token').set('X-Forwarded-For', ip).send(bogusBody);
        }

        const firstCode = await issuedCode(app, 'userC');
        const first = await request(app)
            .post('/api/mcp/token')
            .set('X-Forwarded-For', ip)
            .send({ grant_type: 'authorization_code', code: firstCode, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(first.status).toBe(200);

        for (let i = 0; i < 30; i++) {
            await request(app).post('/api/mcp/token').set('X-Forwarded-For', ip).send(bogusBody);
        }

        const secondCode = await issuedCode(app, 'userC');
        const second = await request(app)
            .post('/api/mcp/token')
            .set('X-Forwarded-For', ip)
            .send({ grant_type: 'authorization_code', code: secondCode, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(second.status).toBe(200);
        expect(second.body.access_token).toBeTruthy();
        expect(second.body.refresh_token).toBeTruthy();
    });
});

// 025, spec.md User Story 2: revoke -> reconnect must keep working even under the same
// shared-IP contention Phase 3 proved User Story 1 is now immune to.
describe('User Story 2 — reconnecting a revoked connection works under shared-IP load (spec.md US2)', () => {
    async function saturateSharedIpBucket(app: import('express').Express, ip: string, count = 60): Promise<void> {
        const bogusBody = { grant_type: 'authorization_code', code: 'bogus', redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER };
        for (let i = 0; i < count; i++) {
            await request(app).post('/api/mcp/token').set('X-Forwarded-For', ip).send(bogusBody);
        }
    }

    it('a fresh reconnection after revoking a prior connection succeeds under simulated shared-IP load (Acceptance Scenario 1, T017)', async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });
        const ip = '203.0.113.70';

        await saturateSharedIpBucket(app, ip);

        const firstCode = await issuedCode(app, 'userD');
        const first = await request(app)
            .post('/api/mcp/token')
            .set('X-Forwarded-For', ip)
            .send({ grant_type: 'authorization_code', code: firstCode, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(first.status).toBe(200);

        const firstConnections = await deps.connectionStore.listConnectionsForUser('userD');
        expect(firstConnections).toHaveLength(1);
        await deps.connectionStore.saveConnection(firstConnections[0].revoked(deps.clock.nowSeconds()));

        const secondCode = await issuedCode(app, 'userD');
        const second = await request(app)
            .post('/api/mcp/token')
            .set('X-Forwarded-For', ip)
            .send({ grant_type: 'authorization_code', code: secondCode, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
        expect(second.status).toBe(200);
        expect(second.body.access_token).toBeTruthy();
        expect(second.body.refresh_token).toBeTruthy();
    });

    it('three revoke/reconnect cycles in quick succession each independently succeed under shared-IP load (Acceptance Scenario 3, T018)', async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });
        const ip = '203.0.113.71';

        for (let cycle = 0; cycle < 3; cycle++) {
            await saturateSharedIpBucket(app, ip);

            const code = await issuedCode(app, 'userE');
            const res = await request(app)
                .post('/api/mcp/token')
                .set('X-Forwarded-For', ip)
                .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: 'client1', code_verifier: VERIFIER });
            expect(res.status).toBe(200);

            const connections = await deps.connectionStore.listConnectionsForUser('userE');
            const active = connections.filter((c) => c.data.status === 'active');
            expect(active).toHaveLength(1);
            await deps.connectionStore.saveConnection(active[0].revoked(deps.clock.nowSeconds()));
        }

        const allConnections = await deps.connectionStore.listConnectionsForUser('userE');
        expect(allConnections).toHaveLength(3);
        expect(allConnections.every((c) => c.data.status === 'revoked')).toBe(true);
        expect(new Set(allConnections.map((c) => c.data.id)).size).toBe(3);
    });
});
