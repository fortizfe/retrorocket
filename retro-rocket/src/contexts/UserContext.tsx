import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, onAuthStateChanged, signOutUser } from '../services/firebase';
import { userService } from '../services/userService';
import { accountLinkingService } from '../services/accountLinking';
import { UserProfile, AuthState, AuthProviderType } from '../types/user';
import toast from 'react-hot-toast';

interface UserContextType extends AuthState {
    signInWithGoogle: () => Promise<void>;
    signInWithGithub: () => Promise<void>;
    signOut: () => Promise<void>;
    updateDisplayName: (displayName: string) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        userProfile: null,
        loading: true,
        error: null,
        isAuthenticated: false,
    });

    const createOrUpdateUserProfile = async (firebaseUser: FirebaseUser): Promise<UserProfile> => {
        if (!firebaseUser.email) {
            throw new Error('Email is required');
        }

        // Get all providers from Firebase Auth
        const firebaseProviders = firebaseUser.providerData.map(provider => {
            switch (provider.providerId) {
                case 'google.com':
                    return 'google';
                case 'github.com':
                    return 'github';
                case 'apple.com':
                    return 'apple';
                default:
                    return 'google'; // fallback
            }
        }) as AuthProviderType[];

        console.log('Firebase Auth providers for user:', firebaseProviders);

        // Always get the latest user profile from Firestore first
        let userProfile = await userService.getUserProfile(firebaseUser.uid);

        if (userProfile) {
            // User profile exists, synchronize providers and update the last accessed time

            // Find any missing providers in Firestore that are present in Firebase Auth
            const missingProviders = firebaseProviders.filter(provider =>
                !userProfile!.providers.includes(provider)
            );

            if (missingProviders.length > 0) {
                console.log('Found missing providers in Firestore, adding:', missingProviders);

                // Add missing providers one by one
                for (const provider of missingProviders) {
                    try {
                        await userService.addProviderToUser(firebaseUser.uid, provider);
                    } catch (error) {
                        console.warn(`Failed to add provider ${provider}:`, error);
                    }
                }
            }

            await userService.updateUserProfile(firebaseUser.uid, {
                updatedAt: new Date(),
            });

            // Fetch the profile again to ensure we have the most up-to-date data
            // This is important after account linking operations
            const latestProfile = await userService.getUserProfile(firebaseUser.uid);
            return latestProfile || userProfile;
        }

        // User profile doesn't exist, create new one
        // Get provider info from the first provider (primary one)
        const providerData = firebaseUser.providerData[0];
        let provider: AuthProviderType = 'google'; // default

        if (providerData?.providerId === 'github.com') {
            provider = 'github';
        } else if (providerData?.providerId === 'apple.com') {
            provider = 'apple';
        }

        userProfile = await userService.createUserProfile(firebaseUser.uid, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? 'Usuario',
            photoURL: firebaseUser.photoURL,
            provider,
        });

        return userProfile;
    };

    const handleSignInWithGoogle = async (): Promise<void> => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));

            const result = await accountLinkingService.signInWithAccountLinking('google');

            if (result.success && result.user) {
                const userProfile = await createOrUpdateUserProfile(result.user);

                setAuthState({
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
                    loading: false,
                    error: null,
                    isAuthenticated: true,
                });

                // Show appropriate success message
                if (result.wasLinked) {
                    toast.success(result.message, {
                        duration: 6000,
                        style: {
                            maxWidth: '450px',
                        },
                    });
                } else {
                    toast.success('Inicio de sesión exitoso');
                }
            } else {
                throw new Error('Error en el proceso de autenticación');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));

            toast.error(errorMessage, {
                duration: 6000,
                style: {
                    maxWidth: '400px',
                },
            });
        }
    };

    const handleSignInWithGithub = async (): Promise<void> => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));

            const result = await accountLinkingService.signInWithAccountLinking('github');

            if (result.success && result.user) {
                const userProfile = await createOrUpdateUserProfile(result.user);

                setAuthState({
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
                    loading: false,
                    error: null,
                    isAuthenticated: true,
                });

                // Show appropriate success message
                if (result.wasLinked) {
                    toast.success(result.message, {
                        duration: 6000,
                        style: {
                            maxWidth: '450px',
                        },
                    });
                } else {
                    toast.success('Inicio de sesión exitoso');
                }
            } else {
                throw new Error('Error en el proceso de autenticación');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión con GitHub';
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));

            toast.error(errorMessage, {
                duration: 6000,
                style: {
                    maxWidth: '400px',
                },
            });
        }
    };

    const handleSignOut = async (): Promise<void> => {
        try {
            await signOutUser();
            setAuthState({
                user: null,
                userProfile: null,
                loading: false,
                error: null,
                isAuthenticated: false,
            });
            toast.success('Sesión cerrada exitosamente');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al cerrar sesión';
            setAuthState(prev => ({ ...prev, error: errorMessage }));
            toast.error(errorMessage);
        }
    };

    const updateDisplayName = async (displayName: string): Promise<void> => {
        if (!authState.user) {
            throw new Error('Usuario no autenticado');
        }

        try {
            await userService.updateUserProfile(authState.user.uid, { displayName });

            setAuthState(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, displayName } : null,
                userProfile: prev.userProfile ? { ...prev.userProfile, displayName } : null,
            }));

            toast.success('Nombre actualizado exitosamente');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el nombre';
            toast.error(errorMessage);
            throw error;
        }
    };

    const refreshUserProfile = async (): Promise<void> => {
        if (!authState.user) return;

        try {
            const userProfile = await userService.getUserProfile(authState.user.uid);
            if (userProfile) {
                setAuthState(prev => ({
                    ...prev,
                    userProfile,
                    user: prev.user ? {
                        ...prev.user,
                        displayName: userProfile.displayName,
                    } : null,
                }));
            }
        } catch (error) {
            console.error('Error refreshing user profile:', error);
        }
    };

    useEffect(() => {
        if (!auth) {
            setAuthState(prev => ({ ...prev, loading: false }));
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userProfile = await createOrUpdateUserProfile(firebaseUser);

                    setAuthState({
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
                        loading: false,
                        error: null,
                        isAuthenticated: true,
                    });
                } catch (error) {
                    console.error('Error setting up user profile:', error);
                    setAuthState({
                        user: null,
                        userProfile: null,
                        loading: false,
                        error: error instanceof Error ? error.message : 'Error de autenticación',
                        isAuthenticated: false,
                    });
                }
            } else {
                setAuthState({
                    user: null,
                    userProfile: null,
                    loading: false,
                    error: null,
                    isAuthenticated: false,
                });
            }
        });

        return unsubscribe;
    }, []);

    const contextValue: UserContextType = useMemo(() => ({
        ...authState,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGithub: handleSignInWithGithub,
        signOut: handleSignOut,
        updateDisplayName,
        refreshUserProfile,
    }), [authState, handleSignInWithGoogle, handleSignInWithGithub, handleSignOut, updateDisplayName, refreshUserProfile]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};
