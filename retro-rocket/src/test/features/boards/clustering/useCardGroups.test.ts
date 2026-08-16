import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardGroups } from '@/features/boards/clustering/hooks/useCardGroups';
import { findSemanticCardGroups } from '@/features/boards/clustering/services/semanticGroupingService';
import { Card, CardGroup, GroupSuggestion } from '@/features/boards/types/card';
import { ColumnType } from '@/features/boards/types/retrospective';

const mockCreateCardGroup = vi.fn();
const mockDisbandCardGroup = vi.fn();
const mockAddCardToGroup = vi.fn();
const mockRemoveCardFromGroup = vi.fn();
const mockSetGroupCollapse = vi.fn();

// groups are now an INPUT (sourced from useRetrospectiveRealtimeSync via
// RetrospectiveBoard, feature 019 US4) — this hook no longer subscribes to Firestore
// itself; only its write delegation to backendRetrospectiveClient is under test here.
vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    createCardGroup: (...args: unknown[]) => mockCreateCardGroup(...args),
    disbandCardGroup: (...args: unknown[]) => mockDisbandCardGroup(...args),
    addCardToGroup: (...args: unknown[]) => mockAddCardToGroup(...args),
    removeCardFromGroup: (...args: unknown[]) => mockRemoveCardFromGroup(...args),
    setGroupCollapse: (...args: unknown[]) => mockSetGroupCollapse(...args),
}));

vi.mock('@/features/boards/clustering/services/semanticGroupingService', () => ({
    findSemanticCardGroups: vi.fn()
}));

// The hook only ever passes `embeddingWorker.embed` through as an opaque function to
// findSemanticCardGroups (mocked above) — it's never actually invoked in this file, so
// a stub is enough to avoid instantiating a real Worker in jsdom.
vi.mock('@/features/boards/clustering/hooks/useEmbeddingWorkerManager', () => ({
    useEmbeddingWorkerManager: () => ({
        embed: vi.fn(),
        getState: () => ({ ready: false, loading: false, error: undefined }),
        terminate: vi.fn(),
    }),
}));

const mockedSemanticGroupingService = vi.mocked(findSemanticCardGroups);

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
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic functionality', () => {
        it('is never in a loading state — groups are provided synchronously as an input', () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            expect(result.current.loading).toBe(false);
            expect(result.current.groups).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        it('reflects the groups input, with aggregations computed', () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1', groups: mockGroups })
            );

            expect(result.current.groups).toHaveLength(1);
            expect(result.current.groups[0].id).toBe('group-1');
        });

        it('should separate grouped and ungrouped cards', () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            expect(result.current.groupedCards).toHaveLength(1);
            expect(result.current.groupedCards[0].id).toBe('card-3');
            expect(result.current.ungroupedCards).toHaveLength(2);
            expect(result.current.ungroupedCards.map(c => c.id)).toEqual(['card-1', 'card-2']);
        });
    });

    describe('Group management', () => {
        it('should create a new group', async () => {
            mockCreateCardGroup.mockResolvedValue({ id: 'new-group-id' });

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            let groupId: string = '';
            await act(async () => {
                groupId = await result.current.createGroup('card-1', ['card-2'], 'Custom title');
            });

            expect(groupId).toBe('new-group-id');
            expect(mockCreateCardGroup).toHaveBeenCalledWith('retro-1', { headCardId: 'card-1', memberCardIds: ['card-2'], title: 'Custom title' });
        });

        it('should handle create group errors', async () => {
            mockCreateCardGroup.mockRejectedValue(new Error('Create failed'));

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('card-1', ['card-2'])
                ).rejects.toThrow('Create failed');
            });

            expect(result.current.error).toBe('Create failed');
        });

        it('should disband a group', async () => {
            mockDisbandCardGroup.mockResolvedValue(undefined);

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await result.current.disbandGroup('group-1');
            });

            expect(mockDisbandCardGroup).toHaveBeenCalledWith('group-1');
        });

        it('should add card to group', async () => {
            mockAddCardToGroup.mockResolvedValue(mockGroups[0]);

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await result.current.addToGroup('group-1', 'card-2');
            });

            expect(mockAddCardToGroup).toHaveBeenCalledWith('group-1', 'card-2');
        });

        it("removes a card from its group, resolving the group id from the card's own groupId field", async () => {
            mockRemoveCardFromGroup.mockResolvedValue(mockGroups[0]);

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await result.current.removeFromGroup('card-3');
            });

            expect(mockRemoveCardFromGroup).toHaveBeenCalledWith('group-1', 'card-3');
        });

        it('is a no-op when the card is not currently in a group', async () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await result.current.removeFromGroup('card-1');
            });

            expect(mockRemoveCardFromGroup).not.toHaveBeenCalled();
        });

        it('should toggle group collapse state', async () => {
            mockSetGroupCollapse.mockResolvedValue({ ...mockGroups[0], isCollapsed: true });

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1', groups: mockGroups })
            );

            await act(async () => {
                await result.current.toggleGroupCollapse('group-1');
            });

            expect(mockSetGroupCollapse).toHaveBeenCalledWith('group-1', true);
        });
    });

    describe('AI-based suggestion detection (spec 044)', () => {
        it('should find group suggestions asynchronously, delegating to findSemanticCardGroups', async () => {
            const mockSuggestions: GroupSuggestion[] = [
                {
                    id: 'suggestion-1',
                    cardIds: ['card-1', 'card-2'],
                    similarity: 0.8,
                    suggestedTitle: 'Suggested title',
                }
            ];

            mockedSemanticGroupingService.mockResolvedValue(mockSuggestions);

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            const suggestionsPromise = result.current.findSuggestions({ threshold: 0.7 });
            expect(suggestionsPromise).toBeInstanceOf(Promise);

            const suggestions = await suggestionsPromise;

            expect(suggestions).toEqual(mockSuggestions);
            expect(mockedSemanticGroupingService).toHaveBeenCalledWith(
                result.current.ungroupedCards,
                expect.any(Function),
                { threshold: 0.7 }
            );
        });

        it('propagates a rejection from findSemanticCardGroups (e.g. AI unavailable) rather than swallowing it', async () => {
            mockedSemanticGroupingService.mockRejectedValue(new Error('Embedding model unavailable'));

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await expect(result.current.findSuggestions()).rejects.toThrow('Embedding model unavailable');
        });

        it('should accept a suggestion and create group, passing the suggestion\'s title through as customTitle (spec 047 FR-004)', async () => {
            mockCreateCardGroup.mockResolvedValue({ id: 'suggestion-group-id' });

            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            const suggestion: GroupSuggestion = {
                id: 'suggestion-1',
                cardIds: ['card-1', 'card-2', 'card-3'],
                similarity: 0.8,
                suggestedTitle: 'Standup runs long',
            };

            let groupId: string = '';
            await act(async () => {
                groupId = await result.current.acceptSuggestion(suggestion);
            });

            expect(groupId).toBe('suggestion-group-id');
            expect(mockCreateCardGroup).toHaveBeenCalledWith('retro-1', { headCardId: 'card-1', memberCardIds: ['card-2', 'card-3'], title: 'Standup runs long' });
        });

        it('should reject suggestion with insufficient cards', async () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            const suggestion: GroupSuggestion = {
                id: 'suggestion-1',
                cardIds: ['card-1'],
                similarity: 0.8,
                suggestedTitle: 'Title',
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
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1', groups: mockGroups })
            );

            const group = result.current.getGroupByCardId('card-3');
            expect(group?.id).toBe('group-1');

            const noGroup = result.current.getGroupByCardId('card-1');
            expect(noGroup).toBeNull();
        });

        it('should get cards in group', () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1', groups: mockGroups })
            );

            const groupCards = result.current.getCardsInGroup('group-1');
            expect(groupCards).toHaveLength(1);
            expect(groupCards[0].id).toBe('card-3');
        });

        it('should get cards by column excluding grouped', () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            const wellCards = result.current.getCardsByColumn('helped', false);
            expect(wellCards).toHaveLength(2);
            expect(wellCards.map(c => c.id)).toEqual(['card-1', 'card-2']);

            const improveCards = result.current.getCardsByColumn('hindered', false);
            expect(improveCards).toHaveLength(0); // card-3 is grouped, so excluded
        });

        it('should get cards by column including grouped', () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            const improveCards = result.current.getCardsByColumn('hindered', true);
            expect(improveCards).toHaveLength(1);
            expect(improveCards[0].id).toBe('card-3');
        });
    });

    describe('Validation and edge cases', () => {
        it('should throw error when creating group without retrospective ID', async () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: '', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('card-1', ['card-2'])
                ).rejects.toThrow('No retrospectiveId provided');
            });
        });

        it('should throw error when creating group without head card', async () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('', ['card-2'])
                ).rejects.toThrow('No headCardId provided');
            });
        });

        it('should throw error when creating group without member cards', async () => {
            const { result } = renderHook(() =>
                useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' })
            );

            await act(async () => {
                await expect(
                    result.current.createGroup('card-1', [])
                ).rejects.toThrow('At least one member card is required');
            });
        });
    });
});
