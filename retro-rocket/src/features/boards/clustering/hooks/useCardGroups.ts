import { useCallback, useMemo, useState } from 'react';
import { CardGroup, Card, GroupSuggestion } from '@/features/boards/types/card';
import { ColumnType } from '@/features/boards/types/retrospective';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { calculateGroupAggregations } from '@/features/boards/clustering/services/cardGroupService';
import { findSemanticCardGroups, GroupingConfig } from '@/features/boards/clustering/services/semanticGroupingService';
import { useEmbeddingWorkerManager } from '@/features/boards/clustering/hooks/useEmbeddingWorkerManager';

interface UseCardGroupsProps {
    retrospectiveId: string;
    cards: Card[];
    currentUser?: string;
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US4) —
     * replaces this hook's own Firestore onSnapshot subscription for groups. */
    groups?: CardGroup[];
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

    // AI-based grouping suggestions (spec 044)
    findSuggestions: (config?: Partial<GroupingConfig>) => Promise<GroupSuggestion[]>;
    acceptSuggestion: (suggestion: GroupSuggestion) => Promise<string>;

    // Helper functions
    getGroupByCardId: (cardId: string) => CardGroup | null;
    getCardsInGroup: (groupId: string) => Card[];
    getCardsByColumn: (column: ColumnType, includeGrouped?: boolean) => Card[];
}

function messageOf(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export const useCardGroups = ({
    retrospectiveId,
    cards,
    currentUser,
    groups: inputGroups = [],
}: UseCardGroupsProps): UseCardGroupsReturn => {
    const [error, setError] = useState<string | null>(null);
    const embeddingWorker = useEmbeddingWorkerManager();

    const groups = useMemo(
        () =>
            inputGroups.map((group) => {
                const groupCards = cards.filter((card) => card.id === group.headCardId || group.memberCardIds.includes(card.id));
                return calculateGroupAggregations(group, groupCards);
            }),
        [inputGroups, cards],
    );

    const groupedCards = cards.filter((card) => card.groupId);
    const ungroupedCards = cards.filter((card) => !card.groupId);

    const createGroup = useCallback(
        async (headCardId: string, memberCardIds: string[], customTitle?: string): Promise<string> => {
            if (!retrospectiveId) throw new Error('No retrospectiveId provided');
            if (!headCardId) throw new Error('No headCardId provided');
            if (!memberCardIds || memberCardIds.length === 0) throw new Error('At least one member card is required');

            try {
                setError(null);
                const group = await backendRetrospectiveClient.createCardGroup(retrospectiveId, { headCardId, memberCardIds, title: customTitle });
                return group.id;
            } catch (err) {
                const message = messageOf(err, 'Failed to create group');
                setError(message);
                throw new Error(message);
            }
        },
        [retrospectiveId],
    );

    const disbandGroup = useCallback(async (groupId: string): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.disbandCardGroup(groupId);
        } catch (err) {
            const message = messageOf(err, 'Failed to disband group');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const addToGroup = useCallback(async (groupId: string, cardId: string): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.addCardToGroup(groupId, cardId);
        } catch (err) {
            const message = messageOf(err, 'Failed to add card to group');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const removeFromGroup = useCallback(
        async (cardId: string): Promise<void> => {
            const groupId = cards.find((c) => c.id === cardId)?.groupId;
            if (!groupId) return;
            try {
                setError(null);
                await backendRetrospectiveClient.removeCardFromGroup(groupId, cardId);
            } catch (err) {
                const message = messageOf(err, 'Failed to remove card from group');
                setError(message);
                throw new Error(message);
            }
        },
        [cards],
    );

    const toggleGroupCollapse = useCallback(
        async (groupId: string): Promise<void> => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return;

            try {
                setError(null);
                await backendRetrospectiveClient.setGroupCollapse(groupId, !group.isCollapsed);
            } catch (err) {
                const message = messageOf(err, 'Failed to toggle group collapse');
                setError(message);
                throw new Error(message);
            }
        },
        [groups],
    );

    const findSuggestions = useCallback(
        (config?: Partial<GroupingConfig>): Promise<GroupSuggestion[]> =>
            findSemanticCardGroups(ungroupedCards, embeddingWorker.embed, config),
        [ungroupedCards, embeddingWorker.embed],
    );

    const acceptSuggestion = useCallback(
        async (suggestion: GroupSuggestion): Promise<string> => {
            if (suggestion.cardIds.length < 2) throw new Error('Suggestion must have at least 2 cards');
            const [headCardId, ...memberCardIds] = suggestion.cardIds;
            return createGroup(headCardId, memberCardIds, suggestion.suggestedTitle);
        },
        [createGroup],
    );

    const getGroupByCardId = useCallback((cardId: string): CardGroup | null => groups.find((group) => group.headCardId === cardId || group.memberCardIds.includes(cardId)) || null, [groups]);

    const getCardsInGroup = useCallback(
        (groupId: string): Card[] => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return [];
            return cards.filter((card) => card.id === group.headCardId || group.memberCardIds.includes(card.id));
        },
        [groups, cards],
    );

    const getCardsByColumn = useCallback(
        (column: ColumnType, includeGrouped: boolean = false): Card[] => {
            let columnCards = cards.filter((card) => card.column === column);
            if (!includeGrouped) columnCards = columnCards.filter((card) => !card.groupId);
            return columnCards;
        },
        [cards],
    );

    void currentUser;

    return {
        groups,
        groupedCards,
        ungroupedCards,
        loading: false,
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
