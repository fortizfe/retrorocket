import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProfile, updateDisplayName } from '@/features/auth/services/backendProfileClient';

const dto = {
    uid: 'u1',
    email: 'u1@example.com',
    displayName: 'User One',
    photoURL: null,
    providers: ['google'],
    primaryProvider: 'google',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('backendProfileClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchProfile', () => {
        it('returns the parsed profile on success', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => dto }) as unknown as Response));
            const profile = await fetchProfile();
            expect(profile).toMatchObject({ uid: 'u1', displayName: 'User One', primaryProvider: 'google' });
            expect(profile.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
            expect(fetch).toHaveBeenCalledWith('/api/profile', { credentials: 'include' });
        });

        it('throws with the backend error message on a non-OK response', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => ({
                ok: false,
                status: 401,
                json: async () => ({ error: { code: 'unauthenticated', message: 'Sign-in required' } }),
            }) as unknown as Response));
            await expect(fetchProfile()).rejects.toThrow('Sign-in required');
        });

        it('falls back to a generic message when the error body cannot be parsed', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => ({
                ok: false,
                status: 500,
                json: async () => { throw new Error('not json'); },
            }) as unknown as Response));
            await expect(fetchProfile()).rejects.toThrow('Failed to load profile: 500');
        });
    });

    describe('updateDisplayName', () => {
        it('PATCHes the display name and returns the updated profile', async () => {
            const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ...dto, displayName: 'New Name' }) }) as unknown as Response);
            vi.stubGlobal('fetch', fetchMock);
            const profile = await updateDisplayName('New Name');
            expect(profile.displayName).toBe('New Name');
            expect(fetchMock).toHaveBeenCalledWith('/api/profile', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: 'New Name' }),
            });
        });

        it('throws with the backend error message on a non-OK response', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => ({
                ok: false,
                status: 400,
                json: async () => ({ error: { code: 'invalid_request', message: 'displayName is required' } }),
            }) as unknown as Response));
            await expect(updateDisplayName('')).rejects.toThrow('displayName is required');
        });
    });
});
