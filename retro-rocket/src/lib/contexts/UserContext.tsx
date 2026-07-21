import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, onAuthStateChanged, signOutUser } from '@/lib/services/firebase';
import { userService } from '@/features/auth/services/userService';
import { accountLinkingService } from '@/features/auth/services/accountLinking';
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

    const createOrUpdateUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile> => {
        if (!firebaseUser.email) {
            throw new Error('Email is required');
        }

        const firebaseProviders = firebaseUser.providerData.map(provider => {
            switch (provider.providerId) {
                case 'google.com': return 'google';
                case 'github.com': return 'github';
                case 'apple.com':  return 'apple';
                default:           return 'google';
            }
        }) as AuthProviderType[];

        console.log('Firebase Auth providers for user:', firebaseProviders);

        let userProfile = await userService.getUserProfile(firebaseUser.uid);

        if (userProfile) {
            const missingProviders = firebaseProviders.filter(p => !userProfile!.providers.includes(p));

            if (missingProviders.length > 0) {
                console.log('Found missing providers in Firestore, adding:', missingProviders);
                for (const provider of missingProviders) {
                    try {
                        await userService.addProviderToUser(firebaseUser.uid, provider);
                    } catch (error) {
                        console.warn(`Failed to add provider ${provider}:`, error);
                    }
                }
            }

            await userService.updateUserProfile(firebaseUser.uid, { updatedAt: new Date() });

            const latestProfile = await userService.getUserProfile(firebaseUser.uid);
            return latestProfile || userProfile;
        }

        const providerData = firebaseUser.providerData[0];
        let provider: AuthProviderType = 'google';
        if (providerData?.providerId === 'github.com') provider = 'github';
        else if (providerData?.providerId === 'apple.com') provider = 'apple';

        userProfile = await userService.createUserProfile(firebaseUser.uid, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Usuario',
            photoURL: firebaseUser.photoURL,
            provider,
        });

        return userProfile;
    }, []);

    const handleSignInWithGoogle = useCallback(async (): Promise<void> => {
        try {
            setCoreState(prev => ({ ...prev, loading: true, error: null }));

            const result = await accountLinkingService.signInWithAccountLinking('google');

            if (result.success && result.user) {
                const userProfile = await createOrUpdateUserProfile(result.user);

                setUserData({
                    user: {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: userProfile.displayName,
                        photoURL: result.user.photoURL,
                        providers: userProfile.providers,
                        primaryProvider: userProfile.primaryProvider,
                        createdAt: userProfile.createdAt,
                        updatedAt: userProfile.updatedAt,
                    },
                    userProfile,
                });
                setCoreState({ loading: false, error: null, isAuthenticated: true });

                if (result.wasLinked) {
                    toast.success(result.message, { duration: 6000, style: { maxWidth: '450px' } });
                } else {
                    toast.success('Inicio de sesión exitoso');
                }
            } else {
                throw new Error('Error en el proceso de autenticación');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
            setCoreState(prev => ({ ...prev, loading: false, error: errorMessage }));
            toast.error(errorMessage, { duration: 6000, style: { maxWidth: '400px' } });
        }
    }, [createOrUpdateUserProfile]);

    const handleSignInWithGithub = useCallback(async (): Promise<void> => {
        try {
            setCoreState(prev => ({ ...prev, loading: true, error: null }));

            const result = await accountLinkingService.signInWithAccountLinking('github');

            if (result.success && result.user) {
                const userProfile = await createOrUpdateUserProfile(result.user);

                setUserData({
                    user: {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: userProfile.displayName,
                        photoURL: result.user.photoURL,
                        providers: userProfile.providers,
                        primaryProvider: userProfile.primaryProvider,
                        createdAt: userProfile.createdAt,
                        updatedAt: userProfile.updatedAt,
                    },
                    userProfile,
                });
                setCoreState({ loading: false, error: null, isAuthenticated: true });

                if (result.wasLinked) {
                    toast.success(result.message, { duration: 6000, style: { maxWidth: '450px' } });
                } else {
                    toast.success('Inicio de sesión exitoso');
                }
            } else {
                throw new Error('Error en el proceso de autenticación');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión con GitHub';
            setCoreState(prev => ({ ...prev, loading: false, error: errorMessage }));
            toast.error(errorMessage, { duration: 6000, style: { maxWidth: '400px' } });
        }
    }, [createOrUpdateUserProfile]);

    const handleSignOut = useCallback(async (): Promise<void> => {
        try {
            await signOutUser();
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

    useEffect(() => {
        if (!auth) {
            setCoreState(prev => ({ ...prev, loading: false }));
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userProfile = await createOrUpdateUserProfile(firebaseUser);

                    setUserData({
                        user: {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: userProfile.displayName,
                            photoURL: firebaseUser.photoURL,
                            providers: userProfile.providers,
                            primaryProvider: userProfile.primaryProvider,
                            createdAt: userProfile.createdAt,
                            updatedAt: userProfile.updatedAt,
                        },
                        userProfile,
                    });
                    setCoreState({ loading: false, error: null, isAuthenticated: true });
                } catch (error) {
                    console.error('Error setting up user profile:', error);
                    setUserData({ user: null, userProfile: null });
                    setCoreState({
                        loading: false,
                        error: error instanceof Error ? error.message : 'Error de autenticación',
                        isAuthenticated: false,
                    });
                }
            } else {
                setUserData({ user: null, userProfile: null });
                setCoreState({ loading: false, error: null, isAuthenticated: false });
            }
        });

        return unsubscribe;
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
