import { useState, useEffect, useCallback } from 'react';
import { CardGroup, Card, GroupSuggestion, Reaction } from '@/features/boards/types/card';
import { ColumnType } from '@/features/boards/types/retrospective';
import { useBoardEventsContext } from '@/features/boards/retrospective/contexts/BoardEventsProvider';
import {
    createCardGroup,
    disbandCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    updateGroupCollapseState,
    parseGroupsSnapshot,
} from '@/features/boards/clustering/services/cardGroupsApiClient';
import { findSimilarCardGroups, SimilarityConfig } from '@/features/boards/clustering/services/similarityService';

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

/** Computes totalVotes/totalLikes/allReactions client-side, matching cardGroupService.ts's original calculateGroupAggregations. */
function withAggregations(group: CardGroup, groupCards: Card[]): CardGroup {
    const totalVotes = groupCards.reduce((sum, c) => sum + (c.votes ?? 0), 0);
    const totalLikes = groupCards.reduce((sum, c) => sum + (c.likes?.length ?? 0), 0);
    const allReactions: Reaction[] = groupCards.flatMap((c) => c.reactions ?? []);
    return { ...group, totalVotes, totalLikes, allReactions };
}

/**
 * Backend-mediated replacement for the direct-Firestore version of this hook (feature 017
 * US2). Groups now arrive over the board's SSE channel instead of a raw Firestore listener.
 */
export const useCardGroups = ({ retrospectiveId, cards, currentUser }: UseCardGroupsProps): UseCardGroupsReturn => {
    const [rawGroups, setRawGroups] = useState<CardGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { snapshot } = useBoardEventsContext();
    const rawGroupsData = snapshot?.groups;

    useEffect(() => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }
        if (rawGroupsData) {
            setRawGroups(parseGroupsSnapshot(rawGroupsData as Parameters<typeof parseGroupsSnapshot>[0]));
            setLoading(false);
            setError(null);
        }
    }, [retrospectiveId, rawGroupsData]);

    const groups = rawGroups.map((group) => {
        const groupCards = cards.filter((card) => card.id === group.headCardId || group.memberCardIds.includes(card.id));
        return withAggregations(group, groupCards);
    });

    const groupedCards = cards.filter((card) => card.groupId);
    const ungroupedCards = cards.filter((card) => !card.groupId);

    const createGroup = useCallback(async (
        headCardId: string,
        memberCardIds: string[],
        customTitle?: string,
    ): Promise<string> => {
        if (!retrospectiveId) throw new Error('No retrospectiveId provided');
        if (!headCardId) throw new Error('No headCardId provided');
        if (!memberCardIds || memberCardIds.length === 0) throw new Error('At least one member card is required');
        if (!currentUser) throw new Error('User not authenticated');

        try {
            setError(null);
            const group = await createCardGroup(retrospectiveId, headCardId, memberCardIds, currentUser, customTitle);
            return group.id;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId, currentUser]);

    const disbandGroup = useCallback(async (groupId: string): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            await disbandCardGroup(retrospectiveId, groupId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to disband group';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId]);

    const addToGroup = useCallback(async (groupId: string, cardId: string): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            await addCardToGroup(retrospectiveId, groupId, cardId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add card to group';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId]);

    const removeFromGroup = useCallback(async (cardId: string): Promise<void> => {
        if (!retrospectiveId) return;
        const group = rawGroups.find((g) => g.headCardId === cardId || g.memberCardIds.includes(cardId));
        if (!group) return;
        try {
            setError(null);
            await removeCardFromGroup(retrospectiveId, group.id, cardId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to remove card from group';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId, rawGroups]);

    const toggleGroupCollapse = useCallback(async (groupId: string): Promise<void> => {
        if (!retrospectiveId) return;
        const group = rawGroups.find((g) => g.id === groupId);
        if (!group) return;

        try {
            setError(null);
            await updateGroupCollapseState(retrospectiveId, groupId, !group.isCollapsed);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to toggle group collapse';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [retrospectiveId, rawGroups]);

    const findSuggestions = useCallback((config?: Partial<SimilarityConfig>): GroupSuggestion[] => {
        return findSimilarCardGroups(ungroupedCards, config);
    }, [ungroupedCards]);

    const acceptSuggestion = useCallback(async (suggestion: GroupSuggestion): Promise<string> => {
        if (suggestion.cardIds.length < 2) {
            throw new Error('Suggestion must have at least 2 cards');
        }
        const [headCardId, ...memberCardIds] = suggestion.cardIds;
        return await createGroup(headCardId, memberCardIds);
    }, [createGroup]);

    const getGroupByCardId = useCallback((cardId: string): CardGroup | null => {
        return groups.find((group) => group.headCardId === cardId || group.memberCardIds.includes(cardId)) || null;
    }, [groups]);

    const getCardsInGroup = useCallback((groupId: string): Card[] => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return [];
        return cards.filter((card) => card.id === group.headCardId || group.memberCardIds.includes(card.id));
    }, [groups, cards]);

    const getCardsByColumn = useCallback((column: ColumnType, includeGrouped: boolean = false): Card[] => {
        let columnCards = cards.filter((card) => card.column === column);
        if (!includeGrouped) columnCards = columnCards.filter((card) => !card.groupId);
        return columnCards;
    }, [cards]);

    return {
        groups,
        groupedCards,
        ungroupedCards,
        loading,
        error,
        createGroup,
        disbandGroup,
        addToGroup,
        removeFromGroup,
        toggleGroupCollapse,
        findSuggestions,
        acceptSuggestion,
        getGroupByCardId,
        getCardsInGroup,
        getCardsByColumn,
    };
};
