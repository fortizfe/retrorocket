import { useEffect, useState, useCallback } from 'react';
import {
    getParticipantsByRetrospective,
    subscribeToParticipants,
    addParticipant as addParticipantService,
    removeParticipant as removeParticipantService,
    setParticipantInactive,
    CreateParticipantInput
} from '../services/participantService';
import { Participant } from '../types/participant';

interface UseParticipantsReturn {
    participants: Participant[];
    loading: boolean;
    error: string | null;
    addParticipant: (participantInput: CreateParticipantInput) => Promise<{ id: string; isNew: boolean }>;
    removeParticipant: (participantId: string) => Promise<void>;
    setInactive: (participantId: string) => Promise<void>;
    refetch: () => Promise<void>;
}

export const useParticipants = (retrospectiveId?: string): UseParticipantsReturn => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchParticipants = useCallback(async () => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const fetchedParticipants = await getParticipantsByRetrospective(retrospectiveId);
            setParticipants(fetchedParticipants);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching participants');
            setParticipants([]);
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
        const unsubscribe = subscribeToParticipants(retrospectiveId, (fetchedParticipants) => {
            setParticipants(fetchedParticipants);
            setLoading(false);
            setError(null);
        });

        return () => unsubscribe();
    }, [retrospectiveId]);

    const addParticipant = useCallback(async (participantInput: CreateParticipantInput): Promise<{ id: string; isNew: boolean }> => {
        try {
            setError(null);
            const result = await addParticipantService(participantInput);
            // The subscription will handle updating the local state
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error adding participant';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const removeParticipant = useCallback(async (participantId: string): Promise<void> => {
        try {
            setError(null);
            await removeParticipantService(participantId);
            // The subscription will handle updating the local state
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error removing participant';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const setInactive = useCallback(async (participantId: string): Promise<void> => {
        try {
            setError(null);
            await setParticipantInactive(participantId);
            // The subscription will handle updating the local state
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error setting participant inactive';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    return {
        participants,
        loading,
        error,
        addParticipant,
        removeParticipant,
        setInactive,
        refetch: fetchParticipants
    };
};

export default useParticipants;