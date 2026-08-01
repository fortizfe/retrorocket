import { describe, it, expect, vi } from 'vitest';
import { updateDisplayName } from '../../../../src/application/use-cases/profile/UpdateDisplayName';
import { inMemoryProfilePort } from './profileFakes';
import { AppError } from '../../../../src/domain/errors';
import type { ProfileRecord } from '../../../../src/application/ports/profile';
import type { ParticipantPort } from '../../../../src/application/ports/retrospective';

function fakeParticipantPort(): ParticipantPort {
    return {
        listParticipants: vi.fn(async () => []),
        join: vi.fn(),
        renameParticipantsForUser: vi.fn(async () => { }),
    } as unknown as ParticipantPort;
}

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
        const participantPort = fakeParticipantPort();
        const result = await updateDisplayName({ profilePort, participantPort }, { uid: 'u1', displayName: '  New Name  ' });
        expect(result.displayName).toBe('New Name');
    });

    it('rejects an empty display name', async () => {
        const profilePort = inMemoryProfilePort([profile({})]);
        const participantPort = fakeParticipantPort();
        await expect(updateDisplayName({ profilePort, participantPort }, { uid: 'u1', displayName: '' })).rejects.toThrow(AppError);
    });

    it('rejects a whitespace-only display name', async () => {
        const profilePort = inMemoryProfilePort([profile({})]);
        const participantPort = fakeParticipantPort();
        await expect(updateDisplayName({ profilePort, participantPort }, { uid: 'u1', displayName: '   ' })).rejects.toThrow(AppError);
    });

    it('fans the new name out to every participants doc for this user after a successful rename', async () => {
        const profilePort = inMemoryProfilePort([profile({})]);
        const participantPort = fakeParticipantPort();
        await updateDisplayName({ profilePort, participantPort }, { uid: 'u1', displayName: '  New Name  ' });
        expect(participantPort.renameParticipantsForUser).toHaveBeenCalledExactlyOnceWith('u1', 'New Name');
    });

    it('does not invoke the fan-out when the display name is rejected', async () => {
        const profilePort = inMemoryProfilePort([profile({})]);
        const participantPort = fakeParticipantPort();
        await expect(updateDisplayName({ profilePort, participantPort }, { uid: 'u1', displayName: '   ' })).rejects.toThrow(AppError);
        expect(participantPort.renameParticipantsForUser).not.toHaveBeenCalled();
    });

    it('does not invoke the fan-out when profilePort.updateDisplayName fails', async () => {
        const profilePort = inMemoryProfilePort([]); // no seeded profile for 'u1' -> updateDisplayName throws
        const participantPort = fakeParticipantPort();
        await expect(updateDisplayName({ profilePort, participantPort }, { uid: 'u1', displayName: 'New Name' })).rejects.toThrow();
        expect(participantPort.renameParticipantsForUser).not.toHaveBeenCalled();
    });
});
