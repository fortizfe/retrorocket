import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildMcpTestApp, BASE_URL } from './mcpTestApp';

describe('GET /.well-known/oauth-authorization-server', () => {
    it('advertises the authorize/token/register endpoints and PKCE-only support', async () => {
        const { app } = buildMcpTestApp();
        const res = await request(app).get('/.well-known/oauth-authorization-server');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            issuer: BASE_URL,
            authorization_endpoint: `${BASE_URL}/api/mcp/authorize`,
            token_endpoint: `${BASE_URL}/api/mcp/token`,
            registration_endpoint: `${BASE_URL}/api/mcp/register`,
            code_challenge_methods_supported: ['S256'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
        });
    });
});

describe('GET /.well-known/oauth-protected-resource', () => {
    it('points at the MCP endpoint and this authorization server', async () => {
        const { app } = buildMcpTestApp();
        const res = await request(app).get('/.well-known/oauth-protected-resource');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ resource: `${BASE_URL}/api/mcp`, authorization_servers: [BASE_URL] });
    });
});
