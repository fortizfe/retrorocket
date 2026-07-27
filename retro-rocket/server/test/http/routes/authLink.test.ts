import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildAuthTestApp, cookieHeader, setCookies, fakeSessionService, NOW } from './authTestApp';
import type { PublicUser } from '../../../src/domain/auth/types';

const user: PublicUser = {
    uid: 'uid-1',
    email: 'a@b.com',
    displayName: 'A',
    photoURL: null,
    providers: ['google'],
    primaryProvider: 'google',
    createdAt: '2026-01-01T00:00:00.000Z',
};

async function sessionCookie() {
    const { token } = await fakeSessionService().issue(user, NOW);
    return cookieHeader('rr_session', token);
}

describe('GET /api/auth/link/:provider', () => {
    it('302-redirects to the provider and sets the oauth_state cookie when authenticated', async () => {
        const res = await request(buildAuthTestApp())
            .get('/api/auth/link/github?returnTo=/settings')
            .set('Cookie', await sessionCookie());
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('https://provider/authorize');
        expect(setCookies(res)).toContain('rr_oauth_state=');
    });

    it('redirects to the SPA with an error when not authenticated', async () => {
        const res = await request(buildAuthTestApp()).get('/api/auth/link/github');
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('auth_error=unauthenticated');
    });

    it('404s for an unknown provider', async () => {
        const res = await request(buildAuthTestApp()).get('/api/auth/link/apple').set('Cookie', await sessionCookie());
        expect(res.status).toBe(404);
    });
});
