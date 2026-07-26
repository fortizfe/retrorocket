import { describe, it, expect } from 'vitest';
import {
    UserIdentity,
    assertVerifiedEmail,
    EmailNotVerifiedError,
    type ProviderProfile,
} from '../../../src/domain/auth/UserIdentity';

function profile(overrides: Partial<ProviderProfile> = {}): ProviderProfile {
    return {
        provider: 'google',
        providerAccountId: 'acc-1',
        email: 'User@Example.com',
        emailVerified: true,
        displayName: 'User',
        photoURL: null,
        ...overrides,
    };
}

describe('UserIdentity', () => {
    it('adds a provider as a set-union without duplicates', () => {
        const id = new UserIdentity('u1', 'a@b.com', 'A', null, ['google']);
        expect(id.withProvider('github').providers).toEqual(['google', 'github']);
        expect(id.withProvider('google')).toBe(id); // unchanged, same instance
    });

    it('projects to a PublicUser without extra fields', () => {
        const pub = new UserIdentity('u1', 'a@b.com', 'A', 'p.png', ['google']).toPublicUser();
        expect(pub).toEqual({ uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: 'p.png', providers: ['google'] });
    });
});

describe('assertVerifiedEmail', () => {
    it('returns the normalized (lowercased, trimmed) email when verified', () => {
        expect(assertVerifiedEmail(profile({ email: '  User@Example.com ' }))).toBe('user@example.com');
    });

    it('throws when the email is unverified', () => {
        expect(() => assertVerifiedEmail(profile({ emailVerified: false }))).toThrowError(EmailNotVerifiedError);
    });

    it('throws when the email is missing/blank', () => {
        expect(() => assertVerifiedEmail(profile({ email: null }))).toThrowError(EmailNotVerifiedError);
        expect(() => assertVerifiedEmail(profile({ email: '   ' }))).toThrowError(EmailNotVerifiedError);
    });
});
