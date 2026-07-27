import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import {
    bootstrapSession,
    fetchSession,
    logout as backendLogout,
    startLogin,
    updateDisplayName as backendUpdateDisplayName,
    type BackendUser,
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

/**
 * The backend session response is now the sole source of identity (feature 017): uid,
 * email, displayName, photoURL, providers, primaryProvider, and createdAt all come from
 * Firebase Auth via the backend (server/src/adapters/firebase/FirebaseIdentityAdapter.ts),
 * not a client-side Firestore `users` document. `joinedBoards` is not sourced here — the
 * dashboard's board list comes directly from the boards API (see feature 017 US4).
 */
function toUserData(backendUser: BackendUser): UserDataState {
    const createdAt = new Date(backendUser.createdAt);
    const user: User = {
        uid: backendUser.uid,
        email: backendUser.email,
        displayName: backendUser.displayName,
        photoURL: backendUser.photoURL,
        providers: backendUser.providers,
        primaryProvider: backendUser.primaryProvider,
        createdAt,
        updatedAt: createdAt,
    };
    const userProfile: UserProfile = {
        uid: backendUser.uid,
        email: backendUser.email ?? '',
        displayName: backendUser.displayName ?? '',
        photoURL: backendUser.photoURL,
        providers: backendUser.providers,
        primaryProvider: backendUser.primaryProvider,
        joinedBoards: [],
        createdAt,
        updatedAt: createdAt,
    };
    return { user, userProfile };
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

    // Sign-in is a full-page redirect to the backend (FR-008/FR-009); the browser no
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
            const session = await backendUpdateDisplayName(displayName);
            if (session.authenticated && session.user) {
                const updated = toUserData(session.user);
                setUserData(updated);
            }
            toast.success('Nombre actualizado exitosamente');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el nombre';
            toast.error(errorMessage);
            throw error;
        }
    }, [userData.user]);

    const refreshUserProfile = useCallback(async (): Promise<void> => {
        if (!userData.user) return;

        try {
            const session = await fetchSession();
            if (session.authenticated && session.user) {
                setUserData(toUserData(session.user));
            }
        } catch (error) {
            console.error('Error refreshing user profile:', error);
        }
    }, [userData.user]);

    // On load, ask the backend for the current session — the sole source of identity.
    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const session = await bootstrapSession();
                if (!active) return;

                if (session.authenticated && session.user) {
                    setUserData(toUserData(session.user));
                    setCoreState({ loading: false, error: null, isAuthenticated: true });
                } else {
                    setUserData({ user: null, userProfile: null });
                    setCoreState({ loading: false, error: null, isAuthenticated: false });
                }
            } catch (error) {
                if (!active) return;
                console.error('Error establishing session:', error);
                setUserData({ user: null, userProfile: null });
                setCoreState({
                    loading: false,
                    error: error instanceof Error ? error.message : 'Error de autenticación',
                    isAuthenticated: false,
                });
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
