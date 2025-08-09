import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCards } from '../../hooks/useCards';
import * as cardService from '../../services/cardService';
import * as cardInteractionService from '../../services/cardInteractionService';
import { Card, CreateCardInput, EmojiReaction, Like, Reaction } from '../../types/card';

// Mock the services
vi.mock('../../services/cardService');
vi.mock('../../services/cardInteractionService');

const mockCardService = cardService as any;
const mockCardInteractionService = cardInteractionService as any;

describe('useCards Hook', () => {
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-123';
    const mockUsername = 'testuser';

    const mockCards: Card[] = [
        {
            id: 'card-1',
            retrospectiveId: mockRetrospectiveId,
            column: 'helped',
            content: 'Test card 1',
            createdBy: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            order: 1,
            votes: 5,
            likes: [
                { userId: 'user-1', username: 'user1', timestamp: new Date() },
                { userId: 'user-2', username: 'user2', timestamp: new Date() }
            ],
            reactions: [
                { userId: 'user-1', username: 'user1', emoji: '👍', timestamp: new Date() }
            ]
        },
        {
            id: 'card-2',
            retrospectiveId: mockRetrospectiveId,
            column: 'hindered',
            content: 'Test card 2',
            createdBy: 'user-2',
            createdAt: new Date(),
            updatedAt: new Date(),
            order: 2,
            votes: 3,
            likes: [],
            reactions: []
        },
        {
            id: 'card-3',
            retrospectiveId: mockRetrospectiveId,
            column: 'improve',
            content: 'Test card 3',
            createdBy: 'user-3',
            createdAt: new Date(),
            updatedAt: new Date(),
            order: 3,
            votes: 1,
            likes: [
                { userId: 'user-3', username: 'user3', timestamp: new Date() }
            ],
            reactions: []
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock default behavior
        mockCardService.getCardsByRetrospective.mockResolvedValue(mockCards);
        mockCardService.subscribeToCards.mockImplementation((id: string, callback: Function) => {
            // Use immediate callback to avoid timing issues
            const timeoutId = setTimeout(() => callback(mockCards), 0);
            return () => clearTimeout(timeoutId); // Return proper cleanup function
        });
        mockCardService.createCard.mockResolvedValue('new-card-id');
        mockCardService.updateCard.mockResolvedValue(undefined);
        mockCardService.deleteCard.mockResolvedValue(undefined);
        mockCardService.voteCard.mockResolvedValue(undefined);

        mockCardInteractionService.toggleLike.mockResolvedValue(undefined);
        mockCardInteractionService.addOrUpdateReaction.mockResolvedValue(undefined);
        mockCardInteractionService.removeReaction.mockResolvedValue(undefined);
        mockCardInteractionService.batchUpdateCardOrder.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.clearAllTimers();
    });

    describe('Initialization', () => {
        it('should initialize with loading state', () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            expect(result.current.loading).toBe(true);
            expect(result.current.cards).toEqual([]);
            expect(result.current.error).toBe(null);
        });

        it('should not fetch cards when retrospectiveId is undefined', () => {
            const { result } = renderHook(() => useCards());

            expect(result.current.loading).toBe(false);
            expect(mockCardService.subscribeToCards).not.toHaveBeenCalled();
        });

        it('should set up subscription when retrospectiveId is provided', async () => {
            renderHook(() => useCards(mockRetrospectiveId));

            await waitFor(() => {
                expect(mockCardService.subscribeToCards).toHaveBeenCalledWith(
                    mockRetrospectiveId,
                    expect.any(Function)
                );
            });
        });

        it('should load cards from subscription', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.cards).toEqual(mockCards);
                expect(result.current.error).toBe(null);
            });
        });
    });

    describe('Cards by Column', () => {
        it('should group cards by column correctly', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await waitFor(() => {
                expect(result.current.cardsByColumn.helped).toHaveLength(1);
                expect(result.current.cardsByColumn.helped[0].id).toBe('card-1');

                expect(result.current.cardsByColumn.hindered).toHaveLength(1);
                expect(result.current.cardsByColumn.hindered[0].id).toBe('card-2');

                expect(result.current.cardsByColumn.improve).toHaveLength(1);
                expect(result.current.cardsByColumn.improve[0].id).toBe('card-3');
            });
        });
    });

    describe('Card Operations', () => {
        it('should create a new card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            const newCardInput: CreateCardInput = {
                retrospectiveId: mockRetrospectiveId,
                column: 'helped',
                content: 'New test card',
                createdBy: mockUserId
            };

            await act(async () => {
                const cardId = await result.current.createCard(newCardInput);
                expect(cardId).toBe('new-card-id');
            });

            expect(mockCardService.createCard).toHaveBeenCalledWith(newCardInput);
            expect(result.current.error).toBe(null);
        });

        it('should handle create card error', async () => {
            const errorMessage = 'Failed to create card';
            mockCardService.createCard.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            const newCardInput: CreateCardInput = {
                retrospectiveId: mockRetrospectiveId,
                column: 'helped',
                content: 'New test card',
                createdBy: mockUserId
            };

            await act(async () => {
                await expect(result.current.createCard(newCardInput)).rejects.toThrow(errorMessage);
            });

            await waitFor(() => {
                expect(result.current.error).toBe(errorMessage);
            });
        });

        it('should update a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            const updates = { content: 'Updated content' };

            await act(async () => {
                await result.current.updateCard('card-1', updates);
            });

            expect(mockCardService.updateCard).toHaveBeenCalledWith('card-1', updates);
            expect(result.current.error).toBe(null);
        });

        it('should handle update card error', async () => {
            const errorMessage = 'Failed to update card';
            mockCardService.updateCard.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await expect(result.current.updateCard('card-1', {})).rejects.toThrow(errorMessage);
            });

            await waitFor(() => {
                expect(result.current.error).toBe(errorMessage);
            });
        });

        it('should delete a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await result.current.deleteCard('card-1');
            });

            expect(mockCardService.deleteCard).toHaveBeenCalledWith('card-1');
            expect(result.current.error).toBe(null);
        });

        it('should handle delete card error', async () => {
            const errorMessage = 'Failed to delete card';
            mockCardService.deleteCard.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await expect(result.current.deleteCard('card-1')).rejects.toThrow(errorMessage);
            });

            expect(result.current.error).toBe(errorMessage);
        });
    });

    describe('Voting', () => {
        it('should vote on a card with default increment', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await result.current.voteCard('card-1');
            });

            expect(mockCardService.voteCard).toHaveBeenCalledWith('card-1', true);
            expect(result.current.error).toBe(null);
        });

        it('should vote on a card with decrement', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await result.current.voteCard('card-1', false);
            });

            expect(mockCardService.voteCard).toHaveBeenCalledWith('card-1', false);
            expect(result.current.error).toBe(null);
        });

        it('should handle vote card error', async () => {
            const errorMessage = 'Failed to vote card';
            mockCardService.voteCard.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await expect(result.current.voteCard('card-1')).rejects.toThrow(errorMessage);
            });

            await waitFor(() => {
                expect(result.current.error).toBe(errorMessage);
            });
        });
    });

    describe('Likes and Reactions', () => {
        it('should toggle like on a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await result.current.toggleLike('card-1', mockUserId, mockUsername);
            });

            expect(mockCardInteractionService.toggleLike).toHaveBeenCalledWith('card-1', mockUserId, mockUsername);
            expect(result.current.error).toBe(null);
        });

        it('should add reaction to a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            const emoji: EmojiReaction = '👍';

            await act(async () => {
                await result.current.addReaction('card-1', mockUserId, mockUsername, emoji);
            });

            expect(mockCardInteractionService.addOrUpdateReaction).toHaveBeenCalledWith('card-1', mockUserId, mockUsername, emoji);
            expect(result.current.error).toBe(null);
        });

        it('should remove reaction from a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await result.current.removeReaction('card-1', mockUserId);
            });

            expect(mockCardInteractionService.removeReaction).toHaveBeenCalledWith('card-1', mockUserId);
            expect(result.current.error).toBe(null);
        });

        it('should check if user liked a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await waitFor(() => {
                expect(result.current.getUserLiked('card-1', 'user-1')).toBe(true);
                expect(result.current.getUserLiked('card-1', 'user-999')).toBe(false);
                expect(result.current.getUserLiked('card-2', 'user-1')).toBe(false);
            });
        });

        it('should get user reaction for a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await waitFor(() => {
                expect(result.current.getUserReaction('card-1', 'user-1')).toBe('👍');
                expect(result.current.getUserReaction('card-1', 'user-999')).toBe(null);
                expect(result.current.getUserReaction('card-2', 'user-1')).toBe(null);
            });
        });

        it('should get grouped reactions for a card', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await waitFor(() => {
                const groupedReactions = result.current.getGroupedReactions('card-1');
                expect(groupedReactions).toBeDefined();
                expect(Array.isArray(groupedReactions)).toBe(true);
            });
        });
    });

    describe('Reordering', () => {
        it('should reorder cards', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            const updates = [
                { cardId: 'card-1', order: 2 },
                { cardId: 'card-2', order: 1, column: 'helped' }
            ];

            await act(async () => {
                await result.current.reorderCards(updates);
            });

            expect(mockCardInteractionService.batchUpdateCardOrder).toHaveBeenCalledWith(updates);
            expect(result.current.error).toBe(null);
        });

        it('should handle reorder cards error', async () => {
            const errorMessage = 'Failed to reorder cards';
            mockCardInteractionService.batchUpdateCardOrder.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            const updates = [{ cardId: 'card-1', order: 2 }];

            await act(async () => {
                await expect(result.current.reorderCards(updates)).rejects.toThrow(errorMessage);
            });

            await waitFor(() => {
                expect(result.current.error).toBe(errorMessage);
            });
        });
    });

    describe('Refetch', () => {
        it('should refetch cards', async () => {
            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockCardService.getCardsByRetrospective).toHaveBeenCalledWith(mockRetrospectiveId);
        });

        it('should not refetch when retrospectiveId is undefined', async () => {
            const { result } = renderHook(() => useCards());

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockCardService.getCardsByRetrospective).not.toHaveBeenCalled();
        });
    });

    describe('Cleanup', () => {
        it('should unsubscribe on unmount', () => {
            const unsubscribeMock = vi.fn();
            mockCardService.subscribeToCards.mockReturnValue(unsubscribeMock);

            const { unmount } = renderHook(() => useCards(mockRetrospectiveId));

            unmount();

            expect(unsubscribeMock).toHaveBeenCalled();
        });

        it('should unsubscribe when retrospectiveId changes', () => {
            const unsubscribeMock = vi.fn();
            mockCardService.subscribeToCards.mockReturnValue(unsubscribeMock);

            const { rerender } = renderHook(
                ({ retrospectiveId }) => useCards(retrospectiveId),
                { initialProps: { retrospectiveId: mockRetrospectiveId } }
            );

            rerender({ retrospectiveId: 'new-retro-id' });

            expect(unsubscribeMock).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle interaction service errors', async () => {
            const errorMessage = 'Interaction service error';
            mockCardInteractionService.toggleLike.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            await act(async () => {
                await expect(result.current.toggleLike('card-1', mockUserId, mockUsername)).rejects.toThrow(errorMessage);
            });

            await waitFor(() => {
                expect(result.current.error).toBe(errorMessage);
            });
        });

        it('should handle non-Error exceptions', async () => {
            mockCardService.createCard.mockRejectedValue('String error');

            const { result } = renderHook(() => useCards(mockRetrospectiveId));

            const newCardInput: CreateCardInput = {
                retrospectiveId: mockRetrospectiveId,
                column: 'helped',
                content: 'New test card',
                createdBy: mockUserId
            };

            await act(async () => {
                await expect(result.current.createCard(newCardInput)).rejects.toThrow('Error creating card');
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Error creating card');
            });
        });
    });
});
