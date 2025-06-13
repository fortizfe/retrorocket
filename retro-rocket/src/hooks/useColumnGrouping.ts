import { useState, useCallback, useEffect } from 'react';
import { Card } from '../types/card';
import {
    GroupingCriteria,
    ColumnGroupingState,
    ColumnGroupingStatesStore,
    DEFAULT_GROUPING_STATE
} from '../types/columnGrouping';
import {
    saveColumnGroupingState,
    loadColumnGroupingState
} from '../services/columnGroupingService';

// Hook to manage column grouping state
export const useColumnGrouping = (retrospectiveId?: string) => {
    const [columnStates, setColumnStates] = useState<ColumnGroupingStatesStore>({});
    const [previousStates, setPreviousStates] = useState<ColumnGroupingStatesStore>({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Load state from Firebase when retrospectiveId is available
    useEffect(() => {
        if (retrospectiveId && !isLoaded) {
            loadColumnGroupingState(retrospectiveId)
                .then((loadedStates) => {
                    setColumnStates(loadedStates);
                    setIsLoaded(true);
                })
                .catch((error) => {
                    console.error('Failed to load column grouping state:', error);
                    setIsLoaded(true);
                });
        }
    }, [retrospectiveId, isLoaded]);

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

        // Persist to Firebase if retrospectiveId is available
        if (retrospectiveId) {
            saveColumnGroupingState(retrospectiveId, newStates)
                .catch((error) => {
                    console.error('Failed to save column grouping state:', error);
                });
        }
    }, [getColumnState, columnStates, retrospectiveId]);

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

        // For suggestions, return ungrouped for now
        // This will be handled by the existing group system
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
