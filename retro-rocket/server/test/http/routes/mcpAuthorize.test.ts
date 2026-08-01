import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildMcpTestApp, sessionCookieFor } from './mcpTestApp';
import { McpClientRegistration } from '../../../src/domain/mcp/McpClientRegistration';

const REDIRECT_URI = 'https://claude.ai/callback';

function client() {
    return McpClientRegistration.register({ clientId: 'client1', clientName: 'Claude', redirectUris: [REDIRECT_URI], nowSeconds: 0 });
}

function authorizeQuery(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams({
        client_id: 'client1',
        redirect_uri: REDIRECT_URI,
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
        state: 'xyz',
        ...overrides,
    });
    return `/api/mcp/authorize?${params.toString()}`;
}

describe('GET /api/mcp/authorize', () => {
    it('redirects to sign-in when there is no session cookie', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const res = await request(app).get(authorizeQuery());
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('/?returnTo=');
    });

    it('redirects to the consent screen when signed in with a valid client/redirect_uri', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const res = await request(app).get(authorizeQuery()).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('/mcp/consent?requestCode=');
        expect(res.headers.location).toContain('clientName=Claude');
    });

    it('400s (no redirect) for an unknown client_id — redirect_uri is not yet trusted', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const res = await request(app).get(authorizeQuery({ client_id: 'unknown' })).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_request');
    });

    it('400s (no redirect) for a redirect_uri not registered for the client', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const res = await request(app)
            .get(authorizeQuery({ redirect_uri: 'https://evil.example/callback' }))
            .set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(400);
    });
});

describe('POST /api/mcp/authorize/decision', () => {
    async function requestCodeFor(app: import('express').Express, uid = 'u1') {
        const res = await request(app).get(authorizeQuery()).set('Cookie', sessionCookieFor(uid));
        const url = new URL(res.headers.location, 'http://x');
        return url.searchParams.get('requestCode')!;
    }

    it('approving redirects the client to redirect_uri with a code and the original state', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const requestCode = await requestCodeFor(app);
        const res = await request(app)
            .post('/api/mcp/authorize/decision')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ requestCode, approve: true });
        expect(res.status).toBe(200);
        expect(res.body.redirectUrl).toContain(REDIRECT_URI);
        expect(res.body.redirectUrl).toContain('code=');
        expect(res.body.redirectUrl).toContain('state=xyz');
    });

    it('denying redirects with access_denied and creates no connection', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const requestCode = await requestCodeFor(app);
        const res = await request(app)
            .post('/api/mcp/authorize/decision')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ requestCode, approve: false });
        expect(res.status).toBe(200);
        expect(res.body.redirectUrl).toContain('error=access_denied');
    });

    it('404s for an unknown/expired requestCode', async () => {
        const { app } = buildMcpTestApp({ registeredClients: [client()] });
        const res = await request(app)
            .post('/api/mcp/authorize/decision')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ requestCode: 'does-not-exist', approve: true });
        expect(res.status).toBe(404);
    });

    it('classifies the request’s User-Agent into the created connection’s origin', async () => {
        const { app, deps } = buildMcpTestApp({ registeredClients: [client()] });
        const requestCode = await requestCodeFor(app);
        const mobileUa =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        await request(app)
            .post('/api/mcp/authorize/decision')
            .set('Cookie', sessionCookieFor('u1'))
            .set('User-Agent', mobileUa)
            .send({ requestCode, approve: true });

        const record = await deps.connectionStore.getAuthorizationRequest(requestCode);
        const connection = await deps.connectionStore.getConnectionById(record!.connectionId!);
        expect(connection?.data.origin).toBe('mobile');
    });
});
