import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildAuthTestApp, cookieHeader, setCookies, fakeStateCodec, fakeSessionService, NOW } from './authTestApp';
import { OAuthState } from '../../../src/domain/auth/OAuthState';
import type { PublicUser } from '../../../src/domain/auth/types';

async function validStateCookie(state = 'state-xyz', provider: 'google' | 'github' = 'google', returnTo = '/board/9') {
    const codec = fakeStateCodec();
    const encoded = await codec.encode(
        OAuthState.create({ state, codeVerifier: 'verifier-xyz', provider, nowSeconds: NOW, returnTo }),
    );
    return cookieHeader('rr_oauth_state', encoded);
}

describe('GET /api/auth/login/:provider', () => {
    it('302-redirects to the provider and sets the oauth_state cookie', async () => {
        const res = await request(buildAuthTestApp()).get('/api/auth/login/google?returnTo=/board/9');
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('https://provider/authorize');
        const setCookie = setCookies(res);
        expect(setCookie).toContain('rr_oauth_state=');
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('SameSite=Lax');
    });

    it('404s for an unknown provider', async () => {
        const res = await request(buildAuthTestApp()).get('/api/auth/login/apple');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('not_found');
    });
});

describe('GET /api/auth/callback/:provider', () => {
    it('establishes the session and redirects to returnTo on success', async () => {
        const res = await request(buildAuthTestApp())
            .get('/api/auth/callback/google?code=abc&state=state-xyz')
            .set('Cookie', await validStateCookie());
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/board/9');
        const setCookie = setCookies(res);
        expect(setCookie).toContain('rr_session=');
        expect(setCookie).toContain('HttpOnly');
    });

    it('redirects to the SPA with an error code on invalid/forged state (no session set)', async () => {
        const res = await request(buildAuthTestApp())
            .get('/api/auth/callback/google?code=abc&state=attacker')
            .set('Cookie', await validStateCookie('state-xyz'));
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('auth_error=invalid_oauth_state');
        const setCookie = setCookies(res);
        expect(setCookie).not.toContain('rr_session=ey');
    });

    it('redirects with the provider error when the user cancels', async () => {
        const res = await request(buildAuthTestApp()).get('/api/auth/callback/google?error=access_denied');
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('auth_error=access_denied');
    });
});

function publicUser(uid: string): PublicUser {
    return { uid, email: `${uid}@example.com`, displayName: uid, photoURL: null, providers: ['google'] };
}

async function sessionCookieFor(uid: string): Promise<string> {
    const { token } = await fakeSessionService().issue(publicUser(uid), NOW);
    return cookieHeader('rr_session', token);
}

// research.md §1, FR-002: two distinct identities must never share one rate-limit bucket.
describe('authLimiter — session/IP isolation (US1, FR-001, FR-002)', () => {
    it('two distinct authenticated sessions checking /api/auth/session are throttled independently', async () => {
        const app = buildAuthTestApp({ testMode: false });
        const sessionA = await sessionCookieFor('user-a');
        const sessionB = await sessionCookieFor('user-b');

        // Exhaust user A's bucket with repeated session checks (a legitimate pattern: page
        // load, WS reconnect resync, etc. — see US3), matching the reported symptom's cause.
        let lastA;
        for (let i = 0; i < 151; i++) {
            lastA = await request(app).get('/api/auth/session').set('Cookie', sessionA);
        }
        expect(lastA!.status).toBe(429);

        // User B's session check must still succeed — not co-throttled with A's bucket.
        const bRes = await request(app).get('/api/auth/session').set('Cookie', sessionB);
        expect(bRes.status).toBe(200);
    });

    it('two distinct client IPs hitting the pre-session login route are throttled independently', async () => {
        const app = buildAuthTestApp({ testMode: false });

        let lastIp1;
        for (let i = 0; i < 151; i++) {
            lastIp1 = await request(app).get('/api/auth/login/google').set('X-Forwarded-For', '203.0.113.10');
        }
        expect(lastIp1!.status).toBe(429);

        // A second, distinct client IP attempting to begin login must still succeed — this is
        // exactly "several users online blocks everyone else's login" (spec Overview).
        const ip2 = await request(app).get('/api/auth/login/google').set('X-Forwarded-For', '203.0.113.20');
        expect(ip2.status).toBe(302);
    });

    it('a legitimately throttled request returns the ApiErrorBody envelope, not the default express-rate-limit shape (FR-004)', async () => {
        const app = buildAuthTestApp({ testMode: false });

        let throttled;
        for (let i = 0; i < 151; i++) {
            throttled = await request(app).get('/api/auth/login/google').set('X-Forwarded-For', '198.51.100.5');
        }

        expect(throttled!.status).toBe(429);
        expect(throttled!.body).toEqual({
            error: { code: 'rate_limited', message: expect.any(String) },
            correlationId: expect.any(String),
        });
    });
});
