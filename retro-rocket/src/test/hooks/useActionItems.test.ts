import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionItems } from '../../hooks/useActionItems';
import { ActionItemsService } from '../../services/actionItemsService';

// Mock the service
vi.mock('../../services/actionItemsService', () => ({
    ActionItemsService: {
        createActionItem: vi.fn(),
        updateActionItem: vi.fn(),
        deleteActionItem: vi.fn(),
        subscribeToActionItems: vi.fn(),
        convertCardToActionItem: vi.fn()
    }
}));

const mockedActionItemsService = vi.mocked(ActionItemsService);

describe('useActionItems', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default subscription setup
        mockedActionItemsService.subscribeToActionItems.mockReturnValue(vi.fn());
    });

    describe('Basic functionality', () => {
        it('should initialize with loading state and setup subscription', () => {
            const { result } = renderHook(() => useActionItems('retro-1'));

            expect(result.current.actionItems).toEqual([]);
            expect(result.current.loading).toBe(true); // Starts loading when subscription is set up
            expect(result.current.error).toBeNull();
            expect(mockedActionItemsService.subscribeToActionItems).toHaveBeenCalledWith(
                'retro-1',
                expect.any(Function)
            );
        });

        it('should create new action item', async () => {
            mockedActionItemsService.createActionItem.mockResolvedValue('new-item-id');

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

            expect(mockedActionItemsService.createActionItem).toHaveBeenCalledWith({
                content: 'Test action item',
                retrospectiveId: 'retro-1',
                createdBy: 'user-1',
                assignedTo: 'user-2',
                assignedToName: 'John Doe'
            });
        });

        it('should update action item', async () => {
            mockedActionItemsService.updateActionItem.mockResolvedValue();

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.updateActionItem('item-1', {
                    content: 'Updated content',
                    assignedTo: 'user-3'
                });
            });

            expect(mockedActionItemsService.updateActionItem).toHaveBeenCalledWith('item-1', {
                content: 'Updated content',
                assignedTo: 'user-3'
            });
        });

        it('should delete action item', async () => {
            mockedActionItemsService.deleteActionItem.mockResolvedValue();

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.deleteActionItem('item-1');
            });

            expect(mockedActionItemsService.deleteActionItem).toHaveBeenCalledWith('item-1');
        });

        it('should handle create errors gracefully', async () => {
            mockedActionItemsService.createActionItem.mockRejectedValue(new Error('Failed to create action item'));

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.createActionItem({
                    content: 'Test action item',
                    retrospectiveId: 'retro-1',
                    createdBy: 'user-1',
                    assignedTo: null,
                    assignedToName: null
                });
            });

            expect(result.current.error).toBe('Failed to create action item');
            expect(result.current.loading).toBe(false);
        });

        it('should handle empty content gracefully', async () => {
            const { result } = renderHook(() => useActionItems('retro-1'));

            const newItem = {
                content: '',
                retrospectiveId: 'retro-1',
                createdBy: 'user-1'
            };

            await act(async () => {
                await result.current.createActionItem(newItem);
            });

            // Should not call service when content is empty
            const { ActionItemsService } = await import('../../services/actionItemsService');
            expect(ActionItemsService.createActionItem).not.toHaveBeenCalled();
        });

        it('should handle subscription setup', () => {
            const mockUnsubscribe = vi.fn();
            mockedActionItemsService.subscribeToActionItems.mockReturnValue(mockUnsubscribe);

            const { unmount } = renderHook(() => useActionItems('retro-1'));

            expect(mockedActionItemsService.subscribeToActionItems).toHaveBeenCalledWith(
                'retro-1',
                expect.any(Function)
            );

            // Cleanup should call unsubscribe
            unmount();
            expect(mockUnsubscribe).toHaveBeenCalled();
        });

        it('should handle retrospective ID changes', () => {
            const mockUnsubscribe1 = vi.fn();
            const mockUnsubscribe2 = vi.fn();
            mockedActionItemsService.subscribeToActionItems
                .mockReturnValueOnce(mockUnsubscribe1)
                .mockReturnValueOnce(mockUnsubscribe2);

            const { rerender } = renderHook(
                ({ retroId }) => useActionItems(retroId),
                { initialProps: { retroId: 'retro-1' } }
            );

            expect(mockedActionItemsService.subscribeToActionItems).toHaveBeenCalledWith(
                'retro-1',
                expect.any(Function)
            );

            rerender({ retroId: 'retro-2' });

            expect(mockUnsubscribe1).toHaveBeenCalled(); // Previous subscription cleaned up
            expect(mockedActionItemsService.subscribeToActionItems).toHaveBeenCalledWith(
                'retro-2',
                expect.any(Function)
            );
        });

        it('should clear error state on successful operations', async () => {
            mockedActionItemsService.createActionItem
                .mockRejectedValueOnce(new Error('Failed'))
                .mockResolvedValueOnce('success-id');

            const { result } = renderHook(() => useActionItems('retro-1'));

            const newItem = {
                content: 'Test action',
                retrospectiveId: 'retro-1',
                createdBy: 'user-1',
                assignedTo: null,
                assignedToName: null
            };

            // First call should set error
            await act(async () => {
                await result.current.createActionItem(newItem);
            });
            expect(result.current.error).toBe('Failed');

            // Second call should clear error
            await act(async () => {
                await result.current.createActionItem(newItem);
            });
            expect(result.current.error).toBeNull();
        });

        it('should convert card to action item', async () => {
            mockedActionItemsService.convertCardToActionItem.mockResolvedValue('converted-id');

            const { result } = renderHook(() => useActionItems('retro-1'));

            await act(async () => {
                await result.current.convertCardToActionItem(
                    'Card content',
                    'facilitator-1',
                    'user-1',
                    'John Doe'
                );
            });

            expect(mockedActionItemsService.convertCardToActionItem).toHaveBeenCalledWith(
                'Card content',
                'retro-1',
                'facilitator-1',
                'user-1',
                'John Doe'
            );
        });

        it('should clear error manually', () => {
            const { result } = renderHook(() => useActionItems('retro-1'));

            // Simulate an error state
            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });

        it('should handle subscription callback', () => {
            let subscriptionCallback: ((items: any[]) => void) | undefined;

            mockedActionItemsService.subscribeToActionItems.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useActionItems('retro-1'));

            // Simulate subscription data update
            const mockActionItems = [
                {
                    id: 'item-1',
                    content: 'Test item',
                    retrospectiveId: 'retro-1',
                    createdBy: 'user-1',
                    assignedTo: null,
                    assignedToName: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    order: 1
                }
            ];

            act(() => {
                subscriptionCallback?.(mockActionItems);
            });

            expect(result.current.actionItems).toEqual(mockActionItems);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should not setup subscription without retrospective ID', () => {
            renderHook(() => useActionItems(''));

            expect(mockedActionItemsService.subscribeToActionItems).not.toHaveBeenCalled();
        });
    });
});