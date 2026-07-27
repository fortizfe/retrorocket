import { useEffect, useState, useCallback } from 'react';
import { useBoardEvents } from '@/lib/hooks/useBoardEvents';
import { joinBoard, parseParticipantsSnapshot } from '@/features/boards/participants/services/participantsApiClient';
import { Participant } from '@/features/boards/types/participant';

interface UseParticipantsReturn {
    participants: Participant[];
    loading: boolean;
    error: string | null;
    addParticipant: () => Promise<{ id: string; isNew: boolean }>;
    refetch: () => Promise<void>;
}

/**
 * Backend-mediated replacement for participantService.ts's read path (feature 017 US2):
 * participants now arrive over the board's SSE channel instead of a Firestore `onSnapshot`
 * listener. This hook is used both inside and outside RetrospectiveBoard's tree (topbar,
 * join panel), so it opens its own connection rather than consuming BoardEventsProvider's
 * shared one.
 */
export const useParticipants = (retrospectiveId?: string): UseParticipantsReturn => {
    const [rawParticipants, setRawParticipants] = useState<Array<Record<string, unknown>> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { connectionState } = useBoardEvents(retrospectiveId, {
        onSnapshot: (data) => setRawParticipants((data as { participants: Array<Record<string, unknown>> }).participants),
        on: {
            participants: (data) => setRawParticipants(data as Array<Record<string, unknown>>),
        },
    });

    useEffect(() => {
        if (!retrospectiveId) setRawParticipants(null);
    }, [retrospectiveId]);

    const participants = rawParticipants ? parseParticipantsSnapshot(rawParticipants as never) : [];
    const loading = !!retrospectiveId && rawParticipants === null && connectionState !== 'reconnecting';

    const addParticipant = useCallback(async (): Promise<{ id: string; isNew: boolean }> => {
        if (!retrospectiveId) throw new Error('Missing retrospectiveId');
        try {
            setError(null);
            return await joinBoard(retrospectiveId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error adding participant';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId]);

    return {
        participants,
        loading,
        error,
        addParticipant,
        refetch: async () => {}
    };
};

export default useParticipants;
