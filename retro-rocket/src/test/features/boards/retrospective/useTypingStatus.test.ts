import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingStatus } from '@/features/boards/retrospective/hooks/useTypingStatus';
import { setTypingStatus } from '@/features/boards/retrospective/services/typingApiClient';

let mockSnapshot: { typing: unknown[] } | null = null;

vi.mock('@/features/boards/retrospective/contexts/BoardEventsProvider', () => ({
    useBoardEventsContext: () => ({ snapshot: mockSnapshot, connectionState: 'connected' }),
}));

vi.mock('@/features/boards/retrospective/services/typingApiClient', () => ({
    setTypingStatus: vi.fn(),
    parseTypingSnapshot: (raw: Array<Record<string, unknown>>, retrospectiveId: string) =>
        raw.map((s) => ({ id: `${retrospectiveId}_${s.userId}_${s.column}`, retrospectiveId, ...s, timestamp: new Date(s.timestamp as string) })),
}));

const mockedSetTypingStatus = vi.mocked(setTypingStatus);

const RETRO_ID = 'retro-123';
const USER_ID = 'user-123';
const USERNAME = 'testuser';

const rawStatuses = [
    { userId: 'user-456', username: 'otheruser', column: 'good', isActive: true, timestamp: new Date().toISOString() },
    { userId: 'user-789', username: 'thirduser', column: 'bad', isActive: true, timestamp: new Date().toISOString() },
];

describe('useTypingStatus', () => {
    beforeEach(() => {
        mockSnapshot = null;
        mockedSetTypingStatus.mockClear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Snapshot consumption', () => {
        it('filters out the current user from typing statuses', () => {
            mockSnapshot = { typing: [...rawStatuses, { userId: USER_ID, username: USERNAME, column: 'good', isActive: true, timestamp: new Date().toISOString() }] };

            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));

            expect(result.current.typingIndicators).toHaveLength(2);
            expect(result.current.typingIndicators.every((i) => i.userId !== USER_ID)).toBe(true);
        });

        it('returns no indicators before any snapshot arrives', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            expect(result.current.typingIndicators).toEqual([]);
        });
    });

    describe('Cleanup', () => {
        it('sends isActive:false for every active column on unmount', () => {
            const { result, unmount } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));

            act(() => { result.current.startTyping('good'); });
            mockedSetTypingStatus.mockClear();

            unmount();

            expect(mockedSetTypingStatus).toHaveBeenCalledWith({ userId: USER_ID, username: USERNAME, retrospectiveId: RETRO_ID, column: 'good', isActive: false });
        });

        it('registers a beforeunload listener and removes it on unmount', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

            unmount();
            expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
        });
    });

    describe('startTyping', () => {
        it('sends an active typing status for a column', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            act(() => { result.current.startTyping('good'); });

            expect(mockedSetTypingStatus).toHaveBeenCalledWith({ userId: USER_ID, username: USERNAME, retrospectiveId: RETRO_ID, column: 'good', isActive: true });
        });

        it('does nothing without user info', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID }));
            act(() => { result.current.startTyping('good'); });
            expect(mockedSetTypingStatus).not.toHaveBeenCalled();
        });

        it('auto-stops after 4s of inactivity', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            act(() => { result.current.startTyping('good'); });
            mockedSetTypingStatus.mockClear();

            act(() => { vi.advanceTimersByTime(4000); });

            expect(mockedSetTypingStatus).toHaveBeenCalledWith({ userId: USER_ID, username: USERNAME, retrospectiveId: RETRO_ID, column: 'good', isActive: false });
        });

        it('throttles rapid repeated calls', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            act(() => {
                result.current.startTyping('good');
                result.current.startTyping('good');
                result.current.startTyping('good');
            });
            expect(mockedSetTypingStatus).toHaveBeenCalledTimes(1);
        });
    });

    describe('stopTyping', () => {
        it('sends isActive:false for an active column', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            act(() => { result.current.startTyping('good'); });
            mockedSetTypingStatus.mockClear();

            act(() => { result.current.stopTyping('good'); });
            expect(mockedSetTypingStatus).toHaveBeenCalledWith({ userId: USER_ID, username: USERNAME, retrospectiveId: RETRO_ID, column: 'good', isActive: false });
        });

        it('does nothing for a column that was never active', () => {
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            act(() => { result.current.stopTyping('good'); });
            expect(mockedSetTypingStatus).not.toHaveBeenCalled();
        });
    });

    describe('getTypingUsersForColumn', () => {
        it('returns typing users scoped to a column', () => {
            mockSnapshot = { typing: rawStatuses };
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));

            expect(result.current.getTypingUsersForColumn('good')).toHaveLength(1);
            expect(result.current.getTypingUsersForColumn('good')[0].username).toBe('otheruser');
            expect(result.current.getTypingUsersForColumn('bad')[0].username).toBe('thirduser');
        });

        it('returns an empty array for a column with no typing users', () => {
            mockSnapshot = { typing: rawStatuses };
            const { result } = renderHook(() => useTypingStatus({ retrospectiveId: RETRO_ID, currentUserId: USER_ID, currentUsername: USERNAME }));
            expect(result.current.getTypingUsersForColumn('action')).toHaveLength(0);
        });
    });
});
