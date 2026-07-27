import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildAuthTestApp, setCookies } from './authTestApp';

describe('POST /api/auth/test-login', () => {
    it('is NOT mounted when testMode is disabled (404)', async () => {
        const res = await request(buildAuthTestApp({ testMode: false })).post('/api/auth/test-login').send({ email: 'a@b.com' });
        expect(res.status).toBe(404);
    });

    it('establishes a session and returns the user, with no Firebase custom token, when testMode is on', async () => {
        const res = await request(buildAuthTestApp({ testMode: true }))
            .post('/api/auth/test-login')
            .send({ email: 'Tester@Example.com', displayName: 'Tester' });
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user.uid).toBe('uid-1');
        expect(res.body.firebaseCustomToken).toBeUndefined();
        expect(setCookies(res)).toContain('rr_session=');
    });

    it('rejects a missing email', async () => {
        const res = await request(buildAuthTestApp({ testMode: true })).post('/api/auth/test-login').send({});
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_request');
    });
});
