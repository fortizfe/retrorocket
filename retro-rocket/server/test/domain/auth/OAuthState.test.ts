import { describe, it, expect } from 'vitest';
import {
    OAuthState,
    sanitizeReturnTo,
    InvalidOAuthStateError,
    OAUTH_STATE_TTL_SECONDS,
} from '../../../src/domain/auth/OAuthState';

const T0 = 1_000_000;

describe('sanitizeReturnTo', () => {
    it('allows same-origin relative paths', () => {
        expect(sanitizeReturnTo('/dashboard')).toBe('/dashboard');
        expect(sanitizeReturnTo('/boards/123?tab=x')).toBe('/boards/123?tab=x');
    });

    it('rejects absolute, protocol-relative, and malformed targets (open-redirect guard)', () => {
        expect(sanitizeReturnTo('https://evil.com')).toBe('/');
        expect(sanitizeReturnTo('//evil.com')).toBe('/');
        expect(sanitizeReturnTo('/\\evil.com')).toBe('/');
        expect(sanitizeReturnTo('javascript://alert(1)')).toBe('/');
        expect(sanitizeReturnTo('relative/no-slash')).toBe('/');
        expect(sanitizeReturnTo(undefined)).toBe('/');
    });
});

describe('OAuthState', () => {
    it('stores sanitized returnTo on creation', () => {
        const s = OAuthState.create({ state: 'st', codeVerifier: 'cv', provider: 'google', nowSeconds: T0, returnTo: 'https://evil.com' });
        expect(s.data.returnTo).toBe('/');
        expect(s.data.provider).toBe('google');
    });

    it('accepts a matching state within TTL', () => {
        const s = OAuthState.create({ state: 'st', codeVerifier: null, provider: 'github', nowSeconds: T0 });
        expect(() => s.assertMatches({ state: 'st', provider: 'github', nowSeconds: T0 + 5 })).not.toThrow();
    });

    it('rejects a mismatched state string', () => {
        const s = OAuthState.create({ state: 'st', codeVerifier: null, provider: 'github', nowSeconds: T0 });
        expect(() => s.assertMatches({ state: 'other', provider: 'github', nowSeconds: T0 })).toThrowError(InvalidOAuthStateError);
    });

    it('rejects a provider mismatch', () => {
        const s = OAuthState.create({ state: 'st', codeVerifier: null, provider: 'github', nowSeconds: T0 });
        expect(() => s.assertMatches({ state: 'st', provider: 'google', nowSeconds: T0 })).toThrowError(InvalidOAuthStateError);
    });

    it('rejects an expired state', () => {
        const s = OAuthState.create({ state: 'st', codeVerifier: null, provider: 'github', nowSeconds: T0 });
        expect(() => s.assertMatches({ state: 'st', provider: 'github', nowSeconds: T0 + OAUTH_STATE_TTL_SECONDS + 1 })).toThrowError(
            InvalidOAuthStateError,
        );
    });
});
