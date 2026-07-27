import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/http/composition-root';

describe('createApp — disabled-feature config-error responses', () => {
    it('reports a config error for /api/auth/* when auth is not configured', async () => {
        const res = await request(buildApp()).get('/api/auth/session');
        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('config_error');
    });

    it('reports a config error for /api/mcp/* when the MCP connector is not configured', async () => {
        const res = await request(buildApp()).get('/api/mcp/connections');
        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('config_error');
    });

    it('reports a config error for /api/boards/* when boards are not configured', async () => {
        const res = await request(buildApp()).get('/api/boards/b1');
        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('config_error');
        expect(res.body.error.message).toContain('Boards');
    });
});
