import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardGroups } from '@/features/boards/clustering/hooks/useCardGroups';
import {
    createCardGroup,
    disbandCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    updateGroupCollapseState,
    subscribeToRetrospectiveGroups,
    calculateGroupAggregations
} from '@/features/boards/clustering/services/cardGroupService';
import { findSimilarCardGroups } from '@/features/boards/clustering/services/similarityService';
import { Card, CardGroup, GroupSuggestion } from '@/features/boards/types/card';
import { ColumnType } from '@/features/boards/types/retrospective';

// Mock all services
vi.mock('@/features/boards/clustering/services/cardGroupService', () => ({
    createCardGroup: vi.fn(),
    disbandCardGroup: vi.fn(),
    addCardToGroup: vi.fn(),
    removeCardFromGroup: vi.fn(),
    updateGroupCollapseState: vi.fn(),
    subscribeToRetrospectiveGroups: vi.fn(),
    calculateGroupAggregations: vi.fn()
}));

vi.mock('@/features/boards/clustering/services/similarityService', () => ({
    findSimilarCardGroups: vi.fn()
}));

const mockedCardGroupService = {
    createCardGroup: vi.mocked(createCardGroup),
    disbandCardGroup: vi.mocked(disbandCardGroup),
    addCardToGroup: vi.mocked(addCardToGroup),
    removeCardFromGroup: vi.mocked(removeCardFromGroup),
    updateGroupCollapseState: vi.mocked(updateGroupCollapseState),
    subscribeToRetrospectiveGroups: vi.mocked(subscribeToRetrospectiveGroups),
    calculateGroupAggregations: vi.mocked(calculateGroupAggregations)
};

const mockedSimilarityService = vi.mocked(findSimilarCardGroups);

describe('useCardGroups', () => {
    const mockCards: Card[] = [
        {
            id: 'card-1',
            content: 'Test card 1',
            column: 'helped' as ColumnType,
            createdBy: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1'
        },
        {
            id: 'card-2',
            content: 'Test card 2',
            column: 'helped' as ColumnType,
            createdBy: 'user-2',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1'
        },
        {
            id: 'card-3',
            content: 'Test card 3',
            column: 'hindered' as ColumnType,
            createdBy: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1',
            groupId: 'group-1'
        }
    ];

    const mockGroups: CardGroup[] = [
        {
            id: 'group-1',
            retrospectiveId: 'retro-1',
            column: 'hindered' as ColumnType,
            headCardId: 'card-3',
            memberCardIds: ['card-4'],
            isCollapsed: false,
            createdAt: new Date(),
            createdBy: 'user-1',
            order: 1,
            totalVotes: 5,
            totalLikes: 3
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockedCardGroupService.subscribeToRetrospectiveGroups.mockReturnValue(vi.fn());
        mockedCardGroupService.calculateGroupAggregations.mockImplementation((group) => group);
    });

    describe('Basic functionality', () => {
        it('should initialize with loading state and setup subscription', () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            expect(result.current.loading).toBe(true);
            expect(result.current.groups).toEqual([]);
            expect(result.current.error).toBeNull();
            expect(mockedCardGroupService.subscribeToRetrospectiveGroups).toHaveBeenCalledWith(
                'retro-1',
                expect.any(Function)
            );
        });

        it('should not setup subscription without retrospective ID', () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: '',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            expect(result.current.loading).toBe(false);
            expect(mockedCardGroupService.subscribeToRetrospectiveGroups).not.toHaveBeenCalled();
        });

        it('should separate grouped and ungrouped cards', () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            expect(result.current.groupedCards).toHaveLength(1);
            expect(result.current.groupedCards[0].id).toBe('card-3');
            expect(result.current.ungroupedCards).toHaveLength(2);
            expect(result.current.ungroupedCards.map(c => c.id)).toEqual(['card-1', 'card-2']);
        });
    });

    describe('Group management', () => {
        it('should create a new group', async () => {
            mockedCardGroupService.createCardGroup.mockResolvedValue('new-group-id');

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            let groupId: string = '';
            await act(async () => {
                groupId = await result.current.createGroup('card-1', ['card-2'], 'Custom title');
            });

            expect(groupId).toBe('new-group-id');
            expect(mockedCardGroupService.createCardGroup).toHaveBeenCalledWith(
                'retro-1',
                'card-1',
                ['card-2'],
                'user-1',
                'Custom title'
            );
        });

        it('should handle create group errors', async () => {
            mockedCardGroupService.createCardGroup.mockRejectedValue(new Error('Create failed'));

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('card-1', ['card-2'])
                ).rejects.toThrow('Create failed');
            });

            expect(result.current.error).toBe('Create failed');
        });

        it('should disband a group', async () => {
            mockedCardGroupService.disbandCardGroup.mockResolvedValue();

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            await act(async () => {
                await result.current.disbandGroup('group-1');
            });

            expect(mockedCardGroupService.disbandCardGroup).toHaveBeenCalledWith('group-1');
        });

        it('should add card to group', async () => {
            mockedCardGroupService.addCardToGroup.mockResolvedValue();

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            await act(async () => {
                await result.current.addToGroup('group-1', 'card-2');
            });

            expect(mockedCardGroupService.addCardToGroup).toHaveBeenCalledWith('group-1', 'card-2');
        });

        it('should remove card from group', async () => {
            mockedCardGroupService.removeCardFromGroup.mockResolvedValue();

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            await act(async () => {
                await result.current.removeFromGroup('card-3');
            });

            expect(mockedCardGroupService.removeCardFromGroup).toHaveBeenCalledWith('card-3');
        });

        it('should toggle group collapse state', async () => {
            mockedCardGroupService.updateGroupCollapseState.mockResolvedValue();

            let subscriptionCallback: ((groups: CardGroup[]) => void) | undefined;
            mockedCardGroupService.subscribeToRetrospectiveGroups.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            // Set up groups first
            act(() => {
                subscriptionCallback?.(mockGroups);
            });

            await act(async () => {
                await result.current.toggleGroupCollapse('group-1');
            });

            expect(mockedCardGroupService.updateGroupCollapseState).toHaveBeenCalledWith('group-1', true);
        });
    });

    describe('Similarity detection', () => {
        it('should find group suggestions', () => {
            const mockSuggestions: GroupSuggestion[] = [
                {
                    id: 'suggestion-1',
                    cardIds: ['card-1', 'card-2'],
                    similarity: 0.8,
                    reason: 'Similar content',
                    algorithm: 'combined'
                }
            ];

            mockedSimilarityService.mockReturnValue(mockSuggestions);

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            const suggestions = result.current.findSuggestions({ threshold: 0.7 });

            expect(suggestions).toEqual(mockSuggestions);
            expect(mockedSimilarityService).toHaveBeenCalledWith(
                result.current.ungroupedCards,
                { threshold: 0.7 }
            );
        });

        it('should accept a suggestion and create group', async () => {
            mockedCardGroupService.createCardGroup.mockResolvedValue('suggestion-group-id');

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            const suggestion: GroupSuggestion = {
                id: 'suggestion-1',
                cardIds: ['card-1', 'card-2', 'card-3'],
                similarity: 0.8,
                reason: 'Similar content',
                algorithm: 'combined'
            };

            let groupId: string = '';
            await act(async () => {
                groupId = await result.current.acceptSuggestion(suggestion);
            });

            expect(groupId).toBe('suggestion-group-id');
            expect(mockedCardGroupService.createCardGroup).toHaveBeenCalledWith(
                'retro-1',
                'card-1',
                ['card-2', 'card-3'],
                'user-1',
                undefined
            );
        });

        it('should reject suggestion with insufficient cards', async () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            const suggestion: GroupSuggestion = {
                id: 'suggestion-1',
                cardIds: ['card-1'],
                similarity: 0.8,
                reason: 'Similar content',
                algorithm: 'combined'
            };

            await act(async () => {
                await expect(
                    result.current.acceptSuggestion(suggestion)
                ).rejects.toThrow('Suggestion must have at least 2 cards');
            });
        });
    });

    describe('Helper functions', () => {
        it('should get group by card ID', () => {
            let subscriptionCallback: ((groups: CardGroup[]) => void) | undefined;
            mockedCardGroupService.subscribeToRetrospectiveGroups.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            // Set up groups
            act(() => {
                subscriptionCallback?.(mockGroups);
            });

            const group = result.current.getGroupByCardId('card-3');
            expect(group?.id).toBe('group-1');

            const noGroup = result.current.getGroupByCardId('card-1');
            expect(noGroup).toBeNull();
        });

        it('should get cards in group', () => {
            let subscriptionCallback: ((groups: CardGroup[]) => void) | undefined;
            mockedCardGroupService.subscribeToRetrospectiveGroups.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            // Set up groups
            act(() => {
                subscriptionCallback?.(mockGroups);
            });

            const groupCards = result.current.getCardsInGroup('group-1');
            expect(groupCards).toHaveLength(1);
            expect(groupCards[0].id).toBe('card-3');
        });

        it('should get cards by column excluding grouped', () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            const wellCards = result.current.getCardsByColumn('helped', false);
            expect(wellCards).toHaveLength(2);
            expect(wellCards.map(c => c.id)).toEqual(['card-1', 'card-2']);

            const improveCards = result.current.getCardsByColumn('hindered', false);
            expect(improveCards).toHaveLength(0); // card-3 is grouped, so excluded
        });

        it('should get cards by column including grouped', () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            const improveCards = result.current.getCardsByColumn('hindered', true);
            expect(improveCards).toHaveLength(1);
            expect(improveCards[0].id).toBe('card-3');
        });
    });

    describe('Validation and edge cases', () => {
        it('should throw error when creating group without retrospective ID', async () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: '',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('card-1', ['card-2'])
                ).rejects.toThrow('No retrospectiveId provided');
            });
        });

        it('should throw error when creating group without current user', async () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: undefined
                })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('card-1', ['card-2'])
                ).rejects.toThrow('User not authenticated');
            });
        });

        it('should throw error when creating group without head card', async () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('', ['card-2'])
                ).rejects.toThrow('No headCardId provided');
            });
        });

        it('should throw error when creating group without member cards', async () => {
            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('card-1', [])
                ).rejects.toThrow('At least one member card is required');
            });
        });
    });

    describe('Subscription handling', () => {
        it('should handle subscription data with aggregations', () => {
            let subscriptionCallback: ((groups: CardGroup[]) => void) | undefined;
            mockedCardGroupService.subscribeToRetrospectiveGroups.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            mockedCardGroupService.calculateGroupAggregations.mockImplementation((group, cards) => ({
                ...group,
                totalVotes: cards.length * 2,
                totalLikes: cards.length
            }));

            const { result } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            act(() => {
                subscriptionCallback?.(mockGroups);
            });

            expect(result.current.groups).toHaveLength(1);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(mockedCardGroupService.calculateGroupAggregations).toHaveBeenCalledWith(
                mockGroups[0],
                expect.any(Array)
            );
        });

        it('should cleanup subscription on unmount', () => {
            const mockUnsubscribe = vi.fn();
            mockedCardGroupService.subscribeToRetrospectiveGroups.mockReturnValue(mockUnsubscribe);

            const { unmount } = renderHook(() =>
                useCardGroups({
                    retrospectiveId: 'retro-1',
                    cards: mockCards,
                    currentUser: 'user-1'
                })
            );

            unmount();
            expect(mockUnsubscribe).toHaveBeenCalled();
        });
    });
});
