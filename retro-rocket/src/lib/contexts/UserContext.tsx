import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { signOutUser } from '@/lib/services/firebase';
import { fetchProfile, updateDisplayName as backendUpdateDisplayName } from '@/features/auth/services/backendProfileClient';
import {
    bootstrapSession,
    logout as backendLogout,
    startLogin,
} from '@/features/auth/services/backendAuthClient';
import { User, UserProfile } from '@/features/auth/types/user';
import toast from 'react-hot-toast';

// ─── Focused context types ────────────────────────────────────────────────────

interface AuthCoreState {
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthCoreState {
    signInWithGoogle: () => Promise<void>;
    signInWithGithub: () => Promise<void>;
    signOut: () => Promise<void>;
}

interface UserDataState {
    user: User | null;
    userProfile: UserProfile | null;
}

interface UserProfileContextType extends UserDataState {
    updateDisplayName: (displayName: string) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
}

// Backward-compat merged type (keeps all existing consumers working)
interface UserContextType extends AuthContextType, UserProfileContextType {}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// ─── Focused hooks ────────────────────────────────────────────────────────────

export const useAuthContext = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuthContext must be used within a UserProvider');
    return context;
};

export const useUserProfileContext = (): UserProfileContextType => {
    const context = useContext(UserProfileContext);
    if (!context) throw new Error('useUserProfileContext must be used within a UserProvider');
    return context;
};

// Backward-compat hook — existing consumers need zero changes
export const useUser = (): UserContextType => {
    const auth = useAuthContext();
    const profile = useUserProfileContext();
    return useMemo(() => ({ ...auth, ...profile }), [auth, profile]);
};

// ─── Provider ─────────────────────────────────────────────────────────────────

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
    const handleSignInWithGoogle = useCallback(async (): Promise<void> => {
        startLogin('google');
    }, []);

    const handleSignInWithGithub = useCallback(async (): Promise<void> => {
        startLogin('github');
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
