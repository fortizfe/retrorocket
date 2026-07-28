import { describe, it, expect } from 'vitest';
import { ensureUserProfile } from '../../../../src/application/use-cases/profile/EnsureUserProfile';
import { inMemoryProfilePort } from './profileFakes';
import type { ProfileRecord } from '../../../../src/application/ports/profile';

function profile(overrides: Partial<ProfileRecord>): ProfileRecord {
    return {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'U1',
        photoURL: null,
        providers: ['google'],
        primaryProvider: 'google',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    };
}

describe('ensureUserProfile', () => {
    it('creates a profile with OAuth-derived defaults when none exists', async () => {
        const profilePort = inMemoryProfilePort();
        const result = await ensureUserProfile(
            { profilePort },
            { uid: 'u1', email: 'u1@example.com', displayName: 'User One', photoURL: 'https://x/y.png', providers: ['google'] },
        );

        expect(result).toMatchObject({
            uid: 'u1',
            email: 'u1@example.com',
            displayName: 'User One',
            photoURL: 'https://x/y.png',
            providers: ['google'],
            primaryProvider: 'google',
        });
        expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('falls back to the email prefix for displayName when none is provided', async () => {
        const profilePort = inMemoryProfilePort();
        const result = await ensureUserProfile(
            { profilePort },
            { uid: 'u1', email: 'someone@example.com', displayName: null, photoURL: null, providers: ['github'] },
        );
        expect(result.displayName).toBe('someone');
        expect(result.primaryProvider).toBe('github');
    });

    it('unions a provider missing from an existing profile without overwriting displayName/photoURL', async () => {
        const profilePort = inMemoryProfilePort([profile({ providers: ['google'], displayName: 'Existing Name', photoURL: 'https://existing.png' })]);
        const result = await ensureUserProfile(
            { profilePort },
            { uid: 'u1', email: 'u1@example.com', displayName: 'Session Name', photoURL: 'https://session.png', providers: ['google', 'github'] },
        );

        expect(result.providers).toEqual(['google', 'github']);
        expect(result.displayName).toBe('Existing Name');
        expect(result.photoURL).toBe('https://existing.png');
    });

    it('is idempotent when the existing profile already has every session provider', async () => {
        const profilePort = inMemoryProfilePort([profile({ providers: ['google', 'github'] })]);
        const result = await ensureUserProfile(
            { profilePort },
            { uid: 'u1', email: 'u1@example.com', displayName: 'X', photoURL: null, providers: ['google'] },
        );
        expect(result.providers).toEqual(['google', 'github']);
    });
});
