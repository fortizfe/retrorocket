import { useCallback, useEffect, useState } from 'react';
import { getTeam } from '../services/backendTeamsClient';
import type { TeamDetail } from '../types/team';

/**
 * Fetches a single team's detail + full member roster (`GET /api/teams/:id`, FR-009) and
 * tracks loading/error state, mirroring `useTeamsQuery.ts`'s pattern (spec 054 tasks.md
 * T034). `TeamDetail.tsx` (T038) needs `refetch` to re-pull the roster after every
 * membership action (add/remove/leave) lands, and after a `teamEmptied` navigation-away
 * so the page component itself doesn't need to duplicate the fetch logic.
 */
export interface UseTeamQueryResult {
    /** The team's detail + roster, most-recently-fetched. `null` while loading or on error. */
    team: TeamDetail | null;
    loading: boolean;
    /** True when the most recent fetch attempt failed. Cleared on the next attempt. */
    error: boolean;
    /** Re-runs the fetch (e.g. after adding/removing a member). Resolves once the attempt settles. */
    refetch: () => Promise<void>;
}

export function useTeamQuery(teamId: string | undefined): UseTeamQueryResult {
    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const refetch = useCallback(async () => {
        if (!teamId) {
            setTeam(null);
            setLoading(false);
            setError(true);
            return;
        }
        setLoading(true);
        setError(false);
        try {
            const result = await getTeam(teamId);
            setTeam(result);
        } catch (err) {
            console.error('Error loading team:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { team, loading, error, refetch };
}
