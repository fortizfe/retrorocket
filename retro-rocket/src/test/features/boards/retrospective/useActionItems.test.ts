import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionItems } from '@/features/boards/retrospective/hooks/useActionItems';
import * as actionItemsApi from '@/features/boards/retrospective/services/actionItemsApiClient';

let mockSnapshot: { actionItems: unknown[] } | null = null;

vi.mock('@/features/boards/retrospective/contexts/BoardEventsProvider', () => ({
    useBoardEventsContext: () => ({ snapshot: mockSnapshot, connectionState: 'connected' }),
}));

vi.mock('@/features/boards/retrospective/services/actionItemsApiClient', () => ({
    createActionItem: vi.fn(),
    convertCardToActionItem: vi.fn(),
    updateActionItem: vi.fn(),
    deleteActionItem: vi.fn(),
    parseActionItemsSnapshot: (raw: Array<Record<string, unknown>>) =>
        raw.map((i) => ({ ...i, createdAt: new Date(i.createdAt as string), updatedAt: new Date(i.updatedAt as string), dueDate: i.dueDate ? new Date(i.dueDate as string) : null })),
}));

const mocked = vi.mocked(actionItemsApi);

const RAW_ITEM = {
    id: 'item-1', retrospectiveId: 'retro-1', content: 'Test item', createdBy: 'user-1',
    assignedTo: null, assignedToName: null, dueDate: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), order: 1,
};

describe('useActionItems', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSnapshot = null;
    });

    describe('Snapshot consumption', () => {
        it('is loading until a snapshot arrives', () => {
            const { result } = renderHook(() => useActionItems('retro-1'));
            expect(result.current.actionItems).toEqual([]);
            expect(result.current.loading).toBe(true);
            expect(result.current.error).toBeNull();
        });

        it('populates actionItems from the snapshot', () => {
            mockSnapshot = { actionItems: [RAW_ITEM] };
            const { result } = renderHook(() => useActionItems('retro-1'));

            expect(result.current.actionItems).toHaveLength(1);
            expect(result.current.actionItems[0].content).toBe('Test item');
            expect(result.current.loading).toBe(false);
        });
    });

    describe('createActionItem', () => {
        it('creates a new action item via the backend endpoint', async () => {
            mocked.createActionItem.mockResolvedValue(RAW_ITEM as never);
            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.createActionItem({
                    content: 'Test action item',
                    retrospectiveId: 'retro-1',
                    createdBy: 'user-1',
                    assignedTo: 'user-2',
                    assignedToName: 'John Doe'
                });
            });

            expect(mocked.createActionItem).toHaveBeenCalledWith('retro-1', {
                content: 'Test action item',
                assignedTo: 'user-2',
                assignedToName: 'John Doe',
                dueDate: undefined,
            });
        });

        it('does not call the backend when content is empty', async () => {
            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.createActionItem({ content: '', retrospectiveId: 'retro-1', createdBy: 'user-1' });
            });

            expect(mocked.createActionItem).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mocked.createActionItem.mockRejectedValue(new Error('Failed to create action item'));
            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.createActionItem({ content: 'Test', retrospectiveId: 'retro-1', createdBy: 'user-1' });
            });

            expect(result.current.error).toBe('Failed to create action item');
        });

        it('clears a previous error on a subsequent successful call', async () => {
            mocked.createActionItem.mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce(RAW_ITEM as never);
            const { result } = renderHook(() => useActionItems('retro-1'));
            const input = { content: 'Test action', retrospectiveId: 'retro-1', createdBy: 'user-1' };

            await act(async () => { await result.current.createActionItem(input); });
            expect(result.current.error).toBe('Failed');

            await act(async () => { await result.current.createActionItem(input); });
            expect(result.current.error).toBeNull();
        });
    });

    describe('updateActionItem / deleteActionItem', () => {
        it('updates an action item', async () => {
            mocked.updateActionItem.mockResolvedValue(RAW_ITEM as never);
            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.updateActionItem('item-1', { content: 'Updated content', assignedTo: 'user-3' });
            });

            expect(mocked.updateActionItem).toHaveBeenCalledWith('retro-1', 'item-1', { content: 'Updated content', assignedTo: 'user-3' });
        });

        it('deletes an action item', async () => {
            mocked.deleteActionItem.mockResolvedValue(undefined);
            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => { await result.current.deleteActionItem('item-1'); });

            expect(mocked.deleteActionItem).toHaveBeenCalledWith('retro-1', 'item-1');
        });
    });

    describe('convertCardToActionItem', () => {
        it('converts a card, ignoring the legacy facilitatorId arg (inferred server-side)', async () => {
            mocked.convertCardToActionItem.mockResolvedValue(RAW_ITEM as never);
            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.convertCardToActionItem('Card content', 'facilitator-1', 'user-1', 'John Doe');
            });

            expect(mocked.convertCardToActionItem).toHaveBeenCalledWith('retro-1', 'Card content', 'user-1', 'John Doe', undefined);
        });
    });

    describe('clearError', () => {
        it('resets error to null', () => {
            const { result } = renderHook(() => useActionItems('retro-1'));
            act(() => { result.current.clearError(); });
            expect(result.current.error).toBeNull();
        });
    });
});
