import { useState, useEffect, useCallback } from 'react';
import { CardGroup, Card, GroupSuggestion } from '../types/card';
import { ColumnType } from '../types/retrospective';
import {
    createCardGroup,
    disbandCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    updateGroupCollapseState,
    subscribeToRetrospectiveGroups,
    calculateGroupAggregations
} from '../services/cardGroupService';
import { findSimilarCardGroups, SimilarityConfig } from '../services/similarityService';

interface UseCardGroupsProps {
    retrospectiveId: string;
    cards: Card[];
    currentUser?: string;
}

interface UseCardGroupsReturn {
    groups: CardGroup[];
    groupedCards: Card[];
    ungroupedCards: Card[];
    loading: boolean;
    error: string | null;

    // Group management
    createGroup: (headCardId: string, memberCardIds: string[], customTitle?: string) => Promise<string>;
    disbandGroup: (groupId: string) => Promise<void>;
    addToGroup: (groupId: string, cardId: string) => Promise<void>;
    removeFromGroup: (cardId: string) => Promise<void>;
    toggleGroupCollapse: (groupId: string) => Promise<void>;

    // Similarity detection
    findSuggestions: (config?: Partial<SimilarityConfig>) => GroupSuggestion[];
    acceptSuggestion: (suggestion: GroupSuggestion) => Promise<string>;

    // Helper functions
    getGroupByCardId: (cardId: string) => CardGroup | null;
    getCardsInGroup: (groupId: string) => Card[];
    getCardsByColumn: (column: ColumnType, includeGrouped?: boolean) => Card[];
}

export const useCardGroups = ({
    retrospectiveId,
    cards,
    currentUser
}: UseCardGroupsProps): UseCardGroupsReturn => {
    const [groups, setGroups] = useState<CardGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to groups
    useEffect(() => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToRetrospectiveGroups(retrospectiveId, (fetchedGroups) => {
            // Calculate aggregations for each group
            const groupsWithAggregations = fetchedGroups.map(group => {
                const groupCards = cards.filter(card =>
                    card.id === group.headCardId || group.memberCardIds.includes(card.id)
                );
                return calculateGroupAggregations(group, groupCards);
            });

            setGroups(groupsWithAggregations);
            setLoading(false);
            setError(null);
        });

        return unsubscribe;
    }, [retrospectiveId, cards]);

    // Separate grouped and ungrouped cards
    const groupedCards = cards.filter(card => card.groupId);
    const ungroupedCards = cards.filter(card => !card.groupId);

    // Group management functions
    const createGroup = useCallback(async (
        headCardId: string,
        memberCardIds: string[],
        customTitle?: string
    ): Promise<string> => {
        console.log('useCardGroups.createGroup called with:', {
            headCardId,
            memberCardIds,
            customTitle,
            currentUser,
            retrospectiveId
        });

        // Check if we have required parameters
        if (!retrospectiveId) {
            console.error('No retrospectiveId provided');
            throw new Error('No retrospectiveId provided');
        }

        if (!headCardId) {
            console.error('No headCardId provided');
            throw new Error('No headCardId provided');
        }

        if (!memberCardIds || memberCardIds.length === 0) {
            console.error('No memberCardIds provided');
            throw new Error('At least one member card is required');
        }

        if (!currentUser) {
            console.error('User not authenticated, currentUser is:', currentUser);
            throw new Error('User not authenticated');
        }

        try {
            setError(null);
            console.log('Calling createCardGroup service...');
            const groupId = await createCardGroup(
                retrospectiveId,
                headCardId,
                memberCardIds,
                currentUser,
                customTitle
            );
            console.log('Group created successfully with ID:', groupId);
            return groupId;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
            console.error('Error in createGroup:', err);
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId, currentUser]);

    const disbandGroup = useCallback(async (groupId: string): Promise<void> => {
        try {
            setError(null);
            await disbandCardGroup(groupId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to disband group';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const addToGroup = useCallback(async (groupId: string, cardId: string): Promise<void> => {
        try {
            setError(null);
            await addCardToGroup(groupId, cardId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add card to group';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const removeFromGroup = useCallback(async (cardId: string): Promise<void> => {
        try {
            setError(null);
            await removeCardFromGroup(cardId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to remove card from group';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const toggleGroupCollapse = useCallback(async (groupId: string): Promise<void> => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        try {
            setError(null);
            await updateGroupCollapseState(groupId, !group.isCollapsed);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to toggle group collapse';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [groups]);

    // Similarity detection
    const findSuggestions = useCallback((config?: Partial<SimilarityConfig>): GroupSuggestion[] => {
        // Only suggest groups for ungrouped cards
        return findSimilarCardGroups(ungroupedCards, config);
    }, [ungroupedCards]);

    const acceptSuggestion = useCallback(async (suggestion: GroupSuggestion): Promise<string> => {
        if (suggestion.cardIds.length < 2) {
            throw new Error('Suggestion must have at least 2 cards');
        }

        const [headCardId, ...memberCardIds] = suggestion.cardIds;
        return await createGroup(headCardId, memberCardIds);
    }, [createGroup]);

    // Helper functions
    const getGroupByCardId = useCallback((cardId: string): CardGroup | null => {
        return groups.find(group =>
            group.headCardId === cardId || group.memberCardIds.includes(cardId)
        ) || null;
    }, [groups]);

    const getCardsInGroup = useCallback((groupId: string): Card[] => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];

        return cards.filter(card =>
            card.id === group.headCardId || group.memberCardIds.includes(card.id)
        );
    }, [groups, cards]);

    const getCardsByColumn = useCallback((
        column: ColumnType,
        includeGrouped: boolean = false
    ): Card[] => {
        let columnCards = cards.filter(card => card.column === column);

        if (!includeGrouped) {
            columnCards = columnCards.filter(card => !card.groupId);
        }

        return columnCards;
    }, [cards]);

    return {
        groups,
        groupedCards,
        ungroupedCards,
        loading,
        error,

        // Group management
        createGroup,
        disbandGroup,
        addToGroup,
        removeFromGroup,
        toggleGroupCollapse,

        // Similarity detection
        findSuggestions,
        acceptSuggestion,

        // Helper functions
        getGroupByCardId,
        getCardsInGroup,
        getCardsByColumn
    };
};
