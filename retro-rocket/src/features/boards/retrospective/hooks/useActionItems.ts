import { useCallback, useState } from 'react';
import { ActionItem, CreateActionItemInput } from '@/features/boards/types/actionItem';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';

/**
 * Hook to manage action items. `actionItems` is sourced from
 * useRetrospectiveRealtimeSync's board state (feature 019, US6) — kept live via
 * 'actionItem' entity_change events — replacing this hook's own onSnapshot
 * subscription. All writes (direct create/edit/delete, FR-015, and convert-from-card,
 * US5/FR-014) go through backendRetrospectiveClient; no ownership restriction on
 * edit/delete — any authenticated participant may manage any action item.
 */
export function useActionItems(retrospectiveId: string, actionItems: ActionItem[] = []) {
    const [error, setError] = useState<string | null>(null);

    const createActionItem = useCallback(async (actionItemInput: CreateActionItemInput) => {
        if (!actionItemInput.content.trim()) return;

        setError(null);
        try {
            await backendRetrospectiveClient.createActionItem(retrospectiveId, {
                content: actionItemInput.content,
                assignedTo: actionItemInput.assignedTo,
                assignedToName: actionItemInput.assignedToName,
                dueDate: actionItemInput.dueDate,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear elemento de acción');
        }
    }, [retrospectiveId]);

    const updateActionItem = useCallback(async (actionItemId: string, updates: Partial<ActionItem>) => {
        setError(null);
        try {
            await backendRetrospectiveClient.editActionItem(actionItemId, {
                content: updates.content,
                assignedTo: updates.assignedTo,
                assignedToName: updates.assignedToName,
                dueDate: updates.dueDate,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar elemento de acción');
        }
    }, []);

    const deleteActionItem = useCallback(async (actionItemId: string) => {
        setError(null);
        try {
            await backendRetrospectiveClient.deleteActionItem(actionItemId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al eliminar elemento de acción');
        }
    }, []);

    // Convertir tarjeta a elemento de acción — backend-mediated (feature 019, US5):
    // facilitator-only, content read server-side from the card itself (FR-014).
    const convertCardToActionItem = useCallback(async (
        cardId: string,
        assignedTo?: string,
        assignedToName?: string,
        dueDate?: Date | null
    ) => {
        setError(null);
        try {
            await backendRetrospectiveClient.convertCardToActionItem(cardId, { assignedTo, assignedToName, dueDate });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al convertir tarjeta en elemento de acción');
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        actionItems,
        loading: false,
        error,
        createActionItem,
        updateActionItem,
        deleteActionItem,
        convertCardToActionItem,
        clearError
    };
}
