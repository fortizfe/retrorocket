import { describe, it, expect, vi } from 'vitest';
import { completeOAuthLogin } from '../../../src/application/use-cases/CompleteOAuthLogin';
import { InvalidOAuthStateError } from '../../../src/domain/auth/OAuthState';
import { EmailNotVerifiedError } from '../../../src/domain/auth/UserIdentity';
import { OAuthState } from '../../../src/domain/auth/OAuthState';
import {
    fixedClock,
    fakeProvider,
    fakeStateCodec,
    fakeIdentityStore,
    fakeSessionService,
    NOW,
} from './fakes';

async function storedStateCookie(overrides: Partial<{ state: string; provider: 'google' | 'github'; returnTo: string }> = {}) {
    const codec = fakeStateCodec();
    const state = OAuthState.create({
        state: overrides.state ?? 'state-xyz',
        codeVerifier: 'verifier-xyz',
        provider: overrides.provider ?? 'google',
        nowSeconds: NOW,
        returnTo: overrides.returnTo ?? '/board/1',
    });
    return codec.encode(state);
}

function deps(overrides = {}) {
    return {
        provider: fakeProvider(),
        identityStore: fakeIdentityStore(),
        sessionService: fakeSessionService(),
        stateCodec: fakeStateCodec(),
        clock: fixedClock(),
        ...overrides,
    };
}

describe('completeOAuthLogin', () => {
    it('issues a session and returns the sanitized returnTo on success', async () => {
        const d = deps();
        const result = await completeOAuthLogin(d, { code: 'code', state: 'state-xyz', stateCookieValue: await storedStateCookie() });
        expect(result.user.uid).toBe('uid-1');
        expect(result.sessionToken).toBeTruthy();
        expect(result.returnTo).toBe('/board/1');
        expect(d.identityStore.resolveUser).toHaveBeenCalledWith(
            expect.objectContaining({ provider: 'google' }),
            'user@example.com',
        );
    });

    it('links the provider to the existing user when the state carries linkUid', async () => {
        const codec = fakeStateCodec();
        const cookie = await codec.encode(
            OAuthState.create({ state: 'state-xyz', codeVerifier: 'verifier-xyz', provider: 'google', nowSeconds: NOW, returnTo: '/settings', linkUid: 'existing-uid' }),
        );
        const d = deps();
        const result = await completeOAuthLogin(d, { code: 'code', state: 'state-xyz', stateCookieValue: cookie });
        expect(result.isLink).toBe(true);
        expect(result.returnTo).toBe('/settings');
        expect(d.identityStore.linkProviderToUser).toHaveBeenCalledWith('existing-uid', expect.objectContaining({ provider: 'google' }), 'user@example.com');
        expect(d.identityStore.resolveUser).not.toHaveBeenCalled();
    });

    it('rejects a missing state cookie', async () => {
        await expect(
            completeOAuthLogin(deps(), { code: 'code', state: 'state-xyz', stateCookieValue: undefined }),
        ).rejects.toThrowError(InvalidOAuthStateError);
    });

    it('rejects a state string mismatch (CSRF guard)', async () => {
        await expect(
            completeOAuthLogin(deps(), { code: 'code', state: 'attacker-state', stateCookieValue: await storedStateCookie() }),
        ).rejects.toThrowError(InvalidOAuthStateError);
    });

    it('rejects a provider mismatch between stored state and callback', async () => {
        await expect(
            completeOAuthLogin(deps({ provider: fakeProvider({ provider: 'github', usesPKCE: false }) }), {
                code: 'code',
                state: 'state-xyz',
                stateCookieValue: await storedStateCookie({ provider: 'google' }),
            }),
        ).rejects.toThrowError(InvalidOAuthStateError);
    });

    it('rejects an unverified provider email (no silent merge)', async () => {
        const provider = fakeProvider({
            exchangeCode: vi.fn(async () => ({
                provider: 'google' as const,
                providerAccountId: 'acc',
                email: 'user@example.com',
                emailVerified: false,
                displayName: null,
                photoURL: null,
            })),
        });
        await expect(
            completeOAuthLogin(deps({ provider }), { code: 'code', state: 'state-xyz', stateCookieValue: await storedStateCookie() }),
        ).rejects.toThrowError(EmailNotVerifiedError);
    });
});
