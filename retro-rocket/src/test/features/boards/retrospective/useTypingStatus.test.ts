import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingStatus } from '@/features/boards/retrospective/hooks/useTypingStatus';
import { OptimizedTypingStatusService } from '@/features/boards/retrospective/services/OptimizedTypingStatusService';
import { FirebaseMetricsService } from '@/lib/services/FirebaseMetricsService';

// Mock the services
vi.mock('@/features/boards/retrospective/services/OptimizedTypingStatusService');
vi.mock('@/lib/services/FirebaseMetricsService');

describe('useTypingStatus Hook', () => {
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-123';
    const mockUsername = 'testuser';

    const mockTypingStatuses = [
        {
            userId: 'user-456',
            username: 'otheruser',
            retrospectiveId: mockRetrospectiveId,
            column: 'good',
            isActive: true,
            timestamp: new Date()
        },
        {
            userId: 'user-789',
            username: 'thirduser',
            retrospectiveId: mockRetrospectiveId,
            column: 'bad',
            isActive: true,
            timestamp: new Date()
        }
    ];

    let mockUnsubscribe: ReturnType<typeof vi.fn>;
    let mockSubscribeToTypingStatus: ReturnType<typeof vi.fn>;
    let mockCleanupUserTypingStatus: ReturnType<typeof vi.fn>;
    let mockSetTypingStatusDebounced: ReturnType<typeof vi.fn>;
    let mockRecordRead: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockUnsubscribe = vi.fn();
        mockSubscribeToTypingStatus = vi.fn().mockReturnValue(mockUnsubscribe);
        mockCleanupUserTypingStatus = vi.fn();
        mockSetTypingStatusDebounced = vi.fn();
        mockRecordRead = vi.fn();

        vi.mocked(OptimizedTypingStatusService.subscribeToTypingStatus).mockImplementation(mockSubscribeToTypingStatus);
        vi.mocked(OptimizedTypingStatusService.cleanupUserTypingStatus).mockImplementation(mockCleanupUserTypingStatus);
        vi.mocked(OptimizedTypingStatusService.setTypingStatusDebounced).mockImplementation(mockSetTypingStatusDebounced);
        vi.mocked(FirebaseMetricsService.recordRead).mockImplementation(mockRecordRead);

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('Initialization', () => {
        it('should subscribe to typing status on mount', () => {
            renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            expect(mockSubscribeToTypingStatus).toHaveBeenCalledWith(
                mockRetrospectiveId,
                expect.any(Function)
            );
        });

        it('should not subscribe without retrospectiveId', () => {
            renderHook(() => useTypingStatus({
                retrospectiveId: '',
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            expect(mockSubscribeToTypingStatus).not.toHaveBeenCalled();
        });

        it('should filter out current user from typing statuses', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            // Get the callback function passed to subscribe
            const callback = mockSubscribeToTypingStatus.mock.calls[0][1];

            // Call it with statuses including current user
            const statusesIncludingCurrentUser = [
                ...mockTypingStatuses,
                {
                    userId: mockUserId,
                    username: mockUsername,
                    retrospectiveId: mockRetrospectiveId,
                    column: 'good',
                    isActive: true,
                    timestamp: new Date()
                }
            ];

            act(() => {
                callback(statusesIncludingCurrentUser);
            });

            expect(result.current.typingIndicators).toHaveLength(2);
            expect(result.current.typingIndicators.every(indicator => indicator.userId !== mockUserId)).toBe(true);
        });
    });

    describe('Cleanup', () => {
        it('should cleanup on unmount', () => {
            const { unmount } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            unmount();

            expect(mockCleanupUserTypingStatus).toHaveBeenCalledWith(mockUserId, mockRetrospectiveId);
            expect(mockUnsubscribe).toHaveBeenCalled();
        });

        it('should setup beforeunload event listener', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
        });
    });

    describe('startTyping', () => {
        it('should start typing for a column', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            act(() => {
                result.current.startTyping('good');
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'good',
                isActive: true
            });
        });

        it('should not start typing without user info', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId
            }));

            act(() => {
                result.current.startTyping('good');
            });

            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalled();
        });

        it('should auto-stop typing after timeout', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            act(() => {
                result.current.startTyping('good');
            });

            // First call should be start typing
            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'good',
                isActive: true
            });

            // Clear the mock to check for stop call
            mockSetTypingStatusDebounced.mockClear();

            // Fast-forward time to trigger auto-stop
            act(() => {
                vi.advanceTimersByTime(4000);
            });

            // Should call stop typing
            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'good',
                isActive: false
            });
        });

        it('should throttle rapid typing updates', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            // Start typing multiple times rapidly
            act(() => {
                result.current.startTyping('good');
                result.current.startTyping('good');
                result.current.startTyping('good');
            });

            // Should only call setTypingStatusDebounced once due to throttling
            expect(mockSetTypingStatusDebounced).toHaveBeenCalledTimes(1);
        });
    });

    describe('stopTyping', () => {
        it('should stop typing for a column', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            // First start typing to mark column as active
            act(() => {
                result.current.startTyping('good');
            });

            mockSetTypingStatusDebounced.mockClear();

            act(() => {
                result.current.stopTyping('good');
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'good',
                isActive: false
            });
        });

        it('should not stop typing for inactive column', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            act(() => {
                result.current.stopTyping('good');
            });

            // Should not call service since column was not active
            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalled();
        });

        it('should not stop typing without user info', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId
            }));

            act(() => {
                result.current.stopTyping('good');
            });

            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalled();
        });
    });

    describe('getTypingUsersForColumn', () => {
        it('should return typing users for specific column', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            // Simulate receiving typing statuses
            const callback = mockSubscribeToTypingStatus.mock.calls[0][1];
            act(() => {
                callback(mockTypingStatuses);
            });

            const goodColumnUsers = result.current.getTypingUsersForColumn('good');
            const badColumnUsers = result.current.getTypingUsersForColumn('bad');

            expect(goodColumnUsers).toHaveLength(1);
            expect(goodColumnUsers[0].username).toBe('otheruser');
            expect(badColumnUsers).toHaveLength(1);
            expect(badColumnUsers[0].username).toBe('thirduser');
        });

        it('should return empty array for column with no typing users', () => {
            const { result } = renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            const emptyColumnUsers = result.current.getTypingUsersForColumn('action');
            expect(emptyColumnUsers).toHaveLength(0);
        });
    });

    describe('Metrics Integration', () => {
        it('should record read metrics when receiving typing statuses', () => {
            renderHook(() => useTypingStatus({
                retrospectiveId: mockRetrospectiveId,
                currentUserId: mockUserId,
                currentUsername: mockUsername
            }));

            const callback = mockSubscribeToTypingStatus.mock.calls[0][1];
            act(() => {
                callback(mockTypingStatuses);
            });

            expect(mockRecordRead).toHaveBeenCalledWith('typing-status-updates', 2);
        });
    });
});
