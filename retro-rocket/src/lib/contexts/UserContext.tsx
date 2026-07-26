import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { signOutUser } from '@/lib/services/firebase';
import { userService } from '@/features/auth/services/userService';
import {
    bootstrapSession,
    logout as backendLogout,
    startLogin,
    type BackendUser,
} from '@/features/auth/services/backendAuthClient';
import { User, UserProfile, AuthProviderType } from '@/features/auth/types/user';
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

    // Provider identity now comes from the backend session (not firebaseUser.providerData,
    // which is empty under custom-token sign-in). This creates/updates the Firestore user
    // profile from the backend user's authoritative provider list.
    const createOrUpdateUserProfile = useCallback(async (backendUser: BackendUser): Promise<UserProfile> => {
        if (!backendUser.email) {
            throw new Error('Email is required');
        }

        const providers = backendUser.providers as AuthProviderType[];
        const existing = await userService.getUserProfile(backendUser.uid);

        if (existing) {
            const missingProviders = providers.filter(p => !existing.providers.includes(p));
            for (const provider of missingProviders) {
                try {
                    await userService.addProviderToUser(backendUser.uid, provider);
                } catch (error) {
                    console.warn(`Failed to add provider ${provider}:`, error);
                }
            }

            await userService.updateUserProfile(backendUser.uid, { updatedAt: new Date() });

            const latestProfile = await userService.getUserProfile(backendUser.uid);
            return latestProfile || existing;
        }

        const primaryProvider: AuthProviderType = providers[0] ?? 'google';
        const created = await userService.createUserProfile(backendUser.uid, {
            email: backendUser.email,
            displayName: backendUser.displayName ?? backendUser.email.split('@')[0] ?? 'Usuario',
            photoURL: backendUser.photoURL,
            provider: primaryProvider,
        });

        // Attach any providers beyond the primary (e.g. an already-linked second provider).
        const extraProviders = providers.slice(1);
        for (const provider of extraProviders) {
            try {
                await userService.addProviderToUser(backendUser.uid, provider);
            } catch (error) {
                console.warn(`Failed to add provider ${provider}:`, error);
            }
        }
        if (extraProviders.length > 0) {
            const latestProfile = await userService.getUserProfile(backendUser.uid);
            return latestProfile || created;
        }

        return created;
    }, []);

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
            await userService.updateUserProfile(userData.user.uid, { displayName });
            // Only profile data changes — auth consumers do NOT re-render
            setUserData(prev => ({
                user: prev.user ? { ...prev.user, displayName } : null,
                userProfile: prev.userProfile ? { ...prev.userProfile, displayName } : null,
            }));
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
            const userProfile = await userService.getUserProfile(userData.user.uid);
            if (userProfile) {
                // Only profile data changes — auth consumers do NOT re-render
                setUserData(prev => ({
                    user: prev.user ? { ...prev.user, displayName: userProfile.displayName } : null,
                    userProfile,
                }));
            }
        } catch (error) {
            console.error('Error refreshing user profile:', error);
        }
    }, [userData.user]);

    // On load, ask the backend for the current session. If authenticated, bootstrapSession
    // has already signed the client into Firebase (custom token) so Firestore keeps working;
    // we then hydrate the Firestore profile from the backend user.
    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const session = await bootstrapSession();
                if (!active) return;

                if (session.authenticated && session.user) {
                    const userProfile = await createOrUpdateUserProfile(session.user);
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
    }, [createOrUpdateUserProfile]);

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
