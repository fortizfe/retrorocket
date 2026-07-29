import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionItems } from '@/features/boards/retrospective/hooks/useActionItems';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { ActionItem } from '@/features/boards/types/actionItem';

vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    createActionItem: vi.fn(),
    editActionItem: vi.fn(),
    deleteActionItem: vi.fn(),
    convertCardToActionItem: vi.fn(),
}));

const mockedClient = vi.mocked(backendRetrospectiveClient);

const mockActionItem: ActionItem = {
    id: 'item-1',
    content: 'Test item',
    retrospectiveId: 'retro-1',
    createdBy: 'user-1',
    assignedTo: null,
    assignedToName: null,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: 1,
};

describe('useActionItems', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('actionItems input', () => {
        it('reflects an empty actionItems input by default', () => {
            const { result } = renderHook(() => useActionItems('retro-1'));
            expect(result.current.actionItems).toEqual([]);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('reflects the actionItems passed in', () => {
            const { result } = renderHook(() => useActionItems('retro-1', [mockActionItem]));
            expect(result.current.actionItems).toEqual([mockActionItem]);
        });

        it('reflects a live update to the actionItems input across a rerender', () => {
            const { result, rerender } = renderHook(({ items }) => useActionItems('retro-1', items), {
                initialProps: { items: [] as ActionItem[] },
            });

            expect(result.current.actionItems).toEqual([]);

            rerender({ items: [mockActionItem] });

            expect(result.current.actionItems).toEqual([mockActionItem]);
        });
    });

    describe('createActionItem', () => {
        it('calls backendRetrospectiveClient.createActionItem', async () => {
            mockedClient.createActionItem.mockResolvedValue(mockActionItem);

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

            expect(mockedClient.createActionItem).toHaveBeenCalledWith('retro-1', {
                content: 'Test action item',
                assignedTo: 'user-2',
                assignedToName: 'John Doe',
                dueDate: undefined,
            });
        });

        it('does nothing when content is empty', async () => {
            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.createActionItem({ content: '', retrospectiveId: 'retro-1', createdBy: 'user-1' });
            });

            expect(mockedClient.createActionItem).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mockedClient.createActionItem.mockRejectedValue(new Error('Failed to create action item'));

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.createActionItem({ content: 'Test action item', retrospectiveId: 'retro-1', createdBy: 'user-1' });
            });

            expect(result.current.error).toBe('Failed to create action item');
        });

        it('clears a previous error on a subsequent successful call', async () => {
            mockedClient.createActionItem
                .mockRejectedValueOnce(new Error('Failed'))
                .mockResolvedValueOnce(mockActionItem);

            const { result } = renderHook(() => useActionItems('retro-1'));
            const newItem = { content: 'Test action', retrospectiveId: 'retro-1', createdBy: 'user-1' };

            await act(async () => {
                await result.current.createActionItem(newItem);
            });
            expect(result.current.error).toBe('Failed');

            await act(async () => {
                await result.current.createActionItem(newItem);
            });
            expect(result.current.error).toBeNull();
        });
    });

    describe('updateActionItem', () => {
        it('calls backendRetrospectiveClient.editActionItem — any participant, not just its creator (FR-015)', async () => {
            mockedClient.editActionItem.mockResolvedValue({ ...mockActionItem, content: 'Updated content' });

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.updateActionItem('item-1', { content: 'Updated content', assignedTo: 'user-3' });
            });

            expect(mockedClient.editActionItem).toHaveBeenCalledWith('item-1', {
                content: 'Updated content',
                assignedTo: 'user-3',
                assignedToName: undefined,
                dueDate: undefined,
            });
        });

        it('sets error on failure', async () => {
            mockedClient.editActionItem.mockRejectedValue(new Error('Update failed'));

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.updateActionItem('item-1', { content: 'x' });
            });

            expect(result.current.error).toBe('Update failed');
        });
    });

    describe('deleteActionItem', () => {
        it('calls backendRetrospectiveClient.deleteActionItem', async () => {
            mockedClient.deleteActionItem.mockResolvedValue(undefined);

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.deleteActionItem('item-1');
            });

            expect(mockedClient.deleteActionItem).toHaveBeenCalledWith('item-1');
        });

        it('sets error on failure', async () => {
            mockedClient.deleteActionItem.mockRejectedValue(new Error('Delete failed'));

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.deleteActionItem('item-1');
            });

            expect(result.current.error).toBe('Delete failed');
        });
    });

    describe('convertCardToActionItem', () => {
        it('calls backendRetrospectiveClient.convertCardToActionItem (feature 019, US5)', async () => {
            mockedClient.convertCardToActionItem.mockResolvedValue(mockActionItem);

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.convertCardToActionItem('card-1', 'user-1', 'John Doe');
            });

            expect(mockedClient.convertCardToActionItem).toHaveBeenCalledWith('card-1', {
                assignedTo: 'user-1',
                assignedToName: 'John Doe',
                dueDate: undefined,
            });
        });
    });

    describe('clearError', () => {
        it('resets error to null', () => {
            const { result } = renderHook(() => useActionItems('retro-1'));

            act(() => result.current.clearError());

            expect(result.current.error).toBeNull();
        });
    });
});
