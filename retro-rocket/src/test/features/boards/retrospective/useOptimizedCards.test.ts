import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOptimizedCards } from '@/features/boards/retrospective/hooks/useOptimizedCards';
import type { Card } from '@/features/boards/types/card';

const mockCreateCard = vi.fn();
const mockEditCard = vi.fn();
const mockDeleteCard = vi.fn();
const mockVoteCard = vi.fn();
const mockToggleLike = vi.fn();
const mockSetReaction = vi.fn();
const mockRemoveReaction = vi.fn();
const mockReorderCards = vi.fn();

vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    createCard: (...args: unknown[]) => mockCreateCard(...args),
    editCard: (...args: unknown[]) => mockEditCard(...args),
    deleteCard: (...args: unknown[]) => mockDeleteCard(...args),
    voteCard: (...args: unknown[]) => mockVoteCard(...args),
    toggleLike: (...args: unknown[]) => mockToggleLike(...args),
    setReaction: (...args: unknown[]) => mockSetReaction(...args),
    removeReaction: (...args: unknown[]) => mockRemoveReaction(...args),
    reorderCards: (...args: unknown[]) => mockReorderCards(...args),
}));

function card(overrides: Partial<Card> = {}): Card {
    return {
        id: 'c1',
        content: 'x',
        column: 'col1',
        createdBy: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'r1',
        votes: 0,
        likes: [],
        reactions: [],
        order: 0,
        ...overrides,
    };
}

describe('useOptimizedCards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('derives cardsByColumn from the input cards', () => {
        const cards = [card({ id: 'c1', column: 'col1' }), card({ id: 'c2', column: 'col2' }), card({ id: 'c3', column: 'col1' })];
        const { result } = renderHook(() => useOptimizedCards('r1', cards));
        expect(result.current.cardsByColumn.col1).toHaveLength(2);
        expect(result.current.cardsByColumn.col2).toHaveLength(1);
    });

    it('createCard delegates to backendRetrospectiveClient.createCard and returns the new id', async () => {
        mockCreateCard.mockResolvedValue({ id: 'new-card' });
        const { result } = renderHook(() => useOptimizedCards('r1', []));

        const id = await act(() => result.current.createCard({ content: 'hi', column: 'col1', createdBy: 'u1', retrospectiveId: 'r1' }));

        expect(mockCreateCard).toHaveBeenCalledWith('r1', { content: 'hi', column: 'col1', color: undefined });
        expect(id).toBe('new-card');
    });

    it('surfaces a write failure via the error field and rethrows', async () => {
        mockVoteCard.mockRejectedValue(new Error('Sign-in required'));
        const { result } = renderHook(() => useOptimizedCards('r1', [card()]));

        let caught: unknown;
        await act(async () => {
            try {
                await result.current.voteCard('c1');
            } catch (err) {
                caught = err;
            }
        });

        expect(caught).toBeInstanceOf(Error);
        expect(result.current.error).toBe('Sign-in required');
    });

    it('toggleLike/setReaction/removeReaction delegate to the backend client', async () => {
        mockToggleLike.mockResolvedValue(card());
        mockSetReaction.mockResolvedValue(card());
        mockRemoveReaction.mockResolvedValue(card());
        const { result } = renderHook(() => useOptimizedCards('r1', [card()]));

        await act(() => result.current.toggleLike('c1', 'u1', 'Alice'));
        expect(mockToggleLike).toHaveBeenCalledWith('c1');

        await act(() => result.current.addReaction('c1', 'u1', 'Alice', '👍'));
        expect(mockSetReaction).toHaveBeenCalledWith('c1', '👍');

        await act(() => result.current.removeReaction('c1', 'u1'));
        expect(mockRemoveReaction).toHaveBeenCalledWith('c1');
    });

    it('reorderCards delegates to backendRetrospectiveClient.reorderCards (FR-010, atomic)', async () => {
        mockReorderCards.mockResolvedValue(undefined);
        const { result } = renderHook(() => useOptimizedCards('r1', []));
        await act(() => result.current.reorderCards([{ cardId: 'c1', order: 1 }]));
        expect(mockReorderCards).toHaveBeenCalledWith('r1', [{ cardId: 'c1', order: 1 }]);
    });

    it('getUserLiked/getGroupedReactions/getUserReaction read from the input cards', () => {
        const liked = card({ id: 'c1', likes: [{ userId: 'u1', username: 'Alice', timestamp: new Date() }], reactions: [{ userId: 'u1', username: 'Alice', emoji: '👍', timestamp: new Date() }] });
        const { result } = renderHook(() => useOptimizedCards('r1', [liked]));

        expect(result.current.getUserLiked('c1', 'u1')).toBe(true);
        expect(result.current.getUserLiked('c1', 'someone-else')).toBe(false);
        expect(result.current.getUserReaction('c1', 'u1')).toBe('👍');
        expect(result.current.getGroupedReactions('c1')).toEqual([{ emoji: '👍', count: 1, users: ['Alice'], userIds: ['u1'] }]);
    });
});
