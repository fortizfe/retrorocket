import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import {
    GroupingCriteria,
    ColumnGroupingState,
    ColumnGroupingStatesStore,
    DEFAULT_GROUPING_STATE
} from '@/features/boards/types/columnGrouping';
import { saveColumnGroupingState } from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { resolveAuthorDisplayName } from '@/lib/utils/cardHelpers';

/**
 * Hook to manage column grouping state. `initialState` is sourced from
 * useRetrospectiveRealtimeSync's `board.columnGroupingStates` (feature 019, US4) —
 * already loaded as part of GetBoardState and kept live via 'retrospective'
 * entity_change events, replacing this hook's own load-on-mount Firestore read.
 * Writes go through backendRetrospectiveClient.saveColumnGroupingState().
 */
export const useColumnGrouping = (retrospectiveId?: string, initialState?: ColumnGroupingStatesStore) => {
    const [columnStates, setColumnStates] = useState<ColumnGroupingStatesStore>(initialState ?? {});
    const [previousStates, setPreviousStates] = useState<ColumnGroupingStatesStore>({});
    const { t } = useTranslation();

    // Re-sync local state whenever the live board value changes (e.g. another
    // participant changed the grouping preference, or the initial load completed).
    useEffect(() => {
        if (initialState) setColumnStates(initialState);
    }, [initialState]);

    // Get state for a specific column
    const getColumnState = useCallback((columnId: string): ColumnGroupingState => {
        return columnStates[columnId] || DEFAULT_GROUPING_STATE;
    }, [columnStates]);

    // Update grouping criteria for a column
    const setGroupingCriteria = useCallback((columnId: string, criteria: GroupingCriteria) => {
        const currentState = getColumnState(columnId);

        // Store previous state only when moving to 'suggestions' from a different state
        if (criteria === 'suggestions' && currentState.criteria !== 'suggestions') {
            setPreviousStates(prev => ({
                ...prev,
                [columnId]: currentState
            }));
        }

        const newStates = {
            ...columnStates,
            [columnId]: {
                ...currentState,
                criteria
            }
        };

        setColumnStates(newStates);

        if (retrospectiveId) {
            saveColumnGroupingState(retrospectiveId, newStates)
                .catch((error) => {
                    console.error('Failed to save column grouping state:', error);
                });
        }
    }, [getColumnState, columnStates, retrospectiveId]);

    // Group cards by criteria. `participants` is used to resolve a display name for
    // groups whose cards predate the createdByName capture (legacy cards) — see
    // resolveAuthorDisplayName (cardHelpers.ts). The object's keys stay uid-based
    // (or the 'Sin autor' sentinel) so two authors sharing a display name never
    // collapse into one group; only the sort order is name-based.
    const groupCards = useCallback((cards: Card[], criteria: GroupingCriteria, participants?: Participant[]) => {
        if (criteria === 'none') {
            return { ungrouped: cards };
        }

        if (criteria === 'user') {
            const groups: { [key: string]: Card[] } = {};

            cards.forEach(card => {
                const key = card.createdBy || 'Sin autor';
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(card);
            });

            const fallbackLabel = t('retrospective.grouping.unknownAuthor');
            const displayLabelOf = (key: string): string =>
                resolveAuthorDisplayName(groups[key][0], participants, fallbackLabel);

            // Sort group keys alphabetically by resolved display name, not by the
            // raw key, so the visible order matches what's now shown on screen.
            const sortedGroupKeys = Object.keys(groups).sort((a, b) =>
                displayLabelOf(a).localeCompare(displayLabelOf(b), 'es')
            );

            const sortedGroups: { [key: string]: Card[] } = {};
            sortedGroupKeys.forEach(key => {
                sortedGroups[key] = groups[key];
            });

            return sortedGroups;
        }

        // For suggestions, return ungrouped for now
        // This will be handled by the existing group system
        return { ungrouped: cards };
    }, [t]);

    // Process cards with grouping
    const processCards = useCallback((
        cards: Card[],
        columnId: string,
        participants?: Participant[]
    ): { [groupName: string]: Card[] } => {
        const state = getColumnState(columnId);
        return groupCards(cards, state.criteria, participants);
    }, [getColumnState, groupCards]);

    // Reset grouping for a column
    const resetGrouping = useCallback((columnId: string) => {
        setColumnStates(prev => ({
            ...prev,
            [columnId]: DEFAULT_GROUPING_STATE
        }));
    }, []);

    // Restore previous state for a column (rollback functionality)
    const restorePreviousState = useCallback((columnId: string) => {
        const previousState = previousStates[columnId];
        if (previousState) {
            setColumnStates(prev => ({
                ...prev,
                [columnId]: previousState
            }));
            // Clean up the previous state after restoration
            setPreviousStates(prev => {
                const { [columnId]: removed, ...rest } = prev;
                return rest;
            });
        } else {
            // If no previous state, reset to default
            resetGrouping(columnId);
        }
    }, [previousStates, resetGrouping]);

    return {
        getColumnState,
        setGroupingCriteria,
        processCards,
        resetGrouping,
        restorePreviousState,
        groupCards
    };
};
