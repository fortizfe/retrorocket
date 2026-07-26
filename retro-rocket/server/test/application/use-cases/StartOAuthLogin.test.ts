import { describe, it, expect } from 'vitest';
import { startOAuthLogin } from '../../../src/application/use-cases/StartOAuthLogin';
import { fixedClock, fakeRandom, fakeProvider, fakeStateCodec, NOW } from './fakes';
import { OAuthState } from '../../../src/domain/auth/OAuthState';

describe('startOAuthLogin', () => {
    it('generates state + PKCE for a PKCE provider and encodes the state cookie', async () => {
        const result = await startOAuthLogin(
            { provider: fakeProvider({ usesPKCE: true }), clock: fixedClock(), random: fakeRandom(), stateCodec: fakeStateCodec() },
            { returnTo: '/dashboard' },
        );
        expect(result.authorizationUrl).toContain('https://provider/authorize');
        const decoded = await fakeStateCodec().decode(result.stateCookieValue);
        expect(decoded?.data.state).toBe('state-xyz');
        expect(decoded?.data.codeVerifier).toBe('verifier-xyz');
        expect(decoded?.data.returnTo).toBe('/dashboard');
        expect(decoded?.data.createdAt).toBe(NOW);
    });

    it('omits the PKCE verifier for a non-PKCE provider', async () => {
        const result = await startOAuthLogin(
            { provider: fakeProvider({ usesPKCE: false, provider: 'github' }), clock: fixedClock(), random: fakeRandom(), stateCodec: fakeStateCodec() },
            {},
        );
        const decoded = await fakeStateCodec().decode(result.stateCookieValue);
        expect(decoded?.data.codeVerifier).toBeNull();
    });

    it('sanitizes an unsafe returnTo to "/"', async () => {
        const result = await startOAuthLogin(
            { provider: fakeProvider(), clock: fixedClock(), random: fakeRandom(), stateCodec: fakeStateCodec() },
            { returnTo: 'https://evil.com' },
        );
        const decoded = (await fakeStateCodec().decode(result.stateCookieValue)) as OAuthState;
        expect(decoded.data.returnTo).toBe('/');
    });
});
