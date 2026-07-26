import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildAuthTestApp, cookieHeader, setCookies, fakeStateCodec, NOW } from './authTestApp';
import { OAuthState } from '../../../src/domain/auth/OAuthState';

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
