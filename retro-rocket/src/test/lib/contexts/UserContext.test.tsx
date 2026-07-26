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

vi.mock('@/lib/services/firebase', () => ({
    signOutUser: vi.fn().mockResolvedValue(undefined),
}));

const mockBootstrapSession = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockStartLogin = vi.fn();

vi.mock('@/features/auth/services/backendAuthClient', () => ({
    bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    startLogin: (...args: unknown[]) => mockStartLogin(...args),
}));

const mockGetUserProfile = vi.fn();
const mockCreateUserProfile = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockAddProviderToUser = vi.fn();

vi.mock('@/features/auth/services/userService', () => ({
    userService: {
        getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
        createUserProfile: (...args: unknown[]) => mockCreateUserProfile(...args),
        updateUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args),
        addProviderToUser: (...args: unknown[]) => mockAddProviderToUser(...args),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

import { signOutUser } from '@/lib/services/firebase';

const backendUser = { uid: 'uid-123', email: 'test@example.com', displayName: 'Test User', photoURL: null, providers: ['google'] as const };

const mockUserProfile = {
    uid: 'uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    providers: ['google' as const],
    primaryProvider: 'google' as const,
    joinedBoards: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const wrapper = ({ children }: { children: React.ReactNode }) => <UserProvider>{children}</UserProvider>;

beforeEach(() => {
    vi.clearAllMocks();
    mockBootstrapSession.mockResolvedValue({ authenticated: false, user: null, firebaseCustomToken: null });
    mockLogout.mockResolvedValue(undefined);
    vi.mocked(signOutUser).mockResolvedValue(undefined);
});

describe('UserProvider bootstrap', () => {
    it('resolves to signed-out when the backend has no session', async () => {
        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('creates a profile and authenticates when the backend session is valid', async () => {
        mockBootstrapSession.mockResolvedValue({ authenticated: true, user: backendUser, firebaseCustomToken: 'ct' });
        mockGetUserProfile.mockResolvedValueOnce(null); // no existing profile
        mockCreateUserProfile.mockResolvedValue(mockUserProfile);

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

        expect(mockCreateUserProfile).toHaveBeenCalledWith('uid-123', expect.objectContaining({ email: 'test@example.com', provider: 'google' }));
        expect(result.current.user?.uid).toBe('uid-123');
        expect(result.current.user?.providers).toEqual(['google']);
    });

    it('adds providers missing from an existing profile (backend is authoritative)', async () => {
        mockBootstrapSession.mockResolvedValue({
            authenticated: true,
            user: { ...backendUser, providers: ['google', 'github'] },
            firebaseCustomToken: 'ct',
        });
        mockGetUserProfile
            .mockResolvedValueOnce(mockUserProfile) // existing has only google
            .mockResolvedValueOnce({ ...mockUserProfile, providers: ['google', 'github'] }); // after add

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

        expect(mockAddProviderToUser).toHaveBeenCalledWith('uid-123', 'github');
    });

    it('surfaces an error state when profile setup fails', async () => {
        mockBootstrapSession.mockResolvedValue({ authenticated: true, user: backendUser, firebaseCustomToken: 'ct' });
        mockGetUserProfile.mockResolvedValueOnce(null);
        mockCreateUserProfile.mockRejectedValue(new Error('firestore down'));

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBe('firestore down');
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

    it('signOut clears the backend session, signs out Firebase, and resets state', async () => {
        mockBootstrapSession.mockResolvedValue({ authenticated: true, user: backendUser, firebaseCustomToken: 'ct' });
        mockGetUserProfile.mockResolvedValueOnce(null);
        mockCreateUserProfile.mockResolvedValue(mockUserProfile);

        const { result } = renderHook(() => useUser(), { wrapper });
        await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

        await act(async () => { await result.current.signOut(); });

        expect(mockLogout).toHaveBeenCalled();
        expect(signOutUser).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
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
