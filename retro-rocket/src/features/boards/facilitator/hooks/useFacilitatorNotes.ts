import { useState, useEffect, useCallback } from 'react';
import { useBoardEvents } from '@/lib/hooks/useBoardEvents';
import { FacilitatorNote, FacilitatorNotesState } from '@/features/boards/types/facilitatorNotes';
import * as facilitatorNotesApi from '@/features/boards/facilitator/services/facilitatorNotesApiClient';

/**
 * Backend-mediated replacement for facilitatorNotesService.ts's direct Firestore access
 * (feature 017 US3). Like useCountdown/useParticipants, this hook is used outside
 * RetrospectiveBoard's tree (facilitator menu in the topbar) and by the export popovers,
 * so it opens its own SSE connection. The `notes` snapshot key is present only when this
 * connection belongs to the board's own facilitator (backend-enforced, research.md §1) —
 * a non-facilitator simply never receives it, so `notes` stays empty for them.
 */
export function useFacilitatorNotes(retrospectiveId: string, facilitatorId: string) {
    const [state, setState] = useState<FacilitatorNotesState>({
        notes: [],
        loading: false,
        error: null
    });

    useBoardEvents(retrospectiveId || undefined, {
        onSnapshot: (data) => {
            const raw = (data as { notes?: Array<Record<string, unknown>> }).notes ?? [];
            setState({ notes: facilitatorNotesApi.parseNotesSnapshot(raw as never), loading: false, error: null });
        },
        on: {
            notes: (data) => {
                setState((prev) => ({ ...prev, notes: facilitatorNotesApi.parseNotesSnapshot((data as Array<Record<string, unknown>>) as never), loading: false }));
            },
        },
    });

    useEffect(() => {
        if (!retrospectiveId || !facilitatorId) return;
        setState((prev) => ({ ...prev, loading: true, error: null }));
    }, [retrospectiveId, facilitatorId]);

    const createNote = useCallback(async (content: string) => {
        if (!content.trim()) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await facilitatorNotesApi.createNote(retrospectiveId, content.trim());
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al crear la nota'
            }));
        }
    }, [retrospectiveId]);

    const updateNote = useCallback(async (noteId: string, content: string) => {
        if (!content.trim()) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await facilitatorNotesApi.updateNote(retrospectiveId, noteId, content.trim());
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al actualizar la nota'
            }));
        }
    }, [retrospectiveId]);

    const deleteNote = useCallback(async (noteId: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await facilitatorNotesApi.deleteNote(retrospectiveId, noteId);
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al eliminar la nota'
            }));
        }
    }, [retrospectiveId]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        ...state,
        createNote,
        updateNote,
        deleteNote,
        clearError
    };
}
