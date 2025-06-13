import { useState, useCallback } from 'react';
import { Card } from '../types/card';
import {
    GroupingCriteria,
    ColumnGroupingState,
    ColumnGroupingStatesStore,
    DEFAULT_GROUPING_STATE
} from '../types/columnGrouping';

// Hook to manage column grouping state
export const useColumnGrouping = () => {
    const [columnStates, setColumnStates] = useState<ColumnGroupingStatesStore>({});
    const [previousStates, setPreviousStates] = useState<ColumnGroupingStatesStore>({});

    // Get state for a specific column
    const getColumnState = useCallback((columnId: string): ColumnGroupingState => {
        return columnStates[columnId] || DEFAULT_GROUPING_STATE;
    }, [columnStates]);

    // Update grouping criteria for a column
    const setGroupingCriteria = useCallback((columnId: string, criteria: GroupingCriteria) => {
        const currentState = getColumnState(columnId);

        // Store previous state only when moving to 'custom' or 'suggestions' from a different state
        if ((criteria === 'custom' || criteria === 'suggestions') &&
            currentState.criteria !== criteria &&
            currentState.criteria !== 'custom' &&
            currentState.criteria !== 'suggestions') {
            setPreviousStates(prev => ({
                ...prev,
                [columnId]: currentState
            }));
        }

        setColumnStates(prev => ({
            ...prev,
            [columnId]: {
                ...currentState,
                criteria
            }
        }));
    }, [getColumnState]);

    // Group cards by criteria
    const groupCards = useCallback((cards: Card[], criteria: GroupingCriteria) => {
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

            // Sort group keys alphabetically
            const sortedGroupKeys = Object.keys(groups).sort((a, b) =>
                a.localeCompare(b, 'es')
            );

            const sortedGroups: { [key: string]: Card[] } = {};
            sortedGroupKeys.forEach(key => {
                sortedGroups[key] = groups[key];
            });

            return sortedGroups;
        }

        // For custom and suggestions, return ungrouped for now
        // These will be handled by the existing group system
        return { ungrouped: cards };
    }, []);

    // Process cards with grouping
    const processCards = useCallback((
        cards: Card[],
        columnId: string
    ): { [groupName: string]: Card[] } => {
        const state = getColumnState(columnId);
        return groupCards(cards, state.criteria);
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
