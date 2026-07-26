import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../../src/http/composition-root';

describe('GET /api/health', () => {
    it('returns 200 with status, version, and ISO time', async () => {
        const app = buildApp({ BACKEND_VERSION: 'test-1' });
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.version).toBe('test-1');
        expect(() => new Date(res.body.time).toISOString()).not.toThrow();
        expect(new Date(res.body.time).toISOString()).toBe(res.body.time);
    });

    it('echoes a correlation id header', async () => {
        const res = await request(buildApp()).get('/api/health');
        expect(res.headers['x-correlation-id']).toBeTruthy();
    });
});
