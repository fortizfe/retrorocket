import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/contexts/useUserContext';
import { fetchConnectedApps, revokeConnectedApp, type ConnectedApp } from '@/features/auth/services/connectedAppsService';

export interface ConnectedAppsInfo {
    connectedApps: ConnectedApp[];
    isLoading: boolean;
    error: string | null;
    /** Connection ids currently mid-revocation, for per-row loading state. */
    revokingIds: string[];
    refresh: () => Promise<void>;
    revoke: (connectionId: string) => Promise<void>;
}

export const useConnectedApps = (): ConnectedAppsInfo => {
    const { user } = useUser();
    const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revokingIds, setRevokingIds] = useState<string[]>([]);

    const refresh = useCallback(async (): Promise<void> => {
        if (!user?.email) return;
        setIsLoading(true);
        setError(null);
        try {
            setConnectedApps(await fetchConnectedApps());
        } catch {
            setError('loadError');
        } finally {
            setIsLoading(false);
        }
    }, [user?.email]);

    const revoke = useCallback(async (connectionId: string): Promise<void> => {
        setRevokingIds((ids) => [...ids, connectionId]);
        try {
            await revokeConnectedApp(connectionId);
            setConnectedApps((apps) => apps.filter((app) => app.id !== connectionId));
        } finally {
            setRevokingIds((ids) => ids.filter((id) => id !== connectionId));
        }
    }, []);

    useEffect(() => {
        if (user?.email) {
            refresh();
        } else {
            setConnectedApps([]);
            setError(null);
        }
    }, [user?.email, refresh]);

    return { connectedApps, isLoading, error, revokingIds, refresh, revoke };
};
