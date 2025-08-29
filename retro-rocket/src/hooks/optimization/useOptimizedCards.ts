import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CreateCardInput, EmojiReaction, GroupedReaction } from '../../types/card';
import {
    createCard,
    updateCard as updateCardService,
    deleteCard as deleteCardService,
    subscribeToCards,
    voteCard as voteCardService
} from '../../services/cardService';
import {
    toggleLike as toggleLikeService,
    addOrUpdateReaction,
    removeReaction,
    batchUpdateCardOrder
} from '../../services/cardInteractionService';
import { FirestoreListenerManager } from '../../services/optimization/FirestoreListenerManager';
import { OptimisticUpdatesManager } from '../../services/optimization/OptimisticUpdatesManager';
import { FirebaseMetricsService } from '../../services/optimization/FirebaseMetricsService';
import { groupReactions, hasUserLiked, getUserReaction as getUserReactionHelper } from '../../utils/cardHelpers';

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
    metrics: {
        operations: number;
        cacheHits: number;
        errors: number;
    };
}

/**
 * Hook optimizado para gestionar tarjetas con:
 * - Listeners centralizados
 * - Updates optimistas
 * - Métricas de rendimiento
 * - Caché inteligente
 * - Compatibilidad total con useCards
 */
export const useOptimizedCards = (retrospectiveId?: string): UseOptimizedCardsReturn => {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState({ operations: 0, cacheHits: 0, errors: 0 });

    const unsubscribeRef = useRef<(() => void) | null>(null);
    const localOperationsCount = useRef(0);

    // Actualizar métricas locales
    const updateLocalMetrics = useCallback(() => {
        const globalMetrics = FirebaseMetricsService.getMetrics();
        setMetrics({
            operations: localOperationsCount.current,
            cacheHits: globalMetrics.summary.cacheHits,
            errors: globalMetrics.summary.errors
        });
    }, []);

    // Configurar listener centralizado
    useEffect(() => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }

        const listenerKey = `cards_${retrospectiveId}`;

        // Usar el gestor centralizado de listeners
        unsubscribeRef.current = FirestoreListenerManager.subscribe(
            listenerKey,
            () => {
                FirebaseMetricsService.recordListener(`cards-subscription-${retrospectiveId}`);

                return subscribeToCards(retrospectiveId, (fetchedCards: Card[]) => {
                    FirebaseMetricsService.recordRead('cards-real-time-update', fetchedCards.length);
                    setCards(fetchedCards);
                    setLoading(false);
                    setError(null);
                    updateLocalMetrics();
                });
            }
        );

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [retrospectiveId, updateLocalMetrics]);

    // Crear tarjeta con actualización optimista
    const createCardOptimized = useCallback(async (cardInput: CreateCardInput): Promise<string> => {
        if (!OptimisticUpdatesManager.canUseOptimisticUpdates()) {
            // Fallback a creación normal si no es seguro usar optimismo
            try {
                setError(null);
                const newCardId = await createCard(cardInput);
                FirebaseMetricsService.recordWrite('card-create', 1);
                localOperationsCount.current++;
                updateLocalMetrics();
                return newCardId;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error creating card';
                setError(errorMessage);
                FirebaseMetricsService.recordError('card-create', err as Error);
                updateLocalMetrics();
                throw new Error(errorMessage);
            }
        }

        // Usar actualización optimista
        return OptimisticUpdatesManager.createWithOptimism(
            cards,
            setCards,
            async () => {
                const newCardId = await createCard(cardInput);
                FirebaseMetricsService.recordWrite('card-create-optimistic', 1);
                localOperationsCount.current++;
                return newCardId;
            },
            {
                ...cardInput,
                createdAt: new Date(),
                updatedAt: new Date(),
                votes: 0,
                likes: [],
                reactions: [],
                order: Date.now()
            } as Omit<Card, 'id'>
        ).catch((err: Error) => {
            const errorMessage = err instanceof Error ? err.message : 'Error creating card';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-create-optimistic', err);
            updateLocalMetrics();
            throw new Error(errorMessage);
        }).finally(() => {
            updateLocalMetrics();
        });
    }, [cards, updateLocalMetrics]);

    // Actualizar tarjeta con optimismo
    const updateCardOptimized = useCallback(async (id: string, updates: Partial<Card>): Promise<void> => {
        return OptimisticUpdatesManager.updateItemWithOptimism(
            cards,
            setCards,
            async () => {
                await updateCardService(id, updates);
                FirebaseMetricsService.recordWrite('card-update-optimistic', 1);
                localOperationsCount.current++;
            },
            id,
            { ...updates, updatedAt: new Date() }
        ).catch((err: Error) => {
            const errorMessage = err instanceof Error ? err.message : 'Error updating card';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-update-optimistic', err);
            throw new Error(errorMessage);
        }).finally(() => {
            updateLocalMetrics();
        });
    }, [cards, updateLocalMetrics]);

    // Eliminar tarjeta con optimismo
    const deleteCardOptimized = useCallback(async (id: string): Promise<void> => {
        return OptimisticUpdatesManager.deleteWithOptimism(
            cards,
            setCards,
            async () => {
                await deleteCardService(id);
                FirebaseMetricsService.recordWrite('card-delete-optimistic', 1);
                localOperationsCount.current++;
            },
            id
        ).catch((err: Error) => {
            const errorMessage = err instanceof Error ? err.message : 'Error deleting card';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-delete-optimistic', err);
            throw new Error(errorMessage);
        }).finally(() => {
            updateLocalMetrics();
        });
    }, [cards, updateLocalMetrics]);

    // Votar tarjeta con optimismo
    const voteCardOptimized = useCallback(async (cardId: string, increment: boolean = true): Promise<void> => {
        try {
            setError(null);

            // Actualización optimista local
            setCards(prevCards =>
                prevCards.map(card =>
                    card.id === cardId
                        ? { ...card, votes: Math.max(0, (card.votes ?? 0) + (increment ? 1 : -1)) }
                        : card
                )
            );

            await voteCardService(cardId, increment);
            FirebaseMetricsService.recordWrite('card-vote-optimistic', 1);
            localOperationsCount.current++;
            updateLocalMetrics();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error voting card';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-vote-optimistic', err as Error);
            updateLocalMetrics();
            throw new Error(errorMessage);
        }
    }, [updateLocalMetrics]);

    // Toggle like con optimismo
    const toggleLikeOptimized = useCallback(async (cardId: string, userId: string, username: string): Promise<void> => {
        try {
            setError(null);
            await toggleLikeService(cardId, userId, username);
            FirebaseMetricsService.recordWrite('card-like-optimistic', 1);
            localOperationsCount.current++;
            updateLocalMetrics();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error toggling like';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-like-optimistic', err as Error);
            updateLocalMetrics();
            throw new Error(errorMessage);
        }
    }, [updateLocalMetrics]);

    // Añadir reacción con optimismo
    const addReactionOptimized = useCallback(async (cardId: string, userId: string, username: string, emoji: EmojiReaction): Promise<void> => {
        try {
            setError(null);
            await addOrUpdateReaction(cardId, userId, username, emoji);
            FirebaseMetricsService.recordWrite('card-reaction-optimistic', 1);
            localOperationsCount.current++;
            updateLocalMetrics();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error adding reaction';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-reaction-optimistic', err as Error);
            updateLocalMetrics();
            throw new Error(errorMessage);
        }
    }, [updateLocalMetrics]);

    // Remover reacción con optimismo
    const removeReactionOptimized = useCallback(async (cardId: string, userId: string): Promise<void> => {
        try {
            setError(null);
            await removeReaction(cardId, userId);
            FirebaseMetricsService.recordWrite('card-reaction-remove-optimistic', 1);
            localOperationsCount.current++;
            updateLocalMetrics();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error removing reaction';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-reaction-remove-optimistic', err as Error);
            updateLocalMetrics();
            throw new Error(errorMessage);
        }
    }, [updateLocalMetrics]);

    // Reordenar tarjetas con optimismo
    const reorderCardsOptimized = useCallback(async (updates: Array<{ cardId: string; order: number; column?: string }>): Promise<void> => {
        try {
            setError(null);
            await batchUpdateCardOrder(updates);
            FirebaseMetricsService.recordWrite('card-reorder-optimistic', updates.length);
            localOperationsCount.current++;
            updateLocalMetrics();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error reordering cards';
            setError(errorMessage);
            FirebaseMetricsService.recordError('card-reorder-optimistic', err as Error);
            updateLocalMetrics();
            throw new Error(errorMessage);
        }
    }, [updateLocalMetrics]);

    // Funciones de utilidad (compatible con useCards original)
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

    // Refetch manual (manteniendo compatibilidad)
    const refetch = useCallback(async (): Promise<void> => {
        // En el sistema optimizado, esto se maneja automáticamente por los listeners
        // Pero mantenemos la función para compatibilidad
        updateLocalMetrics();
    }, [updateLocalMetrics]);

    // Group cards by column for easier rendering - dynamic grouping
    const cardsByColumn: Record<string, Card[]> = cards.reduce((acc, card) => {
        const columnId = card.column;
        if (!acc[columnId]) {
            acc[columnId] = [];
        }
        acc[columnId].push(card);
        return acc;
    }, {} as Record<string, Card[]>);

    return {
        cards,
        cardsByColumn,
        loading,
        error,
        createCard: createCardOptimized,
        updateCard: updateCardOptimized,
        deleteCard: deleteCardOptimized,
        voteCard: voteCardOptimized,
        toggleLike: toggleLikeOptimized,
        addReaction: addReactionOptimized,
        removeReaction: removeReactionOptimized,
        reorderCards: reorderCardsOptimized,
        getGroupedReactions,
        getUserLiked,
        getUserReaction,
        refetch,
        metrics
    };
};
