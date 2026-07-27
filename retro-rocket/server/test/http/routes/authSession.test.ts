import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildAuthTestApp, cookieHeader, setCookies, fakeSessionService, NOW } from './authTestApp';
import type { PublicUser } from '../../../src/domain/auth/types';

const user: PublicUser = { uid: 'uid-1', email: 'a@b.com', displayName: 'A', photoURL: null, providers: ['google'] };

async function sessionCookie(now = NOW) {
    const { token } = await fakeSessionService().issue(user, now);
    return cookieHeader('rr_session', token);
}

describe('GET /api/auth/session', () => {
    it('returns unauthenticated when no cookie is present', async () => {
        const res = await request(buildAuthTestApp()).get('/api/auth/session');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ authenticated: false, user: null, firebaseCustomToken: null });
    });

    it('returns the user and a fresh custom token when authenticated', async () => {
        const res = await request(buildAuthTestApp()).get('/api/auth/session').set('Cookie', await sessionCookie());
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user).toEqual(user);
        expect(res.body.firebaseCustomToken).toBe('ct-uid-1');
    });
});

describe('POST /api/auth/refresh', () => {
    it('rotates the session and re-sets the cookie', async () => {
        const res = await request(buildAuthTestApp()).post('/api/auth/refresh').set('Cookie', await sessionCookie());
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
        expect(setCookies(res)).toContain('rr_session=');
    });

    it('returns 401 session_expired when no session is present', async () => {
        const res = await request(buildAuthTestApp()).post('/api/auth/refresh');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('session_expired');
    });
});

describe('POST /api/auth/logout', () => {
    it('clears the session cookie and returns 204', async () => {
        const res = await request(buildAuthTestApp()).post('/api/auth/logout').set('Cookie', await sessionCookie());
        expect(res.status).toBe(204);
        const setCookie = setCookies(res);
        expect(setCookie).toContain('rr_session=;');
        expect(setCookie).toMatch(/Max-Age=0|Expires=/);
    });
});
