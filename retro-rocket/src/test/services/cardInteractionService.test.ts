import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
    updateDoc,
    doc,
    getDoc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import {
    toggleLike,
    addOrUpdateReaction,
    removeReaction,
    updateCardOrder,
    batchUpdateCardOrder
} from '../../services/cardInteractionService';
import { Reaction, EmojiReaction } from '../../types/card';

// Mock Firebase dependencies
vi.mock('firebase/firestore', () => ({
    updateDoc: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

vi.mock('../../services/firebase', () => ({
    db: { _type: 'mockDb' }
}));

describe('cardInteractionService', () => {
    const mockDb = { _type: 'mockDb' };
    const mockCardId = 'card-123';
    const mockUserId = 'user-123';
    const mockUsername = 'testUser';

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset all mocks to default behavior
        (doc as Mock).mockReturnValue({ _type: 'mockDocRef' });
        (updateDoc as Mock).mockResolvedValue(undefined);
        (arrayUnion as Mock).mockImplementation((...args) => ({ _type: 'arrayUnion', args }));
        (arrayRemove as Mock).mockImplementation((...args) => ({ _type: 'arrayRemove', args }));
        (getDoc as Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({ likes: [], reactions: [] })
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('toggleLike', () => {
        it('should add a new like when user has not liked the card', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    likes: [
                        {
                            userId: 'other-user',
                            username: 'otherUser',
                            timestamp: new Date()
                        }
                    ]
                })
            });

            await toggleLike(mockCardId, mockUserId, mockUsername);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
            expect(arrayUnion).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    username: mockUsername,
                    timestamp: expect.any(Date)
                })
            );
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    likes: { _type: 'arrayUnion', args: [expect.any(Object)] },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should remove an existing like when user has already liked the card', async () => {
            const existingLike = {
                userId: mockUserId,
                username: mockUsername,
                timestamp: new Date()
            };

            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    likes: [
                        existingLike,
                        {
                            userId: 'other-user',
                            username: 'otherUser',
                            timestamp: new Date()
                        }
                    ]
                })
            });

            await toggleLike(mockCardId, mockUserId, mockUsername);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
            expect(arrayRemove).toHaveBeenCalledWith(existingLike);
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    likes: { _type: 'arrayRemove', args: [existingLike] },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should add like when no existing likes', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({ likes: [] })
            });

            await toggleLike(mockCardId, mockUserId, mockUsername);

            expect(arrayUnion).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    username: mockUsername,
                    timestamp: expect.any(Date)
                })
            );
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    likes: { _type: 'arrayUnion', args: [expect.any(Object)] },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle card not found error', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => false
            });

            await expect(
                toggleLike(mockCardId, mockUserId, mockUsername)
            ).rejects.toThrow('Failed to toggle like');

            expect(getDoc).toHaveBeenCalled();
            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should handle Firebase errors gracefully', async () => {
            const firebaseError = new Error('Firebase error');
            (getDoc as Mock).mockRejectedValue(firebaseError);

            await expect(
                toggleLike(mockCardId, mockUserId, mockUsername)
            ).rejects.toThrow('Failed to toggle like');

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
        });
    });

    describe('addOrUpdateReaction', () => {
        const mockEmoji: EmojiReaction = '👍';

        it('should add a new reaction when user has no existing reactions', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    reactions: [
                        {
                            userId: 'other-user',
                            username: 'otherUser',
                            emoji: '❤️',
                            timestamp: new Date()
                        }
                    ]
                })
            });

            await addOrUpdateReaction(mockCardId, mockUserId, mockUsername, mockEmoji);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
            expect(arrayUnion).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    username: mockUsername,
                    emoji: mockEmoji,
                    timestamp: expect.any(Date)
                })
            );
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    reactions: { _type: 'arrayUnion', args: [expect.any(Object)] },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should replace existing reaction when user changes emoji', async () => {
            const existingReaction: Reaction = {
                userId: mockUserId,
                username: mockUsername,
                emoji: '❤️',
                timestamp: new Date()
            };

            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    reactions: [existingReaction]
                })
            });

            await addOrUpdateReaction(mockCardId, mockUserId, mockUsername, mockEmoji);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
            expect(arrayRemove).toHaveBeenCalledWith(existingReaction);
            expect(arrayUnion).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    username: mockUsername,
                    emoji: mockEmoji,
                    timestamp: expect.any(Date)
                })
            );
            // Should be called twice: once to remove, once to add
            expect(updateDoc).toHaveBeenCalledTimes(2);
        });

        it('should add reaction when no existing reactions', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({ reactions: [] })
            });

            await addOrUpdateReaction(mockCardId, mockUserId, mockUsername, mockEmoji);

            expect(arrayUnion).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    username: mockUsername,
                    emoji: mockEmoji,
                    timestamp: expect.any(Date)
                })
            );
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    reactions: { _type: 'arrayUnion', args: [expect.any(Object)] },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle multiple existing reactions from same user', async () => {
            const reaction1: Reaction = {
                userId: mockUserId,
                username: mockUsername,
                emoji: '❤️',
                timestamp: new Date()
            };
            const reaction2: Reaction = {
                userId: mockUserId,
                username: mockUsername,
                emoji: '😊',
                timestamp: new Date()
            };

            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    reactions: [reaction1, reaction2]
                })
            });

            await addOrUpdateReaction(mockCardId, mockUserId, mockUsername, mockEmoji);

            expect(arrayRemove).toHaveBeenCalledTimes(2);
            expect(arrayRemove).toHaveBeenCalledWith(reaction1);
            expect(arrayRemove).toHaveBeenCalledWith(reaction2);
            expect(updateDoc).toHaveBeenCalledTimes(3); // 2 removes + 1 add
        });

        it('should handle card not found error', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => false
            });

            await expect(
                addOrUpdateReaction(mockCardId, mockUserId, mockUsername, mockEmoji)
            ).rejects.toThrow('Failed to add reaction');

            expect(getDoc).toHaveBeenCalled();
            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should handle Firebase errors gracefully', async () => {
            const firebaseError = new Error('Firebase error');
            (getDoc as Mock).mockRejectedValue(firebaseError);

            await expect(
                addOrUpdateReaction(mockCardId, mockUserId, mockUsername, mockEmoji)
            ).rejects.toThrow('Failed to add reaction');

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
        });
    });

    describe('removeReaction', () => {
        it('should remove user reactions from card', async () => {
            const userReaction: Reaction = {
                userId: mockUserId,
                username: mockUsername,
                emoji: '👍',
                timestamp: new Date()
            };

            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    reactions: [
                        userReaction,
                        {
                            userId: 'other-user',
                            username: 'otherUser',
                            emoji: '❤️',
                            timestamp: new Date()
                        }
                    ]
                })
            });

            await removeReaction(mockCardId, mockUserId);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
            expect(arrayRemove).toHaveBeenCalledWith(userReaction);
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    reactions: { _type: 'arrayRemove', args: [userReaction] },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should remove only the first reaction from same user', async () => {
            const userReaction1: Reaction = {
                userId: mockUserId,
                username: mockUsername,
                emoji: '👍',
                timestamp: new Date()
            };
            const userReaction2: Reaction = {
                userId: mockUserId,
                username: mockUsername,
                emoji: '❤️',
                timestamp: new Date()
            };

            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    reactions: [userReaction1, userReaction2]
                })
            });

            await removeReaction(mockCardId, mockUserId);

            // Only removes the first reaction found
            expect(arrayRemove).toHaveBeenCalledTimes(1);
            expect(arrayRemove).toHaveBeenCalledWith(userReaction1);
            expect(updateDoc).toHaveBeenCalledTimes(1);
        });

        it('should handle case when user has no reactions', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    reactions: [
                        {
                            userId: 'other-user',
                            username: 'otherUser',
                            emoji: '❤️',
                            timestamp: new Date()
                        }
                    ]
                })
            });

            await removeReaction(mockCardId, mockUserId);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
            // Should not call updateDoc since no user reactions to remove
            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should handle empty reactions array', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({ reactions: [] })
            });

            await removeReaction(mockCardId, mockUserId);

            expect(getDoc).toHaveBeenCalled();
            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should handle undefined reactions', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({})
            });

            await removeReaction(mockCardId, mockUserId);

            expect(getDoc).toHaveBeenCalled();
            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should handle card not found error', async () => {
            (getDoc as Mock).mockResolvedValue({
                exists: () => false
            });

            await expect(
                removeReaction(mockCardId, mockUserId)
            ).rejects.toThrow('Failed to remove reaction');

            expect(getDoc).toHaveBeenCalled();
            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should handle Firebase errors gracefully', async () => {
            const firebaseError = new Error('Firebase error');
            (getDoc as Mock).mockRejectedValue(firebaseError);

            await expect(
                removeReaction(mockCardId, mockUserId)
            ).rejects.toThrow('Failed to remove reaction');

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(getDoc).toHaveBeenCalled();
        });
    });

    describe('updateCardOrder', () => {
        it('should update card order successfully', async () => {
            const newOrder = 5;

            await updateCardOrder(mockCardId, newOrder);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    order: newOrder,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should update card order with new column', async () => {
            const newOrder = 5;
            const newColumn = 'WENT_WELL';

            await updateCardOrder(mockCardId, newOrder, newColumn);

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    order: newOrder,
                    column: newColumn,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle zero order', async () => {
            const newOrder = 0;

            await updateCardOrder(mockCardId, newOrder);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    order: newOrder,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle negative order', async () => {
            const newOrder = -1;

            await updateCardOrder(mockCardId, newOrder);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    order: newOrder,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should not include column field when empty string is provided', async () => {
            const newOrder = 5;
            const newColumn = '';

            await updateCardOrder(mockCardId, newOrder, newColumn);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    order: newOrder,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle Firebase errors gracefully', async () => {
            const firebaseError = new Error('Firebase error');
            (updateDoc as Mock).mockRejectedValue(firebaseError);

            await expect(
                updateCardOrder(mockCardId, 5)
            ).rejects.toThrow('Failed to update card order');

            expect(doc).toHaveBeenCalledWith(mockDb, 'cards', mockCardId);
            expect(updateDoc).toHaveBeenCalled();
        });
    });

    describe('batchUpdateCardOrder', () => {
        it('should update multiple cards order successfully', async () => {
            const updates = [
                { cardId: 'card-1', order: 1 },
                { cardId: 'card-2', order: 2 }
            ];

            await batchUpdateCardOrder(updates);

            expect(doc).toHaveBeenCalledTimes(2);
            expect(updateDoc).toHaveBeenCalledTimes(2);
        });

        it('should update multiple cards with column changes', async () => {
            const updates = [
                { cardId: 'card-1', order: 1, column: 'WENT_WELL' },
                { cardId: 'card-2', order: 2, column: 'NEEDS_IMPROVEMENT' }
            ];

            await batchUpdateCardOrder(updates);

            expect(doc).toHaveBeenCalledTimes(2);
            expect(updateDoc).toHaveBeenCalledTimes(2);
        });

        it('should handle empty updates array', async () => {
            const updates: Array<{ cardId: string; order: number }> = [];

            await batchUpdateCardOrder(updates);

            expect(doc).not.toHaveBeenCalled();
            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should handle single update', async () => {
            const updates = [
                { cardId: 'card-1', order: 1 }
            ];

            await batchUpdateCardOrder(updates);

            expect(doc).toHaveBeenCalledTimes(1);
            expect(updateDoc).toHaveBeenCalledTimes(1);
        });

        it('should handle Firebase errors in individual updates', async () => {
            const firebaseError = new Error('Firebase error');
            (updateDoc as Mock)
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(firebaseError);

            const updates = [
                { cardId: 'card-1', order: 1 },
                { cardId: 'card-2', order: 2 }
            ];

            await expect(
                batchUpdateCardOrder(updates)
            ).rejects.toThrow('Failed to update cards order');

            expect(doc).toHaveBeenCalledTimes(2);
            expect(updateDoc).toHaveBeenCalledTimes(2);
        });
    });
});
