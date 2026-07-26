import { describe, it, expect, vi } from 'vitest';
import { GoogleOAuthAdapter } from '../../../src/adapters/oauth/GoogleOAuthAdapter';
import { GithubOAuthAdapter } from '../../../src/adapters/oauth/GithubOAuthAdapter';

function unsignedJwt(payload: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.sig`;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
    return { ok, status, json: async () => body } as unknown as Response;
}

describe('GoogleOAuthAdapter', () => {
    const client = {
        createAuthorizationURL: vi.fn((state: string, cv: string, scopes: string[]) => new URL(`https://accounts.google.com/o/oauth2/v2/auth?state=${state}&cv=${cv}&scope=${scopes.join('+')}`)),
        validateAuthorizationCode: vi.fn(async () => ({
            idToken: () => unsignedJwt({ sub: 'g-123', email: 'user@gmail.com', email_verified: true, name: 'G User', picture: 'http://p/g.png' }),
        })),
    };
    const adapter = new GoogleOAuthAdapter(client);

    it('builds a PKCE authorization URL', () => {
        const url = adapter.createAuthorizationURL('st', 'verifier');
        expect(url.searchParams.get('state')).toBe('st');
        expect(url.searchParams.get('cv')).toBe('verifier');
        expect(adapter.usesPKCE).toBe(true);
    });

    it('requires a code verifier', () => {
        expect(() => adapter.createAuthorizationURL('st', null)).toThrow(/PKCE/);
    });

    it('maps the id_token claims to a provider profile', async () => {
        const profile = await adapter.exchangeCode('code', 'verifier');
        expect(profile).toEqual({
            provider: 'google',
            providerAccountId: 'g-123',
            email: 'user@gmail.com',
            emailVerified: true,
            displayName: 'G User',
            photoURL: 'http://p/g.png',
        });
    });
});

describe('GithubOAuthAdapter', () => {
    const client = {
        createAuthorizationURL: vi.fn((state: string, scopes: string[]) => new URL(`https://github.com/login/oauth/authorize?state=${state}&scope=${scopes.join(',')}`)),
        validateAuthorizationCode: vi.fn(async () => ({ accessToken: () => 'gh-access-token' })),
    };

    it('builds an authorization URL without PKCE', () => {
        const adapter = new GithubOAuthAdapter(client, vi.fn());
        const url = adapter.createAuthorizationURL('st', null);
        expect(url.searchParams.get('state')).toBe('st');
        expect(adapter.usesPKCE).toBe(false);
    });

    it('reads the profile and verified primary email from the REST API', async () => {
        const fetchFn = vi.fn(async (input: string | URL | Request) => {
            const url = String(input);
            if (url.endsWith('/user')) return jsonResponse({ id: 42, login: 'ghuser', name: 'GH User', avatar_url: 'http://p/gh.png', email: null });
            if (url.endsWith('/user/emails')) {
                return jsonResponse([
                    { email: 'secondary@x.com', primary: false, verified: true },
                    { email: 'primary@x.com', primary: true, verified: true },
                ]);
            }
            throw new Error(`unexpected fetch ${url}`);
        });
        const adapter = new GithubOAuthAdapter(client, fetchFn as unknown as typeof fetch);
        const profile = await adapter.exchangeCode('code', null);
        expect(profile).toEqual({
            provider: 'github',
            providerAccountId: '42',
            email: 'primary@x.com',
            emailVerified: true,
            displayName: 'GH User',
            photoURL: 'http://p/gh.png',
        });
    });

    it('throws when the user endpoint fails', async () => {
        const fetchFn = vi.fn(async () => jsonResponse({}, false, 401));
        const adapter = new GithubOAuthAdapter(client, fetchFn as unknown as typeof fetch);
        await expect(adapter.exchangeCode('code', null)).rejects.toThrow(/GitHub user fetch failed/);
    });
});
