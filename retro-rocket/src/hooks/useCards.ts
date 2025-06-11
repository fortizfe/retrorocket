import { useEffect, useState, useCallback } from 'react';
import {
    getCardsByRetrospective,
    subscribeToCards,
    createCard as createCardService,
    updateCard as updateCardService,
    deleteCard as deleteCardService,
    voteCard as voteCardService
} from '../services/cardService';
import {
    toggleLike,
    addOrUpdateReaction,
    removeReaction,
    batchUpdateCardOrder
} from '../services/cardInteractionService';
import { Card, CreateCardInput, EmojiReaction, GroupedReaction } from '../types/card';
import { ColumnType } from '../types/retrospective';
import { groupReactions, hasUserLiked, getUserReaction as getUserReactionHelper } from '../utils/cardHelpers';

interface UseCardsReturn {
    cards: Card[];
    cardsByColumn: Record<ColumnType, Card[]>;
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

export const useCards = (retrospectiveId?: string): UseCardsReturn => {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCards = useCallback(async () => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const fetchedCards = await getCardsByRetrospective(retrospectiveId);
            setCards(fetchedCards);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching cards');
            setCards([]);
        } finally {
            setLoading(false);
        }
    }, [retrospectiveId]);

    useEffect(() => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }

        // Set up real-time subscription
        const unsubscribe = subscribeToCards(retrospectiveId, (fetchedCards) => {
            setCards(fetchedCards);
            setLoading(false);
            setError(null);
        });

        return () => unsubscribe();
    }, [retrospectiveId]);

    const createCard = useCallback(async (cardInput: CreateCardInput): Promise<string> => {
        try {
            setError(null);
            const newCardId = await createCardService(cardInput);
            // The subscription will handle updating the local state
            return newCardId;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error creating card';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const updateCard = useCallback(async (id: string, updates: Partial<Card>): Promise<void> => {
        try {
            setError(null);
            await updateCardService(id, updates);
            // The subscription will handle updating the local state
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error updating card';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const deleteCard = useCallback(async (id: string): Promise<void> => {
        try {
            setError(null);
            await deleteCardService(id);
            // The subscription will handle updating the local state
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error deleting card';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const voteCard = useCallback(async (cardId: string, increment: boolean = true): Promise<void> => {
        try {
            setError(null);
            await voteCardService(cardId, increment);
            // The subscription will handle updating the local state
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error voting card';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const handleToggleLike = useCallback(async (cardId: string, userId: string, username: string): Promise<void> => {
        try {
            setError(null);
            await toggleLike(cardId, userId, username);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error toggling like';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const handleAddReaction = useCallback(async (cardId: string, userId: string, username: string, emoji: EmojiReaction): Promise<void> => {
        try {
            setError(null);
            await addOrUpdateReaction(cardId, userId, username, emoji);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error adding reaction';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const handleRemoveReaction = useCallback(async (cardId: string, userId: string): Promise<void> => {
        try {
            setError(null);
            await removeReaction(cardId, userId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error removing reaction';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const handleReorderCards = useCallback(async (updates: Array<{ cardId: string; order: number; column?: string }>): Promise<void> => {
        try {
            setError(null);
            await batchUpdateCardOrder(updates);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error reordering cards';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const getGroupedReactions = useCallback((cardId: string): GroupedReaction[] => {
        const card = cards.find(c => c.id === cardId);
        if (!card?.reactions) return [];
        return groupReactions(card.reactions);
    }, [cards]);

    const getUserLiked = useCallback((cardId: string, userId: string): boolean => {
        const card = cards.find(c => c.id === cardId);
        return hasUserLiked(card?.likes ?? [], userId);
    }, [cards]);

    const getUserReaction = useCallback((cardId: string, userId: string): EmojiReaction | null => {
        const card = cards.find(c => c.id === cardId);
        return getUserReactionHelper(card?.reactions ?? [], userId);
    }, [cards]);

    // Group cards by column for easier rendering
    const cardsByColumn: Record<ColumnType, Card[]> = {
        helped: cards.filter(card => card.column === 'helped'),
        hindered: cards.filter(card => card.column === 'hindered'),
        improve: cards.filter(card => card.column === 'improve')
    };

    return {
        cards,
        cardsByColumn,
        loading,
        error,
        createCard,
        updateCard,
        deleteCard,
        voteCard,
        toggleLike: handleToggleLike,
        addReaction: handleAddReaction,
        removeReaction: handleRemoveReaction,
        reorderCards: handleReorderCards,
        getGroupedReactions,
        getUserLiked,
        getUserReaction,
        refetch: fetchCards
    };
};

export default useCards;
