import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addDoc, getDoc, doc, writeBatch, collection, updateDoc, getDocs, onSnapshot } from 'firebase/firestore';
import {
    createCardGroup,
    calculateGroupAggregations,
    disbandCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    updateGroupCollapseState,
    getRetrospectiveGroups,
    subscribeToRetrospectiveGroups
} from '../../services/cardGroupService';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

vi.mock('../../services/firebase', () => ({
    db: { _type: 'mockDb' }
}));

describe('cardGroupService', () => {
    const mockGroupId = 'test-group-id';
    const mockRetrospectiveId = 'test-retro-id';
    const mockHeadCardId = 'head-card-id';
    const mockMemberCardIds = ['member-1', 'member-2'];
    const mockUserId = 'test-user-id';

    const mockHeadCard = {
        id: mockHeadCardId,
        retrospectiveId: mockRetrospectiveId,
        column: 'helped' as const,
        order: 1,
        content: 'Head card content',
        createdBy: mockUserId
    };

    const mockGroup = {
        id: mockGroupId,
        retrospectiveId: mockRetrospectiveId,
        column: 'helped' as const,
        headCardId: mockHeadCardId,
        memberCardIds: mockMemberCardIds,
        isCollapsed: false,
        createdAt: new Date(),
        createdBy: mockUserId,
        order: 1
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup basic mocks
        (collection as any).mockReturnValue({ _type: 'mockCollection' });
        (doc as any).mockReturnValue({ _type: 'mockDocRef' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createCardGroup', () => {
        it('should create a card group successfully', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => mockHeadCard
            });

            const mockBatch = {
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(undefined)
            };
            (writeBatch as any).mockReturnValue(mockBatch);
            (addDoc as any).mockResolvedValue({ id: mockGroupId });

            const result = await createCardGroup(
                mockRetrospectiveId,
                mockHeadCardId,
                mockMemberCardIds,
                mockUserId
            );

            expect(result).toBe(mockGroupId);
            expect(addDoc).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should throw error when memberCardIds is empty', async () => {
            await expect(
                createCardGroup(mockRetrospectiveId, mockHeadCardId, [], mockUserId)
            ).rejects.toThrow('At least one member card is required to create a group');
        });

        it('should throw error when head card not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            await expect(
                createCardGroup(mockRetrospectiveId, mockHeadCardId, mockMemberCardIds, mockUserId)
            ).rejects.toThrow(`Head card not found: ${mockHeadCardId}`);
        });

        it('should throw error when required parameters are missing', async () => {
            await expect(
                createCardGroup('', mockHeadCardId, mockMemberCardIds, mockUserId)
            ).rejects.toThrow('Missing required parameters for group creation');
        });
    });

    describe('disbandCardGroup', () => {
        it('should disband a card group successfully', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => mockGroup
            });

            const mockBatch = {
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(undefined)
            };
            (writeBatch as any).mockReturnValue(mockBatch);

            await disbandCardGroup(mockGroupId);

            expect(mockBatch.delete).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should throw error when group not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            await expect(disbandCardGroup(mockGroupId)).rejects.toThrow('Failed to disband card group');
        });
    });

    describe('addCardToGroup', () => {
        it('should add a card to group successfully', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => mockGroup
            });

            const mockBatch = {
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(undefined)
            };
            (writeBatch as any).mockReturnValue(mockBatch);

            const newCardId = 'new-card-id';
            await addCardToGroup(mockGroupId, newCardId);

            expect(mockBatch.update).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    memberCardIds: [...mockMemberCardIds, newCardId]
                })
            );
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should throw error when group not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            await expect(addCardToGroup(mockGroupId, 'card-id')).rejects.toThrow('Failed to add card to group');
        });
    });

    describe('removeCardFromGroup', () => {
        it('should remove a card from group successfully', async () => {
            const cardToRemove = mockMemberCardIds[0];
            (getDoc as any)
                .mockResolvedValueOnce({
                    exists: () => true,
                    data: () => ({ id: cardToRemove, groupId: mockGroupId })
                })
                .mockResolvedValueOnce({
                    exists: () => true,
                    data: () => mockGroup
                });

            const mockBatch = {
                update: vi.fn(),
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(undefined)
            };
            (writeBatch as any).mockReturnValue(mockBatch);

            await removeCardFromGroup(cardToRemove);

            expect(mockBatch.update).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    memberCardIds: mockMemberCardIds.filter(id => id !== cardToRemove)
                })
            );
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should throw error when card not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            await expect(removeCardFromGroup('nonexistent-card')).rejects.toThrow('Failed to remove card from group');
        });
    });

    describe('updateGroupCollapseState', () => {
        it('should update group collapse state successfully', async () => {
            await updateGroupCollapseState(mockGroupId, true);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    isCollapsed: true
                })
            );
        });
    });

    describe('getRetrospectiveGroups', () => {
        it('should get groups for retrospective successfully', async () => {
            const mockGroups = [
                { ...mockGroup, id: 'group-1' },
                { ...mockGroup, id: 'group-2' }
            ];

            (getDocs as any).mockResolvedValue({
                docs: mockGroups.map(group => ({
                    id: group.id,
                    data: () => {
                        const { id, ...groupData } = group;
                        return groupData;
                    }
                }))
            });

            const result = await getRetrospectiveGroups(mockRetrospectiveId);

            expect(result).toEqual(mockGroups);
            expect(getDocs).toHaveBeenCalled();
        });
    });

    describe('subscribeToRetrospectiveGroups', () => {
        it('should subscribe to retrospective groups successfully', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            (onSnapshot as any).mockReturnValue(mockUnsubscribe);

            const unsubscribe = subscribeToRetrospectiveGroups(mockRetrospectiveId, mockCallback);

            expect(onSnapshot).toHaveBeenCalled();
            expect(unsubscribe).toBe(mockUnsubscribe);
        });
    });

    describe('calculateGroupAggregations', () => {
        it('should calculate group aggregations correctly', () => {
            const mockCards = [
                {
                    id: mockHeadCardId,
                    content: 'Head card content',
                    column: 'helped' as const,
                    createdBy: mockUserId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    retrospectiveId: mockRetrospectiveId,
                    votes: 5,
                    likes: [
                        { userId: 'user1', username: 'User 1', timestamp: new Date() },
                        { userId: 'user2', username: 'User 2', timestamp: new Date() }
                    ],
                    reactions: [
                        { emoji: '👍' as const, userId: 'user1', username: 'User 1', timestamp: new Date() }
                    ]
                },
                {
                    id: mockMemberCardIds[0],
                    content: 'Member card',
                    column: 'helped' as const,
                    createdBy: mockUserId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    retrospectiveId: mockRetrospectiveId,
                    votes: 3,
                    likes: [
                        { userId: 'user3', username: 'User 3', timestamp: new Date() }
                    ],
                    reactions: [
                        { emoji: '❤️' as const, userId: 'user2', username: 'User 2', timestamp: new Date() }
                    ]
                }
            ];

            const result = calculateGroupAggregations(mockGroup, mockCards);

            expect(result).toEqual({
                ...mockGroup,
                totalVotes: 8, // 5 + 3
                totalLikes: 3, // 2 + 1
                allReactions: [
                    { emoji: '👍', userId: 'user1', username: 'User 1', timestamp: expect.any(Date) },
                    { emoji: '❤️', userId: 'user2', username: 'User 2', timestamp: expect.any(Date) }
                ]
            });
        });

        it('should handle empty cards array', () => {
            const result = calculateGroupAggregations(mockGroup, []);

            expect(result).toEqual({
                ...mockGroup,
                totalVotes: 0,
                totalLikes: 0,
                allReactions: []
            });
        });

        it('should handle cards with undefined votes and reactions', () => {
            const mockCards = [
                {
                    id: mockHeadCardId,
                    content: 'Head card content',
                    column: 'helped' as const,
                    createdBy: mockUserId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    retrospectiveId: mockRetrospectiveId,
                    votes: undefined,
                    likes: undefined,
                    reactions: undefined
                }
            ];

            const result = calculateGroupAggregations(mockGroup, mockCards);

            expect(result).toEqual({
                ...mockGroup,
                totalVotes: 0,
                totalLikes: 0,
                allReactions: []
            });
        });
    });
});
