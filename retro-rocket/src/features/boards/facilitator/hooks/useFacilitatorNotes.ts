import { useCallback, useState } from 'react';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import type { FacilitatorNote } from '@/features/boards/retrospective/services/backendRetrospectiveClient';

/**
 * Hook to manage the caller's private facilitator notes. `notes` is sourced from
 * useRetrospectiveRealtimeSync's board state (feature 019, US5) — kept live via
 * 'facilitatorNote' entity_change events, never another facilitator's (FR-013) —
 * replacing this hook's own onSnapshot subscription. Writes go through
 * backendRetrospectiveClient, which enforces author-only edit/delete server-side.
 */
export function useFacilitatorNotes(retrospectiveId: string, facilitatorId: string, notes: FacilitatorNote[]) {
    const [error, setError] = useState<string | null>(null);

    const createNote = useCallback(async (content: string) => {
        if (!content.trim()) return;

        setError(null);
        try {
            await backendRetrospectiveClient.createNote(retrospectiveId, content.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear la nota');
        }
    }, [retrospectiveId]);

    const updateNote = useCallback(async (noteId: string, content: string) => {
        if (!content.trim()) return;

        setError(null);
        try {
            await backendRetrospectiveClient.editNote(noteId, content.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar la nota');
        }
    }, []);

    const deleteNote = useCallback(async (noteId: string) => {
        setError(null);
        try {
            await backendRetrospectiveClient.deleteNote(noteId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al eliminar la nota');
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    void facilitatorId;

    return {
        notes,
        loading: false,
        error,
        createNote,
        updateNote,
        deleteNote,
        clearError,
    };
}
