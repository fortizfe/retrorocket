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

async function sessionCookie(now = NOW) {
    const { token } = await fakeSessionService().issue(user, now);
    return cookieHeader('rr_session', token);
}

describe('PATCH /api/auth/profile', () => {
    it('rejects an unauthenticated request', async () => {
        const res = await request(buildAuthTestApp()).patch('/api/auth/profile').send({ displayName: 'New Name' });
        expect(res.status).toBe(401);
    });

    it('updates the display name and re-sets the session cookie', async () => {
        const res = await request(buildAuthTestApp())
            .patch('/api/auth/profile')
            .set('Cookie', await sessionCookie())
            .send({ displayName: 'New Name' });

        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user.displayName).toBe('New Name');
        expect(setCookies(res)).toContain('rr_session=');
    });

    it('rejects an empty display name with 400', async () => {
        const res = await request(buildAuthTestApp())
            .patch('/api/auth/profile')
            .set('Cookie', await sessionCookie())
            .send({ displayName: '   ' });
        expect(res.status).toBe(400);
    });
});
