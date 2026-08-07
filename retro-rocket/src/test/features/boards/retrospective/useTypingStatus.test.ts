import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingStatus } from '@/features/boards/retrospective/hooks/useTypingStatus';
import { OptimizedTypingStatusService } from '@/features/boards/retrospective/services/OptimizedTypingStatusService';
import type { TypingStatusEntry } from '@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync';

// Mock the service — its own debounce/backend-write behavior is covered by
// OptimizedTypingStatusService.test.ts; this hook's job is just wiring startTyping/
// stopTyping to it and deriving typingIndicators from the `typingStatuses` input
// (feature 019, US3 — reads now come from useRetrospectiveRealtimeSync, not a
// self-managed Firestore subscription).
vi.mock('@/features/boards/retrospective/services/OptimizedTypingStatusService');

describe('useTypingStatus Hook', () => {
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-123';
    const mockUsername = 'testuser';

    const mockTypingStatuses: TypingStatusEntry[] = [
        { id: 't1', userId: 'user-456', username: 'otheruser', retrospectiveId: mockRetrospectiveId, column: 'good', timestamp: new Date() },
        { id: 't2', userId: 'user-789', username: 'thirduser', retrospectiveId: mockRetrospectiveId, column: 'bad', timestamp: new Date() },
    ];

    let mockCleanupUserTypingStatus: ReturnType<typeof vi.fn>;
    let mockSetTypingStatusDebounced: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockCleanupUserTypingStatus = vi.fn();
        mockSetTypingStatusDebounced = vi.fn();

        vi.mocked(OptimizedTypingStatusService.cleanupUserTypingStatus).mockImplementation(mockCleanupUserTypingStatus);
        vi.mocked(OptimizedTypingStatusService.setTypingStatusDebounced).mockImplementation(mockSetTypingStatusDebounced);

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('typingIndicators derivation', () => {
        it('filters out the current user from typingStatuses', () => {
            const withCurrentUser = [...mockTypingStatuses, { id: 't3', userId: mockUserId, username: mockUsername, retrospectiveId: mockRetrospectiveId, column: 'good', timestamp: new Date() }];
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: withCurrentUser }),
            );

            expect(result.current.typingIndicators).toHaveLength(2);
            expect(result.current.typingIndicators.every((indicator) => indicator.userId !== mockUserId)).toBe(true);
        });

        it('updates typingIndicators when the typingStatuses input changes (a live event arrived)', () => {
            const { result, rerender } = renderHook(
                ({ typingStatuses }) => useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses }),
                { initialProps: { typingStatuses: [] as TypingStatusEntry[] } },
            );
            expect(result.current.typingIndicators).toHaveLength(0);

            rerender({ typingStatuses: mockTypingStatuses });
            expect(result.current.typingIndicators).toHaveLength(2);
        });
    });

    describe('Cleanup', () => {
        it('should cleanup on unmount', () => {
            const { unmount } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            unmount();

            expect(mockCleanupUserTypingStatus).toHaveBeenCalledWith(mockUserId, mockRetrospectiveId);
        });

        it('should setup beforeunload event listener', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
        });
    });

    describe('startTyping', () => {
        it('should start typing for a column', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            act(() => {
                result.current.startTyping('good');
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'good',
                isActive: true,
            });
        });

        it('should not start typing without user info', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: mockRetrospectiveId, typingStatuses: [] }));

            act(() => {
                result.current.startTyping('good');
            });

            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalled();
        });

        it('should auto-stop typing after the 3-second inactivity timeout, not a moment before', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            act(() => {
                result.current.startTyping('good');
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'good',
                isActive: true,
            });

            mockSetTypingStatusDebounced.mockClear();

            act(() => {
                vi.advanceTimersByTime(2999);
            });

            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalledWith(
                expect.objectContaining({ column: 'good', isActive: false }),
            );

            act(() => {
                vi.advanceTimersByTime(1);
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'good',
                isActive: false,
            });
        });

        it('should throttle rapid typing updates', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            act(() => {
                result.current.startTyping('good');
                result.current.startTyping('good');
                result.current.startTyping('good');
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledTimes(1);
        });

        it('never sends isActive:false while keystrokes keep arriving within the inactivity window (regression for the reported flicker)', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            for (let i = 0; i < 12; i++) {
                act(() => {
                    result.current.startTyping('good');
                    vi.advanceTimersByTime(500);
                });
            }

            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalledWith(
                expect.objectContaining({ column: 'good', isActive: false }),
            );
        });

        it('switching to a different column mid-grace-period clears the old column promptly and starts the new one', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            act(() => {
                result.current.startTyping('helped');
            });
            mockSetTypingStatusDebounced.mockClear();

            act(() => {
                vi.advanceTimersByTime(1000);
                result.current.startTyping('hindered');
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'hindered',
                isActive: true,
            });
            mockSetTypingStatusDebounced.mockClear();

            // 'helped' received no further keystrokes — its own 3000ms timer (started when
            // it was first typed) still fires independently, with no stale duplicate.
            act(() => {
                vi.advanceTimersByTime(2000);
            });

            expect(mockSetTypingStatusDebounced).toHaveBeenCalledWith({
                userId: mockUserId,
                username: mockUsername,
                retrospectiveId: mockRetrospectiveId,
                column: 'helped',
                isActive: false,
            });
            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalledWith(
                expect.objectContaining({ column: 'hindered', isActive: false }),
            );
        });
    });

    describe('stopTyping', () => {
        it('should stop typing for a column', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

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
                isActive: false,
            });
        });

        it('should not stop typing for inactive column', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            act(() => {
                result.current.stopTyping('good');
            });

            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalled();
        });

        it('should not stop typing without user info', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: mockRetrospectiveId, typingStatuses: [] }));

            act(() => {
                result.current.stopTyping('good');
            });

            expect(mockSetTypingStatusDebounced).not.toHaveBeenCalled();
        });
    });

    describe('getTypingUsersForColumn', () => {
        it('should return typing users for specific column', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: mockTypingStatuses }),
            );

            const goodColumnUsers = result.current.getTypingUsersForColumn('good');
            const badColumnUsers = result.current.getTypingUsersForColumn('bad');

            expect(goodColumnUsers).toHaveLength(1);
            expect(goodColumnUsers[0].username).toBe('otheruser');
            expect(badColumnUsers).toHaveLength(1);
            expect(badColumnUsers[0].username).toBe('thirduser');
        });

        it('should return empty array for column with no typing users', () => {
            const { result } = renderHook(() =>
                useTypingStatus({ retrospectiveId: mockRetrospectiveId, currentUserId: mockUserId, currentUsername: mockUsername, typingStatuses: [] }),
            );

            expect(result.current.getTypingUsersForColumn('action')).toHaveLength(0);
        });
    });
});
