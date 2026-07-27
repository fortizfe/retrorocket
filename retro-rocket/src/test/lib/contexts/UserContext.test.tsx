import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    UserProvider,
    useAuthContext,
    useUserProfileContext,
    useUser,
} from '@/lib/contexts/UserContext';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBootstrapSession = vi.fn();
const mockFetchSession = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockStartLogin = vi.fn();
const mockUpdateDisplayName = vi.fn();

vi.mock('@/features/auth/services/backendAuthClient', () => ({
    bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args),
    fetchSession: (...args: unknown[]) => mockFetchSession(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    startLogin: (...args: unknown[]) => mockStartLogin(...args),
    updateDisplayName: (...args: unknown[]) => mockUpdateDisplayName(...args),
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

const backendUser = {
    uid: 'uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    providers: ['google'] as const,
    primaryProvider: 'google' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
};

const wrapper = ({ children }: { children: React.ReactNode }) => <UserProvider>{children}</UserProvider>;

beforeEach(() => {
    vi.clearAllMocks();
    mockBootstrapSession.mockResolvedValue({ authenticated: false, user: null });
    mockLogout.mockResolvedValue(undefined);
});

describe('UserProvider bootstrap', () => {
    it('resolves to signed-out when the backend has no session', async () => {
        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('authenticates directly from the backend session, with no separate profile fetch', async () => {
        mockBootstrapSession.mockResolvedValue({ authenticated: true, user: backendUser });

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

        expect(result.current.user?.uid).toBe('uid-123');
        expect(result.current.user?.providers).toEqual(['google']);
        expect(result.current.user?.primaryProvider).toBe('google');
        expect(result.current.userProfile?.displayName).toBe('Test User');
    });

    it('surfaces an error state when session bootstrap fails', async () => {
        mockBootstrapSession.mockRejectedValue(new Error('backend down'));

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBe('backend down');
    });
});

describe('sign-in and sign-out', () => {
    it('signInWithGoogle / signInWithGithub redirect to the backend', async () => {
        const { result } = renderHook(() => useAuthContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.signInWithGoogle(); });
        expect(mockStartLogin).toHaveBeenCalledWith('google');

        await act(async () => { await result.current.signInWithGithub(); });
        expect(mockStartLogin).toHaveBeenCalledWith('github');
    });

    it('signOut clears the backend session and resets state', async () => {
        mockBootstrapSession.mockResolvedValue({ authenticated: true, user: backendUser });

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

        await act(async () => { await result.current.signOut(); });

        expect(mockLogout).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });
});

describe('updateDisplayName', () => {
    it('calls the backend and updates local state from the returned session', async () => {
        mockBootstrapSession.mockResolvedValue({ authenticated: true, user: backendUser });
        mockUpdateDisplayName.mockResolvedValue({ authenticated: true, user: { ...backendUser, displayName: 'New Name' } });

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

        await act(async () => { await result.current.updateDisplayName('New Name'); });

        expect(mockUpdateDisplayName).toHaveBeenCalledWith('New Name');
        expect(result.current.userProfile?.displayName).toBe('New Name');
    });
});

describe('focused hooks', () => {
    it('useAuthContext and useUserProfileContext expose their slices', async () => {
        const auth = renderHook(() => useAuthContext(), { wrapper });
        const profile = renderHook(() => useUserProfileContext(), { wrapper });
        await waitFor(() => expect(auth.result.current.loading).toBe(false));

        expect(typeof auth.result.current.signInWithGoogle).toBe('function');
        expect(typeof auth.result.current.signOut).toBe('function');
        expect(typeof profile.result.current.updateDisplayName).toBe('function');
        expect(typeof profile.result.current.refreshUserProfile).toBe('function');
    });

    it('throws when used outside a provider', () => {
        expect(() => renderHook(() => useAuthContext())).toThrow(/UserProvider/);
    });
});
