import { describe, it, expect } from 'vitest';
import { updateDisplayName } from '../../../../src/application/use-cases/profile/UpdateDisplayName';
import { inMemoryProfilePort } from './profileFakes';
import { AppError } from '../../../../src/domain/errors';
import type { ProfileRecord } from '../../../../src/application/ports/profile';

function profile(overrides: Partial<ProfileRecord>): ProfileRecord {
    return {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'Old Name',
        photoURL: null,
        providers: ['google'],
        primaryProvider: 'google',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    };
}

describe('updateDisplayName', () => {
    it('trims and persists the new display name', async () => {
        const profilePort = inMemoryProfilePort([profile({})]);
        const result = await updateDisplayName({ profilePort }, { uid: 'u1', displayName: '  New Name  ' });
        expect(result.displayName).toBe('New Name');
    });

    it('rejects an empty display name', async () => {
        const profilePort = inMemoryProfilePort([profile({})]);
        await expect(updateDisplayName({ profilePort }, { uid: 'u1', displayName: '' })).rejects.toThrow(AppError);
    });

    it('rejects a whitespace-only display name', async () => {
        const profilePort = inMemoryProfilePort([profile({})]);
        await expect(updateDisplayName({ profilePort }, { uid: 'u1', displayName: '   ' })).rejects.toThrow(AppError);
    });
});
