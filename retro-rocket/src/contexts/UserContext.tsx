import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, onAuthStateChanged, signInWithGoogle, signOutUser } from '../services/firebase';
import { userService } from '../services/userService';
import { UserProfile, AuthState, AuthProviderType } from '../types/user';
import toast from 'react-hot-toast';

interface UserContextType extends AuthState {
    signInWithGoogle: () => Promise<void>;
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

        // Get provider info
        const providerData = firebaseUser.providerData[0];
        let provider: AuthProviderType = 'google'; // default

        if (providerData?.providerId === 'github.com') {
            provider = 'github';
        } else if (providerData?.providerId === 'apple.com') {
            provider = 'apple';
        }

        // Check if user profile already exists
        let userProfile = await userService.getUserProfile(firebaseUser.uid);

        userProfile ??= await userService.createUserProfile(firebaseUser.uid, {
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

            const firebaseUser = await signInWithGoogle();
            if (firebaseUser) {
                const userProfile = await createOrUpdateUserProfile(firebaseUser);

                setAuthState({
                    user: {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: userProfile.displayName,
                        photoURL: firebaseUser.photoURL,
                        provider: userProfile.provider,
                        createdAt: userProfile.createdAt,
                        updatedAt: userProfile.updatedAt,
                    },
                    userProfile,
                    loading: false,
                    error: null,
                    isAuthenticated: true,
                });

                // Removed duplicate welcome toast - it's shown in RetrospectivePage when joining
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));
            toast.error(errorMessage);
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
                            provider: userProfile.provider,
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
        signOut: handleSignOut,
        updateDisplayName,
        refreshUserProfile,
    }), [authState, handleSignInWithGoogle, handleSignOut, updateDisplayName, refreshUserProfile]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};
