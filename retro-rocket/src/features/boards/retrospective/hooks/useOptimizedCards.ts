import { useCallback, useEffect, useState } from 'react';
import { Card, CreateCardInput, EmojiReaction, GroupedReaction } from '@/features/boards/types/card';
import { useBoardEventsContext } from '@/features/boards/retrospective/contexts/BoardEventsProvider';
import { groupReactions, hasUserLiked, getUserReaction as getUserReactionHelper } from '@/lib/utils/cardHelpers';
import * as cardsApi from '@/features/boards/retrospective/services/cardsApiClient';
import { parseCardsSnapshot } from '@/features/boards/retrospective/services/cardsApiClient';

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
    refetch: () => Promise<void>;
}

/**
 * Backend-mediated replacement for the direct-Firestore version of this hook (feature
 * 017 US2). Real-time updates now arrive over the board's SSE channel (`useBoardEvents`)
 * instead of a raw Firestore `onSnapshot` listener; every mutation is a REST call to the
 * boards API. `userId`/`username` params on the like/reaction functions are kept for
 * backward compatibility with existing call sites — the backend derives the actual
 * identity from the session cookie, so these are no longer sent over the wire.
 */
export const useOptimizedCards = (retrospectiveId?: string): UseOptimizedCardsReturn => {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { snapshot } = useBoardEventsContext();
    const rawCards = snapshot?.cards;

    useEffect(() => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }
        if (rawCards) {
            setCards(parseCardsSnapshot(rawCards as Parameters<typeof parseCardsSnapshot>[0]));
            setLoading(false);
            setError(null);
        }
    }, [retrospectiveId, rawCards]);

    const createCardCb = useCallback(async (cardInput: CreateCardInput): Promise<string> => {
        try {
            setError(null);
            const created = await cardsApi.createCard(cardInput);
            setCards((prev) => [...prev, created]);
            return created.id;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error creating card';
            setError(message);
            throw new Error(message);
        }
    }, []);

    const updateCardCb = useCallback(async (id: string, updates: Partial<Card>): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            const updated = await cardsApi.updateCard(retrospectiveId, id, updates);
            setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error updating card';
            setError(message);
            throw new Error(message);
        }
    }, [retrospectiveId]);

    const deleteCardCb = useCallback(async (id: string): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            await cardsApi.deleteCard(retrospectiveId, id);
            setCards((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error deleting card';
            setError(message);
            throw new Error(message);
        }
    }, [retrospectiveId]);

    const voteCardCb = useCallback(async (cardId: string, increment: boolean = true): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            const current = cards.find((c) => c.id === cardId);
            const updated = await cardsApi.voteCard(retrospectiveId, cardId, current?.votes ?? 0, increment);
            setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error voting card';
            setError(message);
            throw new Error(message);
        }
    }, [retrospectiveId, cards]);

    const toggleLikeCb = useCallback(async (cardId: string): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            const { likes } = await cardsApi.toggleLike(retrospectiveId, cardId);
            setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, likes } : c)));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error toggling like';
            setError(message);
            throw new Error(message);
        }
    }, [retrospectiveId]);

    const addReactionCb = useCallback(async (cardId: string, _userId: string, _username: string, emoji: EmojiReaction): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            const reactions = await cardsApi.addOrUpdateReaction(retrospectiveId, cardId, emoji);
            setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, reactions } : c)));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error adding reaction';
            setError(message);
            throw new Error(message);
        }
    }, [retrospectiveId]);

    const removeReactionCb = useCallback(async (cardId: string): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            const reactions = await cardsApi.removeReaction(retrospectiveId, cardId);
            setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, reactions } : c)));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error removing reaction';
            setError(message);
            throw new Error(message);
        }
    }, [retrospectiveId]);

    const reorderCardsCb = useCallback(async (updates: Array<{ cardId: string; order: number; column?: string }>): Promise<void> => {
        if (!retrospectiveId) return;
        try {
            setError(null);
            setCards((prev) =>
                prev.map((c) => {
                    const update = updates.find((u) => u.cardId === c.id);
                    return update ? { ...c, order: update.order, column: update.column ?? c.column } : c;
                }),
            );
            await cardsApi.batchUpdateCardOrder(retrospectiveId, updates);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error reordering cards';
            setError(message);
            throw new Error(message);
        }
    }, [retrospectiveId]);

    const getGroupedReactions = useCallback((cardId: string): GroupedReaction[] => {
        const card = cards.find((c) => c.id === cardId);
        if (!card?.reactions) return [];
        return groupReactions(card.reactions);
    }, [cards]);

    const getUserLiked = useCallback((cardId: string, userId: string): boolean => {
        const card = cards.find((c) => c.id === cardId);
        return hasUserLiked(card?.likes ?? [], userId);
    }, [cards]);

    const getUserReaction = useCallback((cardId: string, userId: string): EmojiReaction | null => {
        const card = cards.find((c) => c.id === cardId);
        return getUserReactionHelper(card?.reactions ?? [], userId);
    }, [cards]);

    const refetch = useCallback(async (): Promise<void> => {
        // Real-time state now arrives automatically over the SSE channel; kept for
        // backward compatibility with existing call sites.
    }, []);

    const cardsByColumn: Record<string, Card[]> = cards.reduce((acc, card) => {
        if (!acc[card.column]) acc[card.column] = [];
        acc[card.column].push(card);
        return acc;
    }, {} as Record<string, Card[]>);

    return {
        cards,
        cardsByColumn,
        loading,
        error,
        createCard: createCardCb,
        updateCard: updateCardCb,
        deleteCard: deleteCardCb,
        voteCard: voteCardCb,
        toggleLike: toggleLikeCb,
        addReaction: addReactionCb,
        removeReaction: removeReactionCb,
        reorderCards: reorderCardsCb,
        getGroupedReactions,
        getUserLiked,
        getUserReaction,
        refetch,
    };
};
