import { useState, useEffect, useCallback } from 'react';
import { ActionItem, ActionItemsState, CreateActionItemInput } from '@/features/boards/types/actionItem';
import { ActionItemsService } from '@/features/boards/retrospective/services/actionItemsService';

export function useActionItems(retrospectiveId: string) {
    const [state, setState] = useState<ActionItemsState>({
        actionItems: [],
        loading: false,
        error: null
    });

    // Crear nuevo elemento de acción
    const createActionItem = useCallback(async (actionItemInput: CreateActionItemInput) => {
        if (!actionItemInput.content.trim()) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await ActionItemsService.createActionItem(actionItemInput);
            // Los elementos se actualizarán automáticamente por la suscripción
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al crear elemento de acción'
            }));
        }
    }, []);

    // Actualizar elemento de acción existente
    const updateActionItem = useCallback(async (actionItemId: string, updates: Partial<ActionItem>) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await ActionItemsService.updateActionItem(actionItemId, updates);
            // Los elementos se actualizarán automáticamente por la suscripción
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al actualizar elemento de acción'
            }));
        }
    }, []);

    // Eliminar elemento de acción
    const deleteActionItem = useCallback(async (actionItemId: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await ActionItemsService.deleteActionItem(actionItemId);
            // Los elementos se actualizarán automáticamente por la suscripción
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al eliminar elemento de acción'
            }));
        }
    }, []);

    // Convertir tarjeta a elemento de acción
    const convertCardToActionItem = useCallback(async (
        cardContent: string,
        facilitatorId: string,
        assignedTo?: string,
        assignedToName?: string,
        dueDate?: Date | null
    ) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await ActionItemsService.convertCardToActionItem(
                cardContent,
                retrospectiveId,
                facilitatorId,
                assignedTo,
                assignedToName,
                dueDate
            );
            // Los elementos se actualizarán automáticamente por la suscripción
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error al convertir tarjeta en elemento de acción'
            }));
        }
    }, [retrospectiveId]);

    // Limpiar error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Suscribirse a cambios en los elementos de acción
    useEffect(() => {
        if (!retrospectiveId) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        const unsubscribe = ActionItemsService.subscribeToActionItems(
            retrospectiveId,
            (actionItems: ActionItem[]) => {
                setState({
                    actionItems,
                    loading: false,
                    error: null
                });
            }
        );

        return unsubscribe;
    }, [retrospectiveId]);

    return {
        ...state,
        createActionItem,
        updateActionItem,
        deleteActionItem,
        convertCardToActionItem,
        clearError
    };
}
