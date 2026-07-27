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

    it('refresh_token grant fails for a revoked connection', async () => {
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
    });
});
