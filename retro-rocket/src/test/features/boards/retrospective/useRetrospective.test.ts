import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRetrospective } from '@/features/boards/retrospective/hooks/useRetrospective';
import * as retrospectiveService from '@/features/boards/retrospective/services/retrospectiveService';
import { Retrospective } from '@/features/boards/types/retrospective';

// Mock the service
vi.mock('@/features/boards/retrospective/services/retrospectiveService');

const mockRetrospectiveService = retrospectiveService as any;

describe('useRetrospective Hook', () => {
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-123';

    const mockRetrospective: Retrospective = {
        id: mockRetrospectiveId,
        title: 'Test Retrospective',
        description: 'A test retrospective for unit testing',
        createdBy: mockUserId,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        participantCount: 2,
        isActive: true
    };

    const mockCreateInput: retrospectiveService.CreateRetrospectiveInput = {
        title: 'New Retrospective',
        description: 'A new retrospective',
        createdBy: mockUserId,
        createdByName: 'Test Facilitator'
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock default behavior
        mockRetrospectiveService.getRetrospective.mockResolvedValue(mockRetrospective);
        mockRetrospectiveService.subscribeToRetrospective.mockImplementation((id: string, callback: Function) => {
            // Use a minimal timeout to allow initial state to be observed
            const timeoutId = setTimeout(() => callback(mockRetrospective), 10);
            return () => clearTimeout(timeoutId); // Return cleanup function
        });
        mockRetrospectiveService.updateRetrospective.mockResolvedValue(undefined);
        mockRetrospectiveService.createRetrospective.mockResolvedValue('new-retro-id');
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.clearAllTimers();
    });

    describe('Initialization', () => {
        it('should initialize with loading state', () => {
            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            expect(result.current.loading).toBe(true);
            expect(result.current.retrospective).toBe(null);
            expect(result.current.error).toBe(null);
        });

        it('should not fetch when retrospectiveId is undefined', () => {
            const { result } = renderHook(() => useRetrospective());

            expect(result.current.loading).toBe(false);
            expect(mockRetrospectiveService.subscribeToRetrospective).not.toHaveBeenCalled();
        });

        it('should set up subscription when retrospectiveId is provided', async () => {
            renderHook(() => useRetrospective(mockRetrospectiveId));

            await waitFor(() => {
                expect(mockRetrospectiveService.subscribeToRetrospective).toHaveBeenCalledWith(
                    mockRetrospectiveId,
                    expect.any(Function)
                );
            });
        });

        it('should load retrospective from subscription', async () => {
            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.retrospective).toEqual(mockRetrospective);
                expect(result.current.error).toBe(null);
            });
        });

        it('should handle null retrospective from subscription', async () => {
            mockRetrospectiveService.subscribeToRetrospective.mockImplementation((id: string, callback: Function) => {
                callback(null);
                return vi.fn();
            });

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.retrospective).toBe(null);
                expect(result.current.error).toBe('Retrospective not found');
            });
        });
    });

    describe('Update Retrospective', () => {
        it('should update retrospective successfully', async () => {
            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            const updates = { title: 'Updated Title', description: 'Updated Description' };

            await act(async () => {
                await result.current.updateRetrospective(updates);
            });

            expect(mockRetrospectiveService.updateRetrospective).toHaveBeenCalledWith(mockRetrospectiveId, updates);
            expect(result.current.error).toBe(null);
        });

        it('should handle update error', async () => {
            const errorMessage = 'Failed to update retrospective';
            mockRetrospectiveService.updateRetrospective.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

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
            mockRetrospectiveService.updateRetrospective.mockRejectedValue('String error');

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await act(async () => {
                await expect(result.current.updateRetrospective({})).rejects.toThrow('Error updating retrospective');
            });

            expect(result.current.error).toBe('Error updating retrospective');
        });
    });

    describe('Create Retrospective', () => {
        it('should create retrospective successfully', async () => {
            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await act(async () => {
                const newId = await result.current.createRetrospective(mockCreateInput);
                expect(newId).toBe('new-retro-id');
            });

            expect(mockRetrospectiveService.createRetrospective).toHaveBeenCalledWith(mockCreateInput);
            expect(result.current.error).toBe(null);
        });

        it('should handle create error', async () => {
            const errorMessage = 'Failed to create retrospective';
            mockRetrospectiveService.createRetrospective.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await act(async () => {
                await expect(result.current.createRetrospective(mockCreateInput)).rejects.toThrow(errorMessage);
            });

            expect(result.current.error).toBe(errorMessage);
        });

        it('should handle non-Error exceptions in create', async () => {
            mockRetrospectiveService.createRetrospective.mockRejectedValue('String error');

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await act(async () => {
                await expect(result.current.createRetrospective(mockCreateInput)).rejects.toThrow('Error creating retrospective');
            });

            expect(result.current.error).toBe('Error creating retrospective');
        });

        it('should set loading state during creation', async () => {
            let resolveCreate: Function;
            const createPromise = new Promise((resolve) => {
                resolveCreate = resolve;
            });
            mockRetrospectiveService.createRetrospective.mockReturnValue(createPromise);

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            // Start creation
            act(() => {
                result.current.createRetrospective(mockCreateInput);
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(true);
            });

            // Complete creation
            act(() => {
                resolveCreate!('new-id');
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });
    });

    describe('Refetch', () => {
        it('should refetch retrospective data', async () => {
            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockRetrospectiveService.getRetrospective).toHaveBeenCalledWith(mockRetrospectiveId);
        });

        it('should not refetch when retrospectiveId is undefined', async () => {
            const { result } = renderHook(() => useRetrospective());

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockRetrospectiveService.getRetrospective).not.toHaveBeenCalled();
        });

        it('should handle refetch error', async () => {
            const errorMessage = 'Failed to fetch retrospective';
            mockRetrospectiveService.getRetrospective.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await act(async () => {
                await result.current.refetch();
            });

            await waitFor(() => {
                expect(result.current.error).toBe(errorMessage);
                expect(result.current.retrospective).toBe(null);
                expect(result.current.loading).toBe(false);
            });
        });

        it('should handle non-Error exceptions in refetch', async () => {
            mockRetrospectiveService.getRetrospective.mockRejectedValue('String error');

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await act(async () => {
                await result.current.refetch();
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Error fetching retrospective data');
                expect(result.current.retrospective).toBe(null);
                expect(result.current.loading).toBe(false);
            });
        });
    });

    describe('Cleanup', () => {
        it('should unsubscribe on unmount', () => {
            const unsubscribeMock = vi.fn();
            mockRetrospectiveService.subscribeToRetrospective.mockReturnValue(unsubscribeMock);

            const { unmount } = renderHook(() => useRetrospective(mockRetrospectiveId));

            unmount();

            expect(unsubscribeMock).toHaveBeenCalled();
        });

        it('should unsubscribe when retrospectiveId changes', () => {
            const unsubscribeMock = vi.fn();
            mockRetrospectiveService.subscribeToRetrospective.mockReturnValue(unsubscribeMock);

            const { rerender } = renderHook(
                ({ retrospectiveId }) => useRetrospective(retrospectiveId),
                { initialProps: { retrospectiveId: mockRetrospectiveId } }
            );

            rerender({ retrospectiveId: 'new-retro-id' });

            expect(unsubscribeMock).toHaveBeenCalled();
        });
    });

    describe('Error Scenarios', () => {
        it('should handle subscription callback errors gracefully', async () => {
            mockRetrospectiveService.subscribeToRetrospective.mockImplementation((id: string, callback: Function) => {
                try {
                    callback(mockRetrospective);
                } catch (error) {
                    console.error('Callback error in test:', error);
                }
                return vi.fn();
            });

            const { result } = renderHook(() => useRetrospective(mockRetrospectiveId));

            await waitFor(() => {
                expect(result.current.retrospective).toEqual(mockRetrospective);
            });
        });

        it('should reset state properly when retrospectiveId changes from defined to undefined', () => {
            interface TestProps {
                retrospectiveId?: string;
            }

            const { rerender, result } = renderHook(
                ({ retrospectiveId }: TestProps) => useRetrospective(retrospectiveId),
                { initialProps: { retrospectiveId: mockRetrospectiveId } as TestProps }
            );

            rerender({ retrospectiveId: undefined } as TestProps);

            expect(result.current.loading).toBe(false);
        });
    });
});
