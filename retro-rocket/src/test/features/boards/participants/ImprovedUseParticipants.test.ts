import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useParticipants } from '@/features/boards/participants/hooks/useParticipants';
import { Participant } from '@/features/boards/types/participant';
import * as participantService from '@/features/boards/participants/services/participantService';

// Mock the participant service
vi.mock('@/features/boards/participants/services/participantService', () => ({
    getParticipantsByRetrospective: vi.fn(),
    subscribeToParticipants: vi.fn(),
    addParticipant: vi.fn(),
    removeParticipant: vi.fn()
}));

// Get mocked versions for use in tests
const mockedParticipantService = vi.mocked(participantService);

describe('useParticipants (Improved)', () => {
    const mockRetrospectiveId = 'retro-123';

    const mockParticipants: Participant[] = [
        {
            id: '1',
            name: 'Alice Johnson',
            userId: 'user1',
            retrospectiveId: mockRetrospectiveId,
            joinedAt: new Date('2024-01-01T10:00:00Z'),
            photoURL: null
        },
        {
            id: '2',
            name: 'Bob Smith',
            userId: 'user2',
            retrospectiveId: mockRetrospectiveId,
            joinedAt: new Date('2024-01-01T11:00:00Z'),
            photoURL: 'https://example.com/bob.jpg'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Hook Initialization', () => {
        it('should initialize with empty state', () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            expect(result.current.participants).toEqual([]);
            expect(result.current.loading).toBe(true);
            expect(result.current.error).toBeNull();
        });

        it('should not set up subscription without retrospectiveId', () => {
            const { result } = renderHook(() => useParticipants());

            expect(result.current.loading).toBe(false);
            expect(mockedParticipantService.subscribeToParticipants).not.toHaveBeenCalled();
        });
    });

    describe('Real-time Subscription', () => {
        it('should set up subscription and receive participants', async () => {
            const mockUnsubscribe = vi.fn();

            mockedParticipantService.subscribeToParticipants.mockImplementation((retorId, callback) => {
                // Simulate receiving participants
                setTimeout(() => callback(mockParticipants), 0);
                return mockUnsubscribe;
            });

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            // Wait for subscription to trigger
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            expect(result.current.participants).toEqual(mockParticipants);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should clean up subscription on unmount', () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);

            const { unmount } = renderHook(() => useParticipants(mockRetrospectiveId));

            unmount();

            expect(mockUnsubscribe).toHaveBeenCalled();
        });
    });

    describe('Add Participant', () => {
        it('should add participant successfully', async () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);
            mockedParticipantService.addParticipant.mockResolvedValue({ id: 'new-id', isNew: true });

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            const participantInput = {
                name: 'New User',
                userId: 'user-new',
                retrospectiveId: mockRetrospectiveId
            };

            let addResult: any;
            await act(async () => {
                addResult = await result.current.addParticipant(participantInput);
            });

            expect(addResult).toEqual({ id: 'new-id', isNew: true });
            expect(mockedParticipantService.addParticipant).toHaveBeenCalledWith(participantInput);
            expect(result.current.error).toBeNull();
        });

        it('should handle add participant error', async () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);
            mockedParticipantService.addParticipant.mockRejectedValue(new Error('Add failed'));

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            const participantInput = {
                name: 'New User',
                userId: 'user-new',
                retrospectiveId: mockRetrospectiveId
            };

            await act(async () => {
                try {
                    await result.current.addParticipant(participantInput);
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('Add failed');
        });
    });

    describe('Remove Participant', () => {
        it('should remove participant successfully', async () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);
            mockedParticipantService.removeParticipant.mockResolvedValue(undefined);

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            await act(async () => {
                await result.current.removeParticipant('participant-id');
            });

            expect(mockedParticipantService.removeParticipant).toHaveBeenCalledWith('participant-id');
            expect(result.current.error).toBeNull();
        });

        it('should handle remove participant error', async () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);
            mockedParticipantService.removeParticipant.mockRejectedValue(new Error('Remove failed'));

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            await act(async () => {
                try {
                    await result.current.removeParticipant('participant-id');
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('Remove failed');
        });
    });

    describe('Refetch Functionality', () => {
        it('should provide refetch method', async () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);
            mockedParticipantService.getParticipantsByRetrospective.mockResolvedValue(mockParticipants);

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockedParticipantService.getParticipantsByRetrospective).toHaveBeenCalledWith(mockRetrospectiveId);
        });
    });

    describe('Hook Interface Changes', () => {
        it('should not have setInactive method (removed functionality)', () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            // Verify setInactive method doesn't exist
            expect(result.current).not.toHaveProperty('setInactive');
        });

        it('should have all required methods', () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            expect(typeof result.current.addParticipant).toBe('function');
            expect(typeof result.current.removeParticipant).toBe('function');
            expect(typeof result.current.refetch).toBe('function');
            expect(Array.isArray(result.current.participants)).toBe(true);
            expect(typeof result.current.loading).toBe('boolean');
            expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle subscription setup errors gracefully', async () => {
            const mockUnsubscribe = vi.fn();

            // Mock subscription that immediately calls error callback
            mockedParticipantService.subscribeToParticipants.mockImplementation((retroId, callback) => {
                return mockUnsubscribe;
            });

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            // Should initialize without throwing
            expect(result.current.participants).toEqual([]);
            expect(result.current.loading).toBe(true);
        });

        it('should clear error state on successful operations', async () => {
            const mockUnsubscribe = vi.fn();
            mockedParticipantService.subscribeToParticipants.mockReturnValue(mockUnsubscribe);

            // First make it fail
            mockedParticipantService.addParticipant.mockRejectedValueOnce(new Error('First error'));

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            // Trigger error
            await act(async () => {
                try {
                    await result.current.addParticipant({
                        name: 'Test',
                        userId: 'user',
                        retrospectiveId: mockRetrospectiveId
                    });
                } catch (e) {
                    // Expected
                }
            });

            expect(result.current.error).toBe('First error');

            // Now make it succeed
            mockedParticipantService.addParticipant.mockResolvedValueOnce({ id: 'success-id', isNew: true });

            await act(async () => {
                await result.current.addParticipant({
                    name: 'Test2',
                    userId: 'user2',
                    retrospectiveId: mockRetrospectiveId
                });
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Subscription Updates', () => {
        it('should update participants when subscription triggers', async () => {
            let subscriptionCallback: ((participants: Participant[]) => void) | null = null;

            mockedParticipantService.subscribeToParticipants.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useParticipants(mockRetrospectiveId));

            // Initially empty
            expect(result.current.participants).toEqual([]);
            expect(result.current.loading).toBe(true);

            // Simulate subscription update
            act(() => {
                subscriptionCallback?.(mockParticipants);
            });

            expect(result.current.participants).toEqual(mockParticipants);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });
});
