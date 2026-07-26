import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../../src/http/composition-root';

describe('unknown routes', () => {
    it('return a structured 404 ApiError, not an HTML page or a crash', async () => {
        const res = await request(buildApp()).get('/api/nope');
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body.error.code).toBe('not_found');
        expect(res.body.error.message).toContain('/api/nope');
        expect(res.body.correlationId).toBeTruthy();
    });
});
