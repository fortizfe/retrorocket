import { describe, it, expect } from 'vitest';
import { calculateGroupAggregations } from '@/features/boards/clustering/services/cardGroupService';

// cardGroupService.ts's Firestore-direct CRUD/subscription exports were retired
// outright (feature 019, US4 — see the module's own doc comment); only the pure
// calculateGroupAggregations helper remains, and only it is tested here.

describe('calculateGroupAggregations', () => {
    const mockRetrospectiveId = 'test-retro-id';
    const mockHeadCardId = 'head-card-id';
    const mockMemberCardIds = ['member-1', 'member-2'];
    const mockUserId = 'test-user-id';

    const mockGroup = {
        id: 'test-group-id',
        retrospectiveId: mockRetrospectiveId,
        column: 'helped' as const,
        headCardId: mockHeadCardId,
        memberCardIds: mockMemberCardIds,
        isCollapsed: false,
        createdAt: new Date(),
        createdBy: mockUserId,
        order: 1
    };

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
