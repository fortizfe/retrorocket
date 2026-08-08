import { createContext, useContext, useMemo } from 'react';
import { User, UserProfile } from '@/features/auth/types/user';

// ─── Focused context types ────────────────────────────────────────────────────

export interface AuthContextType {
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    signInWithGoogle: (returnTo?: string) => Promise<void>;
    signInWithGithub: (returnTo?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export interface UserProfileContextType {
    user: User | null;
    userProfile: UserProfile | null;
    updateDisplayName: (displayName: string) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
}

// Backward-compat merged type (keeps all existing consumers working)
export interface UserContextType extends AuthContextType, UserProfileContextType {}

// ─── Contexts ─────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

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
