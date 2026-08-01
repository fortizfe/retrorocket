import { useCallback, useMemo, useState } from 'react';
import { Card, CreateCardInput, EmojiReaction, GroupedReaction } from '@/features/boards/types/card';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { groupReactions, hasUserLiked, getUserReaction as getUserReactionHelper } from '@/lib/utils/cardHelpers';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface UseOptimizedCardsReturn {
    cards: Card[];
    cardsByColumn: Record<string, Card[]>;
    loading: boolean;
    error: string | null;
    createCard: (cardInput: CreateCardInput) => Promise<string>;
    updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    voteCard: (cardId: string, increment?: boolean) => Promise<void>;
    toggleLike: (cardId: string, userId: string, username: string) => Promise<void>;
    addReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    removeReaction: (cardId: string, userId: string) => Promise<void>;
    reorderCards: (updates: Array<{ cardId: string; order: number; column?: string }>) => Promise<void>;
    getGroupedReactions: (cardId: string) => GroupedReaction[];
    getUserLiked: (cardId: string, userId: string) => boolean;
    getUserReaction: (cardId: string, userId: string) => EmojiReaction | null;
}

function messageOf(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

/**
 * Card lifecycle/interactions for the retrospective board (feature 019, US2). `cards`
 * is now an INPUT — sourced from useRetrospectiveRealtimeSync's board state via
 * RetrospectivePage -> RetrospectiveBoard, not a self-managed Firestore onSnapshot
 * subscription — every card write goes through backendRetrospectiveClient, and the
 * resulting change is picked up via the live WebSocket relay (including for the
 * caller's own actions), so no client-side optimistic mutation is needed anymore.
 * reorderCards uses the backend's atomic WriteBatch endpoint (FR-010, US4).
 */
export const useOptimizedCards = (retrospectiveId: string | undefined, cards: Card[]): UseOptimizedCardsReturn => {
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    const createCardFn = useCallback(async (cardInput: CreateCardInput): Promise<string> => {
        try {
            setError(null);
            const created = await backendRetrospectiveClient.createCard(cardInput.retrospectiveId, {
                content: cardInput.content,
                column: cardInput.column,
                color: cardInput.color,
            });
            return created.id;
        } catch (err) {
            const message = messageOf(err, 'Error creating card');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const updateCardFn = useCallback(async (id: string, updates: Partial<Card>): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.editCard(id, { content: updates.content, color: updates.color });
        } catch (err) {
            const message = messageOf(err, 'Error updating card');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const deleteCardFn = useCallback(async (id: string): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.deleteCard(id);
        } catch (err) {
            const message = messageOf(err, 'Error deleting card');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const voteCardFn = useCallback(async (cardId: string, increment = true): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.voteCard(cardId, increment);
        } catch (err) {
            const message = messageOf(err, 'Error voting card');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const toggleLikeFn = useCallback(async (cardId: string): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.toggleLike(cardId);
        } catch (err) {
            const message = messageOf(err, 'Error toggling like');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const addReactionFn = useCallback(async (cardId: string, _userId: string, _username: string, emoji: EmojiReaction): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.setReaction(cardId, emoji);
        } catch (err) {
            const message = messageOf(err, 'Error adding reaction');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const removeReactionFn = useCallback(async (cardId: string): Promise<void> => {
        try {
            setError(null);
            await backendRetrospectiveClient.removeReaction(cardId);
        } catch (err) {
            const message = messageOf(err, 'Error removing reaction');
            setError(message);
            throw new Error(message);
        }
    }, []);

    const reorderCardsFn = useCallback(
        async (updates: Array<{ cardId: string; order: number; column?: string }>): Promise<void> => {
            if (!retrospectiveId) return;
            try {
                setError(null);
                await backendRetrospectiveClient.reorderCards(retrospectiveId, updates);
            } catch (err) {
                const message = messageOf(err, 'Error reordering cards');
                setError(message);
                throw new Error(message);
            }
        },
        [retrospectiveId],
    );

    const getGroupedReactions = useCallback(
        (cardId: string): GroupedReaction[] => {
            const card = cards.find((c) => c.id === cardId);
            if (!card?.reactions) return [];
            return groupReactions(card.reactions, undefined, t('retrospective.grouping.unknownAuthor'));
        },
        [cards, t],
    );

    const getUserLiked = useCallback(
        (cardId: string, userId: string): boolean => {
            const card = cards.find((c) => c.id === cardId);
            return hasUserLiked(card?.likes ?? [], userId);
        },
        [cards],
    );

    const getUserReaction = useCallback(
        (cardId: string, userId: string): EmojiReaction | null => {
            const card = cards.find((c) => c.id === cardId);
            return getUserReactionHelper(card?.reactions ?? [], userId);
        },
        [cards],
    );

    const cardsByColumn: Record<string, Card[]> = useMemo(
        () =>
            cards.reduce(
                (acc, card) => {
                    const columnId = card.column;
                    if (!acc[columnId]) acc[columnId] = [];
                    acc[columnId].push(card);
                    return acc;
                },
                {} as Record<string, Card[]>,
            ),
        [cards],
    );

    return {
        cards,
        cardsByColumn,
        loading: false,
        error,
        createCard: createCardFn,
        updateCard: updateCardFn,
        deleteCard: deleteCardFn,
        voteCard: voteCardFn,
        toggleLike: toggleLikeFn,
        addReaction: addReactionFn,
        removeReaction: removeReactionFn,
        reorderCards: reorderCardsFn,
        getGroupedReactions,
        getUserLiked,
        getUserReaction,
    };
};
