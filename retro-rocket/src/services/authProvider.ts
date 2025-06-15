import { User as FirebaseUser } from 'firebase/auth';
import { AuthProviderType } from '../types/user';
import { signInWithGoogle, signInWithGithub } from './firebase';

export interface AuthProviderService {
    signIn(): Promise<FirebaseUser>;
    providerId: AuthProviderType;
    name: string;
    displayName: string;
}

class GoogleAuthProvider implements AuthProviderService {
    readonly providerId: AuthProviderType = 'google';
    readonly name = 'Google';
    readonly displayName = 'Continuar con Google';

    async signIn(): Promise<FirebaseUser> {
        const user = await signInWithGoogle();
        if (!user) {
            throw new Error('Error al iniciar sesión con Google');
        }
        return user;
    }
}

class GithubAuthProvider implements AuthProviderService {
    readonly providerId: AuthProviderType = 'github';
    readonly name = 'GitHub';
    readonly displayName = 'Continuar con GitHub';

    async signIn(): Promise<FirebaseUser> {
        const user = await signInWithGithub();
        if (!user) {
            throw new Error('Error al iniciar sesión con GitHub');
        }
        return user;
    }
}

// Registry of all available auth providers
export const authProviders = {
    google: new GoogleAuthProvider(),
    github: new GithubAuthProvider(),
} as const;

export const getAuthProvider = (providerId: AuthProviderType): AuthProviderService | null => {
    return (authProviders as Record<string, AuthProviderService>)[providerId] ?? null;
};

export const getAvailableProviders = (): AuthProviderService[] => {
    return Object.values(authProviders);
};
