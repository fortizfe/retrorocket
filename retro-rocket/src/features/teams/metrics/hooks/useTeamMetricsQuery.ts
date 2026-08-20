import { useCallback, useEffect, useState } from 'react';
import { getTeamMetrics } from '../services/backendTeamMetricsClient';
import type { TeamMetricsSummary } from '../types/teamMetrics';

/**
 * Fetches one team's aggregated retrospective metrics (`GET /api/teams/:id/metrics`,
 * spec 056 User Story 1) and tracks loading/error state, mirroring `useTeamQuery.ts`'s
 * exact pattern (spec 054) — `team` renamed to `metrics` for this domain. `TeamMetricsPanel`
 * (T014) needs `refetch` so its error-state retry button can re-run the fetch without
 * duplicating the fetch logic itself.
 */
export interface UseTeamMetricsQueryResult {
    /** The team's aggregated metrics, most-recently-fetched. `null` while loading or on error. */
    metrics: TeamMetricsSummary | null;
    loading: boolean;
    /** True when the most recent fetch attempt failed. Cleared on the next attempt. */
    error: boolean;
    /** Re-runs the fetch (e.g. after a failed attempt). Resolves once the attempt settles. */
    refetch: () => Promise<void>;
}

export function useTeamMetricsQuery(teamId: string | undefined): UseTeamMetricsQueryResult {
    const [metrics, setMetrics] = useState<TeamMetricsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const refetch = useCallback(async () => {
        if (!teamId) {
            setMetrics(null);
            setLoading(false);
            setError(true);
            return;
        }
        setLoading(true);
        setError(false);
        try {
            const result = await getTeamMetrics(teamId);
            setMetrics(result);
        } catch (err) {
            console.error('Error loading team metrics:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { metrics, loading, error, refetch };
}
