import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLinkedProviders } from '@/features/auth/hooks/useLinkedProviders';
import { useUser } from '@/lib/contexts/useUserContext';
import { User, UserProfile } from '@/features/auth/types/user';

// useLinkedProviders reads user/userProfile from UserContext directly (no wrapper
// needed — mock the context hook itself, same pattern as other hook tests in this repo).
vi.mock('@/lib/contexts/useUserContext', () => ({
    useUser: vi.fn(),
}));

const mockUseUser = vi.mocked(useUser);

const buildUser = (email: string | null): User => ({
    uid: 'user-1',
    email,
    displayName: 'Test User',
    photoURL: null,
    providers: ['google'],
    primaryProvider: 'google',
    createdAt: new Date(),
    updatedAt: new Date(),
});

const buildUserProfile = (providers: UserProfile['providers']): UserProfile => ({
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    photoURL: null,
    providers,
    primaryProvider: 'google',
    joinedBoards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('useLinkedProviders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('refreshes linkedProviders when userProfile.providers changes', async () => {
        const initialProviders = ['google'] as UserProfile['providers'];
        mockUseUser.mockReturnValue({
            user: buildUser('user@example.com'),
            userProfile: buildUserProfile(initialProviders),
        } as ReturnType<typeof useUser>);

        const { result, rerender } = renderHook(() => useLinkedProviders());

        await waitFor(() => {
            expect(result.current.linkedProviders).toEqual(['google.com']);
        });

        const updatedProviders = ['google', 'github'] as UserProfile['providers'];
        mockUseUser.mockReturnValue({
            user: buildUser('user@example.com'),
            userProfile: buildUserProfile(updatedProviders),
        } as ReturnType<typeof useUser>);
        rerender();

        await waitFor(() => {
            expect(result.current.linkedProviders).toEqual(['google.com', 'github.com']);
        });
    });

    it('refreshes linkedProviders when user.email changes', async () => {
        mockUseUser.mockReturnValue({
            user: buildUser(null),
            userProfile: buildUserProfile(['google']),
        } as ReturnType<typeof useUser>);

        const { result, rerender } = renderHook(() => useLinkedProviders());

        // No email yet: refresh is skipped, list stays empty.
        expect(result.current.linkedProviders).toEqual([]);

        mockUseUser.mockReturnValue({
            user: buildUser('user@example.com'),
            userProfile: buildUserProfile(['google']),
        } as ReturnType<typeof useUser>);
        rerender();

        await waitFor(() => {
            expect(result.current.linkedProviders).toEqual(['google.com']);
        });
    });

    it('does NOT re-fetch on a re-render where user.email and userProfile.providers are unchanged', async () => {
        // Reusing the same array reference across renders is deliberate: it lets this
        // test tell "effect legitimately skipped" (same array identity preserved) apart
        // from "effect re-ran anyway" (setLinkedProviders called again with a fresh
        // array from a new .map(), even if its contents are equal) — see research.md §7.
        const stableProviders = ['google'] as UserProfile['providers'];
        const stableEmail = 'user@example.com';
        mockUseUser.mockReturnValue({
            user: buildUser(stableEmail),
            userProfile: buildUserProfile(stableProviders),
        } as ReturnType<typeof useUser>);

        const { result, rerender } = renderHook(() => useLinkedProviders());

        await waitFor(() => {
            expect(result.current.linkedProviders).toEqual(['google.com']);
        });
        const linkedProvidersRefAfterFirstRun = result.current.linkedProviders;

        // Unrelated re-render: same mocked user.email and the same userProfile.providers
        // array reference, nothing the effect should react to.
        mockUseUser.mockReturnValue({
            user: buildUser(stableEmail),
            userProfile: buildUserProfile(stableProviders),
        } as ReturnType<typeof useUser>);
        rerender();

        // If the effect incorrectly re-ran, setLinkedProviders would be called again with
        // a brand-new array from a fresh .map() call, changing the reference even though
        // the contents are equal.
        expect(result.current.linkedProviders).toBe(linkedProvidersRefAfterFirstRun);
    });
});
