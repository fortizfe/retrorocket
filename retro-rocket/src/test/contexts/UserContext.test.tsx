import React, { useRef } from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    UserProvider,
    useAuthContext,
    useUserProfileContext,
    useUser,
} from '../../contexts/UserContext';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../services/firebase', () => ({
    auth: { currentUser: null },
    onAuthStateChanged: vi.fn(),
    signOutUser: vi.fn().mockResolvedValue(undefined),
    isDevMode: false,
}));

const mockGetUserProfile = vi.fn();
const mockCreateUserProfile = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockAddProviderToUser = vi.fn();

vi.mock('../../services/userService', () => ({
    userService: {
        getUserProfile: (...args: any[]) => mockGetUserProfile(...args),
        createUserProfile: (...args: any[]) => mockCreateUserProfile(...args),
        updateUserProfile: (...args: any[]) => mockUpdateUserProfile(...args),
        addProviderToUser: (...args: any[]) => mockAddProviderToUser(...args),
    },
}));

const mockSignInWithAccountLinking = vi.fn();

vi.mock('../../services/accountLinking', () => ({
    accountLinkingService: {
        signInWithAccountLinking: (...args: any[]) => mockSignInWithAccountLinking(...args),
    },
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

import { onAuthStateChanged } from '../../services/firebase';

const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);

const mockFirebaseUser = {
    uid: 'uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    providerData: [{ providerId: 'google.com', uid: 'uid-123', displayName: 'Test User', email: 'test@example.com', photoURL: null, phoneNumber: null }],
};

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserProvider>{children}</UserProvider>
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: onAuthStateChanged captures callback, user is null (not signed in)
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            callback(null);
            return vi.fn();
        });
    });

    it('starts with loading=true before onAuthStateChanged fires', () => {
        // onAuthStateChanged does NOT call callback immediately in this test
        mockOnAuthStateChanged.mockImplementation(() => vi.fn());

        const { result } = renderHook(() => useAuthContext(), { wrapper });
        expect(result.current.loading).toBe(true);
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('sets loading=false and isAuthenticated=false when no user', () => {
        const { result } = renderHook(() => useAuthContext(), { wrapper });
        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('sets isAuthenticated=true and loads profile when user signs in', async () => {
        let capturedCallback: ((user: any) => void) | null = null;
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            capturedCallback = callback as (user: any) => void;
            return vi.fn();
        });

        mockGetUserProfile.mockResolvedValue(mockUserProfile);
        mockUpdateUserProfile.mockResolvedValue(undefined);

        const { result } = renderHook(() => useAuthContext(), { wrapper });

        await act(async () => {
            capturedCallback!(mockFirebaseUser);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('sets error state when profile creation fails', async () => {
        let capturedCallback: ((user: any) => void) | null = null;
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            capturedCallback = callback as (user: any) => void;
            return vi.fn();
        });

        mockGetUserProfile.mockRejectedValue(new Error('Firestore error'));

        const { result } = renderHook(() => useAuthContext(), { wrapper });

        await act(async () => {
            capturedCallback!(mockFirebaseUser);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBe('Firestore error');
    });

    it('cleans up onAuthStateChanged subscription on unmount', () => {
        const mockUnsubscribe = vi.fn();
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            callback(null);
            return mockUnsubscribe;
        });

        const { unmount } = renderHook(() => useAuthContext(), { wrapper });
        unmount();

        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
});

describe('useAuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            callback(null);
            return vi.fn();
        });
    });

    it('throws when used outside UserProvider', () => {
        // Suppress expected console.error from React
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useAuthContext())).toThrow(
            'useAuthContext must be used within a UserProvider'
        );
        consoleError.mockRestore();
    });

    it('returns auth state inside UserProvider', () => {
        const { result } = renderHook(() => useAuthContext(), { wrapper });
        expect(result.current).toMatchObject({
            loading: false,
            isAuthenticated: false,
            error: null,
            signInWithGoogle: expect.any(Function),
            signInWithGithub: expect.any(Function),
            signOut: expect.any(Function),
        });
    });

    it('signInWithGoogle sets isAuthenticated=true on success', async () => {
        mockGetUserProfile.mockResolvedValue(mockUserProfile);
        mockUpdateUserProfile.mockResolvedValue(undefined);
        mockSignInWithAccountLinking.mockResolvedValue({
            success: true,
            user: mockFirebaseUser,
            wasLinked: false,
        });

        const { result } = renderHook(() => useAuthContext(), { wrapper });

        await act(async () => {
            await result.current.signInWithGoogle();
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('signInWithGoogle sets error on failure', async () => {
        mockSignInWithAccountLinking.mockRejectedValue(new Error('Auth failed'));

        const { result } = renderHook(() => useAuthContext(), { wrapper });

        await act(async () => {
            await result.current.signInWithGoogle().catch(() => {});
        });

        expect(result.current.error).toBe('Auth failed');
        expect(result.current.loading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('signInWithGithub sets isAuthenticated=true on success', async () => {
        mockGetUserProfile.mockResolvedValue(mockUserProfile);
        mockUpdateUserProfile.mockResolvedValue(undefined);
        mockSignInWithAccountLinking.mockResolvedValue({
            success: true,
            user: mockFirebaseUser,
            wasLinked: false,
        });

        const { result } = renderHook(() => useAuthContext(), { wrapper });

        await act(async () => {
            await result.current.signInWithGithub();
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(mockSignInWithAccountLinking).toHaveBeenCalledWith('github');
    });

    it('signOut clears auth state', async () => {
        // First sign in
        mockGetUserProfile.mockResolvedValue(mockUserProfile);
        mockSignInWithAccountLinking.mockResolvedValue({
            success: true,
            user: mockFirebaseUser,
            wasLinked: false,
        });

        const { result } = renderHook(() => useAuthContext(), { wrapper });

        await act(async () => {
            await result.current.signInWithGoogle();
        });
        expect(result.current.isAuthenticated).toBe(true);

        await act(async () => {
            await result.current.signOut();
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBeNull();
    });
});

describe('useUserProfileContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            callback(null);
            return vi.fn();
        });
    });

    it('throws when used outside UserProvider', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useUserProfileContext())).toThrow(
            'useUserProfileContext must be used within a UserProvider'
        );
        consoleError.mockRestore();
    });

    it('returns profile state inside UserProvider', () => {
        const { result } = renderHook(() => useUserProfileContext(), { wrapper });
        expect(result.current).toMatchObject({
            user: null,
            userProfile: null,
            updateDisplayName: expect.any(Function),
            refreshUserProfile: expect.any(Function),
        });
    });

    it('updateDisplayName updates profile without touching auth state', async () => {
        // Sign in first to have a user
        mockGetUserProfile.mockResolvedValue(mockUserProfile);
        mockSignInWithAccountLinking.mockResolvedValue({
            success: true,
            user: mockFirebaseUser,
            wasLinked: false,
        });
        mockUpdateUserProfile.mockResolvedValue(undefined);

        const authHook = renderHook(() => useAuthContext(), { wrapper });
        const profileHook = renderHook(() => useUserProfileContext(), { wrapper: authHook.result.current ? wrapper : wrapper });

        // Use a single wrapper for both
        const { result } = renderHook(
            () => ({ auth: useAuthContext(), profile: useUserProfileContext() }),
            { wrapper }
        );

        await act(async () => {
            await result.current.auth.signInWithGoogle();
        });

        await act(async () => {
            await result.current.profile.updateDisplayName('New Name');
        });

        expect(mockUpdateUserProfile).toHaveBeenCalledWith('uid-123', { displayName: 'New Name' });
        expect(result.current.profile.userProfile?.displayName).toBe('New Name');
    });

    it('updateDisplayName throws when no user authenticated', async () => {
        const { result } = renderHook(() => useUserProfileContext(), { wrapper });

        await expect(
            act(async () => {
                await result.current.updateDisplayName('New Name');
            })
        ).rejects.toThrow('Usuario no autenticado');
    });

    it('refreshUserProfile reloads profile from service', async () => {
        mockSignInWithAccountLinking.mockResolvedValue({
            success: true,
            user: mockFirebaseUser,
            wasLinked: false,
        });
        mockUpdateUserProfile.mockResolvedValue(undefined);

        const updatedProfile = { ...mockUserProfile, displayName: 'Refreshed Name' };
        // createOrUpdateUserProfile calls getUserProfile TWICE when profile exists:
        // 1. initial check, 2. latestProfile re-fetch after updateUserProfile
        // Then refreshUserProfile calls it a third time
        mockGetUserProfile
            .mockResolvedValueOnce(mockUserProfile)
            .mockResolvedValueOnce(mockUserProfile)
            .mockResolvedValueOnce(updatedProfile);

        const { result } = renderHook(
            () => ({ auth: useAuthContext(), profile: useUserProfileContext() }),
            { wrapper }
        );

        await act(async () => {
            await result.current.auth.signInWithGoogle();
        });

        await act(async () => {
            await result.current.profile.refreshUserProfile();
        });

        expect(result.current.profile.userProfile?.displayName).toBe('Refreshed Name');
    });
});

describe('useUser (backward compat)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            callback(null);
            return vi.fn();
        });
    });

    it('returns merged state from both contexts', () => {
        const { result } = renderHook(() => useUser(), { wrapper });
        expect(result.current).toMatchObject({
            // Auth fields
            loading: false,
            isAuthenticated: false,
            error: null,
            signInWithGoogle: expect.any(Function),
            signInWithGithub: expect.any(Function),
            signOut: expect.any(Function),
            // Profile fields
            user: null,
            userProfile: null,
            updateDisplayName: expect.any(Function),
            refreshUserProfile: expect.any(Function),
        });
    });
});

describe('Context isolation — profile refresh does not re-render auth consumers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('AuthContext consumers do not re-render when only profile data changes', async () => {
        // Use onAuthStateChanged to sign in (avoids the sign-in toast side effects)
        let capturedAuthCallback: ((user: any) => void) | null = null;
        mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
            capturedAuthCallback = callback as (user: any) => void;
            return vi.fn();
        });
        mockUpdateUserProfile.mockResolvedValue(undefined);
        // createOrUpdateUserProfile calls getUserProfile TWICE on sign-in, then once for refresh
        mockGetUserProfile
            .mockResolvedValueOnce(mockUserProfile)
            .mockResolvedValueOnce(mockUserProfile)
            .mockResolvedValueOnce({ ...mockUserProfile, displayName: 'Updated' });

        let authRenderCount = 0;
        let profileRenderCount = 0;

        const AuthConsumer: React.FC<{ onResult: (count: number) => void }> = ({ onResult }) => {
            const ctx = useAuthContext();
            authRenderCount++;
            onResult(authRenderCount);
            return <span data-testid="auth">{String(ctx.isAuthenticated)}</span>;
        };

        const ProfileConsumer: React.FC<{ onResult: (count: number) => void }> = ({ onResult }) => {
            const ctx = useUserProfileContext();
            profileRenderCount++;
            onResult(profileRenderCount);
            return <span data-testid="profile">{ctx.userProfile?.displayName ?? 'none'}</span>;
        };

        let capturedRefresh: (() => Promise<void>) | null = null;
        const RefreshCapture: React.FC = () => {
            const { refreshUserProfile } = useUserProfileContext();
            capturedRefresh = refreshUserProfile;
            return null;
        };

        render(
            <UserProvider>
                <AuthConsumer onResult={() => {}} />
                <ProfileConsumer onResult={() => {}} />
                <RefreshCapture />
            </UserProvider>
        );

        // Sign in via onAuthStateChanged callback to establish userData.user
        await act(async () => {
            capturedAuthCallback?.(mockFirebaseUser);
        });

        // Baseline after sign-in
        const authCountAfterSignIn = authRenderCount;
        const profileCountAfterSignIn = profileRenderCount;

        // Trigger a profile-only refresh
        await act(async () => {
            await capturedRefresh?.();
        });

        // Profile consumer should have re-rendered, auth consumer should NOT
        expect(profileRenderCount).toBeGreaterThan(profileCountAfterSignIn);
        expect(authRenderCount).toBe(authCountAfterSignIn);
    });
});
