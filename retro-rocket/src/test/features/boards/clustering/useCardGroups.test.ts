import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardGroups } from '@/features/boards/clustering/hooks/useCardGroups';
import {
    createCardGroup,
    disbandCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    updateGroupCollapseState,
} from '@/features/boards/clustering/services/cardGroupsApiClient';
import { findSimilarCardGroups } from '@/features/boards/clustering/services/similarityService';
import { Card, CardGroup, GroupSuggestion } from '@/features/boards/types/card';
import { ColumnType } from '@/features/boards/types/retrospective';

let mockSnapshot: { groups: unknown[] } | null = null;

vi.mock('@/features/boards/retrospective/contexts/BoardEventsProvider', () => ({
    useBoardEventsContext: () => ({ snapshot: mockSnapshot, connectionState: 'connected' }),
}));

vi.mock('@/features/boards/clustering/services/cardGroupsApiClient', () => ({
    createCardGroup: vi.fn(),
    disbandCardGroup: vi.fn(),
    addCardToGroup: vi.fn(),
    removeCardFromGroup: vi.fn(),
    updateGroupCollapseState: vi.fn(),
    parseGroupsSnapshot: (raw: Array<Record<string, unknown>>) => raw.map((g) => ({ ...g, createdAt: new Date(g.createdAt as string) })),
}));

vi.mock('@/features/boards/clustering/services/similarityService', () => ({
    findSimilarCardGroups: vi.fn(),
}));

const mockedCreateCardGroup = vi.mocked(createCardGroup);
const mockedDisbandCardGroup = vi.mocked(disbandCardGroup);
const mockedAddCardToGroup = vi.mocked(addCardToGroup);
const mockedRemoveCardFromGroup = vi.mocked(removeCardFromGroup);
const mockedUpdateGroupCollapseState = vi.mocked(updateGroupCollapseState);
const mockedSimilarityService = vi.mocked(findSimilarCardGroups);

const mockCards: Card[] = [
    { id: 'card-1', content: 'Test card 1', column: 'helped' as ColumnType, createdBy: 'user-1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'retro-1' },
    { id: 'card-2', content: 'Test card 2', column: 'helped' as ColumnType, createdBy: 'user-2', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'retro-1' },
    { id: 'card-3', content: 'Test card 3', column: 'hindered' as ColumnType, createdBy: 'user-1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'retro-1', groupId: 'group-1' },
];

const rawGroup = { id: 'group-1', retrospectiveId: 'retro-1', column: 'hindered', headCardId: 'card-3', memberCardIds: ['card-4'], isCollapsed: false, createdAt: new Date().toISOString(), createdBy: 'user-1', order: 1 };

describe('useCardGroups', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSnapshot = null;
    });

    describe('Basic functionality', () => {
        it('starts in a loading state before the SSE snapshot arrives', () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            expect(result.current.loading).toBe(true);
            expect(result.current.groups).toEqual([]);
        });

        it('computes groups (with aggregations) once the snapshot arrives', () => {
            mockSnapshot = { groups: [rawGroup] };
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));

            expect(result.current.loading).toBe(false);
            expect(result.current.groups).toHaveLength(1);
            expect(result.current.groups[0].id).toBe('group-1');
        });

        it('separates grouped and ungrouped cards', () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            expect(result.current.groupedCards.map((c) => c.id)).toEqual(['card-3']);
            expect(result.current.ungroupedCards.map((c) => c.id)).toEqual(['card-1', 'card-2']);
        });
    });

    describe('Group management', () => {
        it('creates a new group', async () => {
            mockedCreateCardGroup.mockResolvedValue({ ...rawGroup, id: 'new-group-id', createdAt: new Date() } as CardGroup);
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));

            let groupId = '';
            await act(async () => {
                groupId = await result.current.createGroup('card-1', ['card-2'], 'Custom title');
            });

            expect(groupId).toBe('new-group-id');
            expect(mockedCreateCardGroup).toHaveBeenCalledWith('retro-1', 'card-1', ['card-2'], 'user-1', 'Custom title');
        });

        it('surfaces an error when creation fails', async () => {
            mockedCreateCardGroup.mockRejectedValue(new Error('Create failed'));
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));

            await act(async () => {
                await expect(result.current.createGroup('card-1', ['card-2'])).rejects.toThrow('Create failed');
            });
            expect(result.current.error).toBe('Create failed');
        });

        it('disbands a group', async () => {
            mockedDisbandCardGroup.mockResolvedValue();
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            await act(async () => { await result.current.disbandGroup('group-1'); });
            expect(mockedDisbandCardGroup).toHaveBeenCalledWith('retro-1', 'group-1');
        });

        it('adds a card to a group', async () => {
            mockedAddCardToGroup.mockResolvedValue({ ...rawGroup, createdAt: new Date() } as CardGroup);
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            await act(async () => { await result.current.addToGroup('group-1', 'card-2'); });
            expect(mockedAddCardToGroup).toHaveBeenCalledWith('retro-1', 'group-1', 'card-2');
        });

        it('removes a card from its group (resolved via the current snapshot)', async () => {
            mockSnapshot = { groups: [rawGroup] };
            mockedRemoveCardFromGroup.mockResolvedValue(null);
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            await act(async () => { await result.current.removeFromGroup('card-3'); });
            expect(mockedRemoveCardFromGroup).toHaveBeenCalledWith('retro-1', 'group-1', 'card-3');
        });

        it('toggles group collapse state', async () => {
            mockSnapshot = { groups: [rawGroup] };
            mockedUpdateGroupCollapseState.mockResolvedValue({ ...rawGroup, createdAt: new Date() } as CardGroup);
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            await act(async () => { await result.current.toggleGroupCollapse('group-1'); });
            expect(mockedUpdateGroupCollapseState).toHaveBeenCalledWith('retro-1', 'group-1', true);
        });
    });

    describe('Similarity detection', () => {
        it('finds group suggestions from ungrouped cards', () => {
            const mockSuggestions: GroupSuggestion[] = [{ id: 'suggestion-1', cardIds: ['card-1', 'card-2'], similarity: 0.8, reason: 'Similar content', algorithm: 'combined' }];
            mockedSimilarityService.mockReturnValue(mockSuggestions);

            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            const suggestions = result.current.findSuggestions({ threshold: 0.7 });

            expect(suggestions).toEqual(mockSuggestions);
            expect(mockedSimilarityService).toHaveBeenCalledWith(result.current.ungroupedCards, { threshold: 0.7 });
        });

        it('accepts a suggestion and creates a group', async () => {
            mockedCreateCardGroup.mockResolvedValue({ ...rawGroup, id: 'suggestion-group-id', createdAt: new Date() } as CardGroup);
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));

            const suggestion: GroupSuggestion = { id: 'suggestion-1', cardIds: ['card-1', 'card-2', 'card-3'], similarity: 0.8, reason: 'x', algorithm: 'combined' };
            let groupId = '';
            await act(async () => { groupId = await result.current.acceptSuggestion(suggestion); });

            expect(groupId).toBe('suggestion-group-id');
            expect(mockedCreateCardGroup).toHaveBeenCalledWith('retro-1', 'card-1', ['card-2', 'card-3'], 'user-1', undefined);
        });

        it('rejects a suggestion with fewer than 2 cards', async () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            const suggestion: GroupSuggestion = { id: 's1', cardIds: ['card-1'], similarity: 0.8, reason: 'x', algorithm: 'combined' };
            await act(async () => {
                await expect(result.current.acceptSuggestion(suggestion)).rejects.toThrow('Suggestion must have at least 2 cards');
            });
        });
    });

    describe('Helper functions', () => {
        it('resolves a group by card id', () => {
            mockSnapshot = { groups: [rawGroup] };
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            expect(result.current.getGroupByCardId('card-3')?.id).toBe('group-1');
            expect(result.current.getGroupByCardId('card-1')).toBeNull();
        });

        it('lists cards in a group', () => {
            mockSnapshot = { groups: [rawGroup] };
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            const groupCards = result.current.getCardsInGroup('group-1');
            expect(groupCards.map((c) => c.id)).toEqual(['card-3']);
        });

        it('filters cards by column, excluding grouped cards by default', () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            expect(result.current.getCardsByColumn('helped', false).map((c) => c.id)).toEqual(['card-1', 'card-2']);
            expect(result.current.getCardsByColumn('hindered', false)).toHaveLength(0);
        });

        it('includes grouped cards when requested', () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            expect(result.current.getCardsByColumn('hindered', true).map((c) => c.id)).toEqual(['card-3']);
        });
    });

    describe('Validation', () => {
        it('rejects creating a group without a retrospectiveId', async () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: '', cards: mockCards, currentUser: 'user-1' }));
            await act(async () => {
                await expect(result.current.createGroup('card-1', ['card-2'])).rejects.toThrow('No retrospectiveId provided');
            });
        });

        it('rejects creating a group without an authenticated user', async () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: undefined }));
            await act(async () => {
                await expect(result.current.createGroup('card-1', ['card-2'])).rejects.toThrow('User not authenticated');
            });
        });

        it('rejects creating a group without a head card', async () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            await act(async () => {
                await expect(result.current.createGroup('', ['card-2'])).rejects.toThrow('No headCardId provided');
            });
        });

        it('rejects creating a group without member cards', async () => {
            const { result } = renderHook(() => useCardGroups({ retrospectiveId: 'retro-1', cards: mockCards, currentUser: 'user-1' }));
            await act(async () => {
                await expect(result.current.createGroup('card-1', [])).rejects.toThrow('At least one member card is required');
            });
        });
    });
});
