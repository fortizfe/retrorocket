import { useState, useCallback, useMemo } from 'react';
import { useBoardEventsContext } from '@/features/boards/retrospective/contexts/BoardEventsProvider';
import { ActionItem, CreateActionItemInput } from '@/features/boards/types/actionItem';
import * as actionItemsApi from '@/features/boards/retrospective/services/actionItemsApiClient';

/**
 * Backend-mediated replacement for actionItemsService.ts's direct Firestore access
 * (feature 017 US3). Called from within RetrospectiveBoard's tree, so it consumes the
 * single shared SSE connection via BoardEventsProvider rather than opening its own.
 */
export function useActionItems(retrospectiveId: string) {
    const [error, setError] = useState<string | null>(null);
    const { snapshot } = useBoardEventsContext();

    const actionItems: ActionItem[] = useMemo(() => {
        const raw = snapshot?.actionItems;
        return raw ? actionItemsApi.parseActionItemsSnapshot(raw as never) : [];
    }, [snapshot?.actionItems]);

    const loading = !!retrospectiveId && snapshot === null;

    const createActionItem = useCallback(async (actionItemInput: CreateActionItemInput) => {
        if (!actionItemInput.content.trim()) return;

        setError(null);
        try {
            await actionItemsApi.createActionItem(retrospectiveId, {
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
            await actionItemsApi.updateActionItem(retrospectiveId, actionItemId, updates);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar elemento de acción');
        }
    }, [retrospectiveId]);

    const deleteActionItem = useCallback(async (actionItemId: string) => {
        setError(null);
        try {
            await actionItemsApi.deleteActionItem(retrospectiveId, actionItemId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al eliminar elemento de acción');
        }
    }, [retrospectiveId]);

    const convertCardToActionItem = useCallback(async (
        cardContent: string,
        _facilitatorId: string,
        assignedTo?: string,
        assignedToName?: string,
        dueDate?: Date | null
    ) => {
        setError(null);
        try {
            await actionItemsApi.convertCardToActionItem(retrospectiveId, cardContent, assignedTo, assignedToName, dueDate);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al convertir tarjeta en elemento de acción');
        }
    }, [retrospectiveId]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        actionItems,
        loading,
        error,
        createActionItem,
        updateActionItem,
        deleteActionItem,
        convertCardToActionItem,
        clearError
    };
}
