import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildProfileTestApp, sessionCookieFor } from './profileTestApp';
import type { ProfileRecord } from '../../../src/application/ports/profile';

function profile(overrides: Partial<ProfileRecord>): ProfileRecord {
    return {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'U1',
        photoURL: null,
        providers: ['google'],
        primaryProvider: 'google',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    };
}

describe('GET /api/profile', () => {
    it('creates a profile with freshly-created defaults for a new uid', async () => {
        const { app } = buildProfileTestApp({
            users: { u1: { email: 'u1@example.com', displayName: 'User One', photoURL: null, providers: ['google'] } },
        });
        const res = await request(app).get('/api/profile').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ uid: 'u1', email: 'u1@example.com', displayName: 'User One', primaryProvider: 'google' });
    });

    it('returns an existing profile with providers unioned from the session', async () => {
        const { app } = buildProfileTestApp({
            profiles: [profile({ providers: ['google'] })],
            users: { u1: { email: 'u1@example.com', displayName: 'User One', photoURL: null, providers: ['google', 'github'] } },
        });
        const res = await request(app).get('/api/profile').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.providers).toEqual(['google', 'github']);
    });

    it('401s without a valid session', async () => {
        const { app } = buildProfileTestApp();
        const res = await request(app).get('/api/profile');
        expect(res.status).toBe(401);
    });

    it('ignores an unexpected uid/id field in the request — the response always reflects the session’s own profile', async () => {
        const { app } = buildProfileTestApp({
            profiles: [profile({ uid: 'u1', displayName: 'Real Owner' }), profile({ uid: 'u2', displayName: 'Someone Else' })],
            users: {
                u1: { email: 'u1@example.com', displayName: 'Real Owner', photoURL: null, providers: ['google'] },
            },
        });
        const res = await request(app)
            .get('/api/profile?uid=u2')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ uid: 'u2', id: 'u2' });
        expect(res.status).toBe(200);
        expect(res.body.uid).toBe('u1');
        expect(res.body.displayName).toBe('Real Owner');
    });
});

describe('PATCH /api/profile', () => {
    it('updates the display name and returns the updated profile', async () => {
        const { app } = buildProfileTestApp({ profiles: [profile({})] });
        const res = await request(app)
            .patch('/api/profile')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ displayName: 'New Name' });
        expect(res.status).toBe(200);
        expect(res.body.displayName).toBe('New Name');
    });

    it('400s on an empty/blank displayName', async () => {
        const { app } = buildProfileTestApp({ profiles: [profile({})] });
        const res = await request(app)
            .patch('/api/profile')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ displayName: '   ' });
        expect(res.status).toBe(400);
    });

    it('401s without a valid session', async () => {
        const { app } = buildProfileTestApp({ profiles: [profile({})] });
        const res = await request(app).patch('/api/profile').send({ displayName: 'X' });
        expect(res.status).toBe(401);
    });
});
