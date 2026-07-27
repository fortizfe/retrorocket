import { useEffect, useState, useCallback } from 'react';
import * as boardsApi from '@/features/boards/retrospective/services/boardsApiClient';
import { Retrospective } from '@/features/boards/types/retrospective';

interface UseRetrospectiveReturn {
    retrospective: Retrospective | null;
    loading: boolean;
    error: string | null;
    updateRetrospective: (updates: Partial<Retrospective>) => Promise<void>;
    refetch: () => Promise<void>;
}

/**
 * Backend-mediated replacement for retrospectiveService.ts's direct Firestore access
 * (feature 017 US4). `GET /api/boards/:id` is a one-time fetch by design
 * (contracts/boards-api.md) — live updates come from the board's SSE channel
 * (BoardEventsProvider's `board` event), consumed separately within RetrospectiveBoard's
 * tree; this hook is used at the page/topbar level, outside that tree.
 */
export const useRetrospective = (retrospectiveId?: string): UseRetrospectiveReturn => {
    const [retrospective, setRetrospective] = useState<Retrospective | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRetrospective = useCallback(async () => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await boardsApi.getBoard(retrospectiveId);
            setRetrospective(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching retrospective data');
            setRetrospective(null);
        } finally {
            setLoading(false);
        }
    }, [retrospectiveId]);

    useEffect(() => {
        fetchRetrospective();
    }, [fetchRetrospective]);

    const updateRetrospective = useCallback(async (updates: Partial<Retrospective>) => {
        if (!retrospectiveId) {
            throw new Error('No retrospective ID provided');
        }

        try {
            setError(null);
            const updated = await boardsApi.renameBoard(retrospectiveId, {
                title: updates.title,
                description: updates.description,
            });
            setRetrospective(updated);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error updating retrospective';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId]);

    return {
        retrospective,
        loading,
        error,
        updateRetrospective,
        refetch: fetchRetrospective
    };
};

export default useRetrospective;
