import React, { useCallback, useEffect, useState, ReactNode, useMemo } from 'react';
import { signOutUser } from '@/lib/services/firebase';
import { fetchProfile, updateDisplayName as backendUpdateDisplayName } from '@/features/auth/services/backendProfileClient';
import {
    bootstrapSession,
    logout as backendLogout,
    startLogin,
} from '@/features/auth/services/backendAuthClient';
import toast from 'react-hot-toast';
import {
    AuthContext,
    AuthContextType,
    UserProfileContext,
    UserProfileContextType,
} from '@/lib/contexts/useUserContext';

interface AuthCoreState {
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

interface UserDataState {
    user: UserProfileContextType['user'];
    userProfile: UserProfileContextType['userProfile'];
}

interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    // Auth state: changes on sign-in/sign-out/loading — does NOT include profile data
    const [coreState, setCoreState] = useState<AuthCoreState>({
        loading: true,
        error: null,
        isAuthenticated: false,
    });

    // User/profile data: changes on profile refresh/update — independent of auth transitions
    const [userData, setUserData] = useState<UserDataState>({
        user: null,
        userProfile: null,
    });

    // Sign-in is now a full-page redirect to the backend (FR-008/FR-009); the browser no
    // longer performs the OAuth handshake. State is (re)established on load via bootstrap.
    // `returnTo` (e.g. a pending MCP connector authorization request, 024) is threaded
    // through unchanged so the post-login redirect lands back where the user started,
    // instead of always defaulting to '/' (sanitizeReturnTo, server/src/domain/auth/OAuthState.ts).
    const handleSignInWithGoogle = useCallback(async (returnTo?: string): Promise<void> => {
        startLogin('google', returnTo);
    }, []);

    const handleSignInWithGithub = useCallback(async (returnTo?: string): Promise<void> => {
        startLogin('github', returnTo);
    }, []);

    const handleSignOut = useCallback(async (): Promise<void> => {
        try {
            await backendLogout();
            try {
                await signOutUser();
            } catch {
                // Firebase may already be signed out (or unconfigured); the backend session
                // is the authority and has been cleared.
            }
            setUserData({ user: null, userProfile: null });
            setCoreState({ loading: false, error: null, isAuthenticated: false });
            toast.success('Sesión cerrada exitosamente');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al cerrar sesión';
            setCoreState(prev => ({ ...prev, error: errorMessage }));
            toast.error(errorMessage);
        }
    }, []);

    const updateDisplayName = useCallback(async (displayName: string): Promise<void> => {
        if (!userData.user) throw new Error('Usuario no autenticado');

        try {
            const userProfile = await backendUpdateDisplayName(displayName);
            // Only profile data changes — auth consumers do NOT re-render
            setUserData(prev => ({
                user: prev.user ? { ...prev.user, displayName: userProfile.displayName } : null,
                userProfile,
            }));
            toast.success('Nombre actualizado exitosamente');
        } catch (error) {
            // A generic, translated message (matching Dashboard's toast.error convention),
            // not the raw error, since a network-level fetch() failure's message ("Failed
            // to fetch") is not user-facing-friendly (FR-008, US2 Acceptance Scenario 3).
            toast.error('Error al actualizar el nombre');
            throw error;
        }
    }, [userData.user]);

    const refreshUserProfile = useCallback(async (): Promise<void> => {
        if (!userData.user) return;

        try {
            const userProfile = await fetchProfile();
            // Only profile data changes — auth consumers do NOT re-render
            setUserData(prev => ({
                user: prev.user ? { ...prev.user, displayName: userProfile.displayName } : null,
                userProfile,
            }));
        } catch (error) {
            console.error('Error refreshing user profile:', error);
        }
    }, [userData.user]);

    // On load, ask the backend for the current session. If authenticated, bootstrapSession
    // has already signed the client into Firebase (custom token) so Firestore keeps working
    // for screens outside this feature's scope; the profile itself is fetched (and, on first
    // sign-in, created) entirely server-side via backendProfileClient (FR-001, FR-004).
    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const session = await bootstrapSession();
                if (!active) return;

                if (session.authenticated && session.user) {
                    const userProfile = await fetchProfile();
                    if (!active) return;

                    setUserData({
                        user: {
                            uid: session.user.uid,
                            email: session.user.email,
                            displayName: userProfile.displayName,
                            photoURL: session.user.photoURL,
                            providers: userProfile.providers,
                            primaryProvider: userProfile.primaryProvider,
                            createdAt: userProfile.createdAt,
                            updatedAt: userProfile.updatedAt,
                        },
                        userProfile,
                    });
                    setCoreState({ loading: false, error: null, isAuthenticated: true });
                } else {
                    setUserData({ user: null, userProfile: null });
                    setCoreState({ loading: false, error: null, isAuthenticated: false });
                }
            } catch (error) {
                if (!active) return;
                console.error('Error establishing session:', error);
                const errorMessage = error instanceof Error ? error.message : 'Error de autenticación';
                setUserData({ user: null, userProfile: null });
                setCoreState({ loading: false, error: errorMessage, isAuthenticated: false });
                // No-silent-failure requirement (FR-008): a profile-load failure must be
                // visibly surfaced, not just redirect back to the landing page unexplained.
                // A generic, translated message (matching Dashboard's toast.error convention
                // for the same class of failure) rather than the raw error, since a raw
                // fetch()-level message ("Failed to fetch") is not user-facing-friendly.
                toast.error('Error al cargar tu perfil');
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    // Auth context value — only re-creates when coreState or auth handlers change
    const authContextValue = useMemo<AuthContextType>(() => ({
        ...coreState,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGithub: handleSignInWithGithub,
        signOut: handleSignOut,
    }), [coreState, handleSignInWithGoogle, handleSignInWithGithub, handleSignOut]);

    // Profile context value — only re-creates when userData or profile handlers change
    const profileContextValue = useMemo<UserProfileContextType>(() => ({
        ...userData,
        updateDisplayName,
        refreshUserProfile,
    }), [userData, updateDisplayName, refreshUserProfile]);

    return (
        <AuthContext.Provider value={authContextValue}>
            <UserProfileContext.Provider value={profileContextValue}>
                {children}
            </UserProfileContext.Provider>
        </AuthContext.Provider>
    );
};
