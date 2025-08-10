import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnGrouping } from '../../hooks/useColumnGrouping';
import {
    saveColumnGroupingState,
    loadColumnGroupingState
} from '../../services/columnGroupingService';
import { Card } from '../../types/card';
import { GroupingCriteria, DEFAULT_GROUPING_STATE } from '../../types/columnGrouping';

// Mock the column grouping service
vi.mock('../../services/columnGroupingService', () => ({
    saveColumnGroupingState: vi.fn(),
    loadColumnGroupingState: vi.fn()
}));

const mockedColumnGroupingService = {
    saveColumnGroupingState: vi.mocked(saveColumnGroupingState),
    loadColumnGroupingState: vi.mocked(loadColumnGroupingState)
};

describe('useColumnGrouping', () => {
    const mockCards: Card[] = [
        {
            id: 'card-1',
            content: 'Test card 1',
            column: 'helped',
            createdBy: 'user-alice',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1'
        },
        {
            id: 'card-2',
            content: 'Test card 2',
            column: 'helped',
            createdBy: 'user-bob',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1'
        },
        {
            id: 'card-3',
            content: 'Test card 3',
            column: 'helped',
            createdBy: 'user-alice',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1'
        },
        {
            id: 'card-4',
            content: 'Test card 4',
            column: 'helped',
            createdBy: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockedColumnGroupingService.loadColumnGroupingState.mockResolvedValue({});
        mockedColumnGroupingService.saveColumnGroupingState.mockResolvedValue();
    });

    describe('Basic functionality', () => {
        it('should initialize without retrospective ID', () => {
            const { result } = renderHook(() => useColumnGrouping());

            expect(result.current.getColumnState('helped')).toEqual(DEFAULT_GROUPING_STATE);
            expect(mockedColumnGroupingService.loadColumnGroupingState).not.toHaveBeenCalled();
        });

        it('should load state from service when retrospective ID is provided', async () => {
            const mockLoadedStates = {
                helped: { criteria: 'user' as GroupingCriteria, activeGroups: ['group-1'] },
                hindered: { criteria: 'none' as GroupingCriteria, activeGroups: [] }
            };

            mockedColumnGroupingService.loadColumnGroupingState.mockResolvedValue(mockLoadedStates);

            const { result } = renderHook(() => useColumnGrouping('retro-1'));

            // Wait for the loading to complete
            await vi.waitFor(() => {
                expect(result.current.getColumnState('helped')).toEqual(mockLoadedStates.helped);
            });

            expect(mockedColumnGroupingService.loadColumnGroupingState).toHaveBeenCalledWith('retro-1');
            expect(result.current.getColumnState('hindered')).toEqual(mockLoadedStates.hindered);
        });

        it('should handle loading errors gracefully', async () => {
            mockedColumnGroupingService.loadColumnGroupingState.mockRejectedValue(new Error('Load failed'));

            const { result } = renderHook(() => useColumnGrouping('retro-1'));

            await vi.waitFor(() => {
                expect(result.current.getColumnState('helped')).toEqual(DEFAULT_GROUPING_STATE);
            });

            expect(mockedColumnGroupingService.loadColumnGroupingState).toHaveBeenCalledWith('retro-1');
        });

        it('should not load state multiple times', async () => {
            const { rerender } = renderHook(() => useColumnGrouping('retro-1'));

            await vi.waitFor(() => {
                expect(mockedColumnGroupingService.loadColumnGroupingState).toHaveBeenCalledTimes(1);
            });

            // Rerender should not trigger another load
            rerender();
            expect(mockedColumnGroupingService.loadColumnGroupingState).toHaveBeenCalledTimes(1);
        });
    });

    describe('Grouping criteria management', () => {
        it('should set grouping criteria and save to service', async () => {
            const { result } = renderHook(() => useColumnGrouping('retro-1'));

            // Wait for initial loading to complete
            await vi.waitFor(() => {
                expect(mockedColumnGroupingService.loadColumnGroupingState).toHaveBeenCalled();
            });

            await act(async () => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('none');
            expect(mockedColumnGroupingService.saveColumnGroupingState).toHaveBeenCalledWith(
                'retro-1',
                expect.objectContaining({
                    helped: expect.objectContaining({ criteria: 'none' })
                })
            );
        });

        it('should not save to service without retrospective ID', () => {
            const { result } = renderHook(() => useColumnGrouping());

            act(() => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('none');
            expect(mockedColumnGroupingService.saveColumnGroupingState).not.toHaveBeenCalled();
        });

        it('should handle save errors gracefully', async () => {
            mockedColumnGroupingService.saveColumnGroupingState.mockRejectedValue(new Error('Save failed'));

            const { result } = renderHook(() => useColumnGrouping('retro-1'));

            // Wait for initial loading to complete
            await vi.waitFor(() => {
                expect(mockedColumnGroupingService.loadColumnGroupingState).toHaveBeenCalled();
            });

            await act(async () => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            // State should still be updated even if save fails
            expect(result.current.getColumnState('helped').criteria).toBe('none');
        });

        it('should store previous state when moving to suggestions', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Set initial state
            act(() => {
                result.current.setGroupingCriteria('helped', 'user');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('user');

            // Move to suggestions - should store previous state
            act(() => {
                result.current.setGroupingCriteria('helped', 'suggestions');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('suggestions');

            // Restore previous state
            act(() => {
                result.current.restorePreviousState('helped');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('user');
        });

        it('should not store previous state when already in suggestions', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Set to suggestions initially
            act(() => {
                result.current.setGroupingCriteria('helped', 'suggestions');
            });

            // Change to suggestions again - should not store anything
            act(() => {
                result.current.setGroupingCriteria('helped', 'suggestions');
            });

            // Restore should fall back to default since no previous state
            act(() => {
                result.current.restorePreviousState('helped');
            });

            expect(result.current.getColumnState('helped')).toEqual(DEFAULT_GROUPING_STATE);
        });
    });

    describe('Card grouping functionality', () => {
        it('should group cards by none criteria', () => {
            const { result } = renderHook(() => useColumnGrouping());

            const grouped = result.current.groupCards(mockCards, 'none');

            expect(grouped).toEqual({
                ungrouped: mockCards
            });
        });

        it('should group cards by user criteria', () => {
            const { result } = renderHook(() => useColumnGrouping());

            const grouped = result.current.groupCards(mockCards, 'user');

            expect(grouped).toEqual({
                'Sin autor': [mockCards[3]], // Card with empty createdBy
                'user-alice': [mockCards[0], mockCards[2]], // Alice's cards
                'user-bob': [mockCards[1]] // Bob's card
            });
        });

        it('should sort user groups alphabetically', () => {
            const { result } = renderHook(() => useColumnGrouping());

            const cardsWithMoreUsers: Card[] = [
                { ...mockCards[0], createdBy: 'user-zorro' },
                { ...mockCards[1], createdBy: 'user-alpha' },
                { ...mockCards[2], createdBy: 'user-beta' }
            ];

            const grouped = result.current.groupCards(cardsWithMoreUsers, 'user');
            const groupKeys = Object.keys(grouped);

            expect(groupKeys).toEqual(['user-alpha', 'user-beta', 'user-zorro']);
        });

        it('should handle suggestions criteria as ungrouped', () => {
            const { result } = renderHook(() => useColumnGrouping());

            const grouped = result.current.groupCards(mockCards, 'suggestions');

            expect(grouped).toEqual({
                ungrouped: mockCards
            });
        });
    });

    describe('Card processing', () => {
        it('should process cards for a column with current state', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Set grouping criteria to user
            act(() => {
                result.current.setGroupingCriteria('helped', 'user');
            });

            const processed = result.current.processCards(mockCards, 'helped');

            expect(processed).toEqual({
                'Sin autor': [mockCards[3]],
                'user-alice': [mockCards[0], mockCards[2]],
                'user-bob': [mockCards[1]]
            });
        });

        it('should process cards with default state for unknown column', () => {
            const { result } = renderHook(() => useColumnGrouping());

            const processed = result.current.processCards(mockCards, 'unknown-column');

            // Default state is 'user' grouping
            expect(processed).toEqual({
                'Sin autor': [mockCards[3]],
                'user-alice': [mockCards[0], mockCards[2]],
                'user-bob': [mockCards[1]]
            });
        });
    });

    describe('State management', () => {
        it('should reset grouping for a column', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Set custom state
            act(() => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('none');

            // Reset to default
            act(() => {
                result.current.resetGrouping('helped');
            });

            expect(result.current.getColumnState('helped')).toEqual(DEFAULT_GROUPING_STATE);
        });

        it('should restore previous state correctly', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Set initial state
            act(() => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            // Move to suggestions (stores previous state)
            act(() => {
                result.current.setGroupingCriteria('helped', 'suggestions');
            });

            // Restore previous state
            act(() => {
                result.current.restorePreviousState('helped');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('none');
        });

        it('should reset to default when no previous state exists', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Try to restore without setting any previous state
            act(() => {
                result.current.restorePreviousState('helped');
            });

            expect(result.current.getColumnState('helped')).toEqual(DEFAULT_GROUPING_STATE);
        });

        it('should clean up previous state after restoration', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Set initial state
            act(() => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            // Move to suggestions (stores previous state)
            act(() => {
                result.current.setGroupingCriteria('helped', 'suggestions');
            });

            // Restore previous state (should clean up)
            act(() => {
                result.current.restorePreviousState('helped');
            });

            // Try to restore again - should fall back to default
            act(() => {
                result.current.restorePreviousState('helped');
            });

            expect(result.current.getColumnState('helped')).toEqual(DEFAULT_GROUPING_STATE);
        });
    });

    describe('Integration scenarios', () => {
        it('should handle multiple columns independently', async () => {
            const { result } = renderHook(() => useColumnGrouping('retro-1'));

            // Wait for initial loading to complete
            await vi.waitFor(() => {
                expect(mockedColumnGroupingService.loadColumnGroupingState).toHaveBeenCalled();
            });

            await act(async () => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            await act(async () => {
                result.current.setGroupingCriteria('hindered', 'user');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('none');
            expect(result.current.getColumnState('hindered').criteria).toBe('user');

            expect(mockedColumnGroupingService.saveColumnGroupingState).toHaveBeenCalledTimes(2);
        });

        it('should preserve state across criteria changes', () => {
            const { result } = renderHook(() => useColumnGrouping());

            // Set initial state with active groups
            act(() => {
                result.current.setGroupingCriteria('helped', 'user');
            });

            const stateAfterUser = result.current.getColumnState('helped');

            // Change criteria but preserve other state
            act(() => {
                result.current.setGroupingCriteria('helped', 'none');
            });

            const stateAfterNone = result.current.getColumnState('helped');

            expect(stateAfterNone.criteria).toBe('none');
            expect(stateAfterNone.activeGroups).toEqual(stateAfterUser.activeGroups);
        });

        it('should handle complex workflow with loaded state', async () => {
            const mockLoadedStates = {
                helped: { criteria: 'user' as GroupingCriteria, activeGroups: ['group-1'] }
            };

            mockedColumnGroupingService.loadColumnGroupingState.mockResolvedValue(mockLoadedStates);

            const { result } = renderHook(() => useColumnGrouping('retro-1'));

            // Wait for loading
            await vi.waitFor(() => {
                expect(result.current.getColumnState('helped')).toEqual(mockLoadedStates.helped);
            });

            // Change to suggestions (stores loaded state as previous)
            await act(async () => {
                result.current.setGroupingCriteria('helped', 'suggestions');
            });

            expect(result.current.getColumnState('helped').criteria).toBe('suggestions');

            // Restore should go back to loaded state
            act(() => {
                result.current.restorePreviousState('helped');
            });

            expect(result.current.getColumnState('helped')).toEqual(mockLoadedStates.helped);
        });
    });
});
