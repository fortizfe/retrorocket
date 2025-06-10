import { useEffect, useState, useCallback } from 'react';
import {
    getRetrospective,
    updateRetrospective as updateRetrospectiveService,
    subscribeToRetrospective,
    CreateRetrospectiveInput,
    createRetrospective as createRetrospectiveService
} from '../services/retrospectiveService';
import { Retrospective } from '../types/retrospective';

interface UseRetrospectiveReturn {
    retrospective: Retrospective | null;
    loading: boolean;
    error: string | null;
    updateRetrospective: (updates: Partial<Retrospective>) => Promise<void>;
    createRetrospective: (data: CreateRetrospectiveInput) => Promise<string>;
    refetch: () => Promise<void>;
}

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
            const data = await getRetrospective(retrospectiveId);
            setRetrospective(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching retrospective data');
            setRetrospective(null);
        } finally {
            setLoading(false);
        }
    }, [retrospectiveId]);

    useEffect(() => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }

        // Set up real-time subscription
        const unsubscribe = subscribeToRetrospective(retrospectiveId, (data) => {
            setRetrospective(data);
            setLoading(false);
            if (!data) {
                setError('Retrospective not found');
            } else {
                setError(null);
            }
        });

        return () => unsubscribe();
    }, [retrospectiveId]);

    const updateRetrospective = useCallback(async (updates: Partial<Retrospective>) => {
        if (!retrospectiveId) {
            throw new Error('No retrospective ID provided');
        }

        try {
            setError(null);
            await updateRetrospectiveService(retrospectiveId, updates);
            // The subscription will handle updating the local state
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error updating retrospective';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId]);

    const createRetrospective = useCallback(async (data: CreateRetrospectiveInput): Promise<string> => {
        try {
            setLoading(true);
            setError(null);
            const newId = await createRetrospectiveService(data);
            return newId;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error creating retrospective';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        retrospective,
        loading,
        error,
        updateRetrospective,
        createRetrospective,
        refetch: fetchRetrospective
    };
};

export default useRetrospective;