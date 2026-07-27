import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRetrospective } from '@/features/boards/retrospective/hooks/useRetrospective';
import * as boardsApi from '@/features/boards/retrospective/services/boardsApiClient';
import { Retrospective } from '@/features/boards/types/retrospective';

vi.mock('@/features/boards/retrospective/services/boardsApiClient', () => ({
    getBoard: vi.fn(),
    renameBoard: vi.fn(),
}));

const mocked = vi.mocked(boardsApi);

describe('useRetrospective', () => {
    const RETRO_ID = 'retro-123';

    const mockRetrospective: Retrospective = {
        id: RETRO_ID,
        title: 'Test Retrospective',
        description: 'A test retrospective for unit testing',
        createdBy: 'user-123',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        participantCount: 2,
        isActive: true
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocked.getBoard.mockResolvedValue(mockRetrospective);
        mocked.renameBoard.mockResolvedValue(mockRetrospective);
    });

    describe('Initialization', () => {
        it('should initialize with loading state', () => {
            const { result } = renderHook(() => useRetrospective(RETRO_ID));
            expect(result.current.loading).toBe(true);
            expect(result.current.retrospective).toBe(null);
            expect(result.current.error).toBe(null);
        });

        it('should not fetch when retrospectiveId is undefined', () => {
            const { result } = renderHook(() => useRetrospective());
            expect(result.current.loading).toBe(false);
            expect(mocked.getBoard).not.toHaveBeenCalled();
        });

        it('fetches the board once via GET /api/boards/:id (one-time — no subscription)', async () => {
            renderHook(() => useRetrospective(RETRO_ID));
            await waitFor(() => expect(mocked.getBoard).toHaveBeenCalledWith(RETRO_ID));
            expect(mocked.getBoard).toHaveBeenCalledTimes(1);
        });

        it('should load retrospective from the fetch', async () => {
            const { result } = renderHook(() => useRetrospective(RETRO_ID));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.retrospective).toEqual(mockRetrospective);
                expect(result.current.error).toBe(null);
            });
        });

        it('sets an error and null retrospective when the fetch fails (e.g. 404)', async () => {
            mocked.getBoard.mockRejectedValue(new Error('Board not found'));

            const { result } = renderHook(() => useRetrospective(RETRO_ID));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.retrospective).toBe(null);
                expect(result.current.error).toBe('Board not found');
            });
        });
    });

    describe('updateRetrospective', () => {
        it('renames the board via PATCH /api/boards/:id and updates local state', async () => {
            const { result } = renderHook(() => useRetrospective(RETRO_ID));
            await waitFor(() => expect(result.current.loading).toBe(false));

            const updated = { ...mockRetrospective, title: 'Updated Title' };
            mocked.renameBoard.mockResolvedValue(updated);

            await act(async () => {
                await result.current.updateRetrospective({ title: 'Updated Title' });
            });

            expect(mocked.renameBoard).toHaveBeenCalledWith(RETRO_ID, { title: 'Updated Title', description: undefined });
            expect(result.current.retrospective?.title).toBe('Updated Title');
        });

        it('should handle update error', async () => {
            const errorMessage = 'Failed to update retrospective';
            mocked.renameBoard.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useRetrospective(RETRO_ID));

            await act(async () => {
                await expect(result.current.updateRetrospective({})).rejects.toThrow(errorMessage);
            });

            expect(result.current.error).toBe(errorMessage);
        });

        it('should throw error when no retrospectiveId is provided', async () => {
            const { result } = renderHook(() => useRetrospective());

            await act(async () => {
                await expect(result.current.updateRetrospective({})).rejects.toThrow('No retrospective ID provided');
            });
        });

        it('should handle non-Error exceptions in update', async () => {
            mocked.renameBoard.mockRejectedValue('String error');

            const { result } = renderHook(() => useRetrospective(RETRO_ID));

            await act(async () => {
                await expect(result.current.updateRetrospective({})).rejects.toThrow('Error updating retrospective');
            });

            expect(result.current.error).toBe('Error updating retrospective');
        });
    });

    describe('Refetch', () => {
        it('should refetch retrospective data', async () => {
            const { result } = renderHook(() => useRetrospective(RETRO_ID));
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.refetch();
            });

            expect(mocked.getBoard).toHaveBeenCalledWith(RETRO_ID);
        });

        it('should not refetch when retrospectiveId is undefined', async () => {
            const { result } = renderHook(() => useRetrospective());

            await act(async () => {
                await result.current.refetch();
            });

            expect(mocked.getBoard).not.toHaveBeenCalled();
        });
    });

    describe('Reactivity', () => {
        it('re-fetches when retrospectiveId changes', async () => {
            const { rerender } = renderHook(({ id }) => useRetrospective(id), { initialProps: { id: RETRO_ID } });
            await waitFor(() => expect(mocked.getBoard).toHaveBeenCalledWith(RETRO_ID));

            rerender({ id: 'other-retro' });
            await waitFor(() => expect(mocked.getBoard).toHaveBeenCalledWith('other-retro'));
        });

        it('resets to a non-loading state when retrospectiveId changes from defined to undefined', async () => {
            const { rerender, result } = renderHook(
                ({ id }: { id?: string }) => useRetrospective(id),
                { initialProps: { id: RETRO_ID } as { id?: string } },
            );
            await waitFor(() => expect(result.current.loading).toBe(false));

            rerender({ id: undefined });
            expect(result.current.loading).toBe(false);
        });
    });
});
