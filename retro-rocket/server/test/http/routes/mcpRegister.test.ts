import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildMcpTestApp } from './mcpTestApp';

describe('POST /api/mcp/register', () => {
    it('registers a new client and returns a client_id', async () => {
        const { app } = buildMcpTestApp();
        const res = await request(app).post('/api/mcp/register').send({ client_name: 'Claude', redirect_uris: ['https://claude.ai/callback'] });
        expect(res.status).toBe(201);
        expect(res.body.client_id).toBeTruthy();
        expect(res.body.client_name).toBe('Claude');
        expect(res.body.token_endpoint_auth_method).toBe('none');
    });

    it('400s when redirect_uris is missing', async () => {
        const { app } = buildMcpTestApp();
        const res = await request(app).post('/api/mcp/register').send({ client_name: 'Claude' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_request');
    });
});
