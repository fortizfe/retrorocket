import { useState, useEffect } from 'react';
import { accountLinkingService } from '../services/accountLinking';
import { useUser } from '../contexts/UserContext';
import { AuthProviderType } from '../types/user';

export interface LinkedProvidersInfo {
    linkedProviders: string[];
    isLoading: boolean;
    error: string | null;
    refreshLinkedProviders: () => Promise<void>;
}

export const useLinkedProviders = (): LinkedProvidersInfo => {
    const { user, userProfile } = useUser();
    const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshLinkedProviders = async (): Promise<void> => {
        if (!user?.email) return;

        setIsLoading(true);
        setError(null);

        try {
            // Use providers from user profile if available, otherwise fetch from Firebase
            if (userProfile?.providers) {
                const providerIds = userProfile.providers.map(provider => `${provider}.com`);
                setLinkedProviders(providerIds);
            } else {
                const providers = await accountLinkingService.getLinkedProviders(user.email);
                setLinkedProviders(providers);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener proveedores vinculados';
            setError(errorMessage);
            console.error('Error fetching linked providers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.email) {
            refreshLinkedProviders();
        } else {
            setLinkedProviders([]);
            setError(null);
        }
    }, [user?.email, userProfile?.providers]);

    return {
        linkedProviders,
        isLoading,
        error,
        refreshLinkedProviders,
    };
};

/**
 * Maps Firebase provider IDs to user-friendly names
 */
export const getProviderDisplayName = (providerId: string): string => {
    const providerMap: Record<string, string> = {
        'google.com': 'Google',
        'github.com': 'GitHub',
        'apple.com': 'Apple',
        'facebook.com': 'Facebook',
        'twitter.com': 'Twitter',
    };

    return providerMap[providerId] || providerId;
};

/**
 * Maps Firebase provider IDs to our AuthProviderType
 */
export const mapFirebaseProviderToType = (providerId: string): AuthProviderType | null => {
    switch (providerId) {
        case 'google.com':
            return 'google';
        case 'github.com':
            return 'github';
        case 'apple.com':
            return 'apple';
        default:
            return null;
    }
};
