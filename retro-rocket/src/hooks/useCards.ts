import { useEffect, useState, useCallback } from 'react';
import {
    getCardsByRetrospective,
    subscribeToCards,
    createCard as createCardService,
    updateCard as updateCardService,
    deleteCard as deleteCardService,
    voteCard as voteCardService
} from '../services/cardService';
import { Card, CreateCardInput } from '../types/card';
import { ColumnType } from '../types/retrospective';

interface UseCardsReturn {
    cards: Card[];
    cardsByColumn: Record<ColumnType, Card[]>;
    loading: boolean;
    error: string | null;
    createCard: (cardInput: CreateCardInput) => Promise<string>;
    updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    voteCard: (cardId: string, increment?: boolean) => Promise<void>;
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
        refetch: fetchCards
    };
};

export default useCards;
