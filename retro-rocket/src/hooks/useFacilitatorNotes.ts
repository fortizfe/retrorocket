import { useState, useEffect, useCallback } from 'react';
import { FacilitatorNote, FacilitatorNotesState } from '../types/facilitatorNotes';
import { FacilitatorNotesService } from '../services/facilitatorNotesService';

export function useFacilitatorNotes(retrospectiveId: string, facilitatorId: string) {
    const [state, setState] = useState<FacilitatorNotesState>({
        notes: [],
        loading: false,
        error: null
    });

    // Crear nueva nota
    const createNote = useCallback(async (content: string) => {
        if (!content.trim()) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await FacilitatorNotesService.createNote(retrospectiveId, facilitatorId, content.trim());
            // Las notas se actualizarán automáticamente por la suscripción
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al crear la nota'
            }));
        }
    }, [retrospectiveId, facilitatorId]);

    // Actualizar nota existente
    const updateNote = useCallback(async (noteId: string, content: string) => {
        if (!content.trim()) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await FacilitatorNotesService.updateNote(noteId, content.trim());
            // Las notas se actualizarán automáticamente por la suscripción
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al actualizar la nota'
            }));
        }
    }, []);

    // Eliminar nota
    const deleteNote = useCallback(async (noteId: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await FacilitatorNotesService.deleteNote(noteId);
            // Las notas se actualizarán automáticamente por la suscripción
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al eliminar la nota'
            }));
        }
    }, []);

    // Limpiar error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Suscribirse a cambios en las notas
    useEffect(() => {
        if (!retrospectiveId || !facilitatorId) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        const unsubscribe = FacilitatorNotesService.subscribeToNotes(
            retrospectiveId,
            facilitatorId,
            (notes: FacilitatorNote[]) => {
                setState({
                    notes,
                    loading: false,
                    error: null
                });
            }
        );

        return unsubscribe;
    }, [retrospectiveId, facilitatorId]);

    return {
        ...state,
        createNote,
        updateNote,
        deleteNote,
        clearError
    };
}
