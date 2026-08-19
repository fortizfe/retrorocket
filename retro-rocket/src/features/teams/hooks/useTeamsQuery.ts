import { useCallback, useEffect, useState } from 'react';
import { listTeams } from '../services/backendTeamsClient';
import type { TeamSummary } from '../types/team';

/**
 * Fetches the caller's teams overview (`GET /api/teams`, FR-010) and tracks
 * loading/error state, mirroring the inline load pattern `Dashboard.tsx` uses
 * for `listBoards()` (spec 054 tasks.md T016) but packaged as a reusable hook
 * since `Teams.tsx` (T018) needs to trigger the same fetch again after a
 * successful `createTeam` call — the `refetch` handle is exactly that.
 */
export interface UseTeamsQueryResult {
    /** The caller's teams, most-recently-fetched. Empty array while loading or on error. */
    teams: TeamSummary[];
    loading: boolean;
    /** True when the most recent fetch attempt failed. Cleared on the next attempt. */
    error: boolean;
    /** Re-runs the fetch (e.g. after creating a team). Resolves once the attempt settles. */
    refetch: () => Promise<void>;
}

export function useTeamsQuery(): UseTeamsQueryResult {
    const [teams, setTeams] = useState<TeamSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await listTeams();
            setTeams(result);
        } catch (err) {
            console.error('Error loading teams:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { teams, loading, error, refetch };
}
