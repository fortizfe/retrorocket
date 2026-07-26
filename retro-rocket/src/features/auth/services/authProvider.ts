import { AuthProviderType } from '@/features/auth/types/user';

/**
 * Provider registry — metadata only. The OAuth handshake is now performed entirely by the
 * backend (see `backendAuthClient` + `/api/auth/*`); the frontend no longer signs in
 * directly (FR-009), so these entries carry no `signIn()` behaviour.
 */
export interface AuthProviderInfo {
    providerId: AuthProviderType;
    name: string;
    displayName: string;
}

const providerRegistry: Record<string, AuthProviderInfo> = {
    google: { providerId: 'google', name: 'Google', displayName: 'Continuar con Google' },
    github: { providerId: 'github', name: 'GitHub', displayName: 'Continuar con GitHub' },
};

export const getAuthProvider = (providerId: AuthProviderType): AuthProviderInfo | null => {
    return providerRegistry[providerId] ?? null;
};

export const getAvailableProviders = (): AuthProviderInfo[] => {
    return Object.values(providerRegistry);
};
