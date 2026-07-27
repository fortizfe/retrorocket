import { useEffect, useState, useCallback } from 'react';
import { backendApiClient } from '@/lib/services/backendApiClient';

interface HealthStatus {
    status: 'ok' | 'degraded';
    version: string;
    time: string;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Compares the backend's currently-deployed version (GET /api/health, echoing
 * BACKEND_VERSION) against this bundle's own build-time version (__APP_VERSION__,
 * from package.json). A stale client that hasn't reloaded since a new deploy shows a
 * mismatch — surfaced as an explicit "please reload" banner (spec.md Edge Cases:
 * "stale frontend build after the atomic cutover") rather than relying solely on the
 * stale client's now-denied Firestore calls to fail safely (feature 017 T119).
 */
export function useBackendVersion(): { isStale: boolean } {
    const [backendVersion, setBackendVersion] = useState<string | null>(null);

    const checkVersion = useCallback(async () => {
        try {
            const health = await backendApiClient.get<HealthStatus>('/api/health');
            setBackendVersion(health.version);
        } catch {
            // Best-effort only — a failed health check should never itself surface an error.
        }
    }, []);

    useEffect(() => {
        checkVersion();
        const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
        const onVisible = () => {
            if (document.visibilityState === 'visible') checkVersion();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [checkVersion]);

    const isStale = backendVersion !== null && backendVersion !== __APP_VERSION__;

    return { isStale };
}
