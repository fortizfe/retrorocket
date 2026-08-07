import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingStatus } from '@/features/boards/retrospective/hooks/useTypingStatus';
import { OptimizedTypingStatusService } from '@/features/boards/retrospective/services/OptimizedTypingStatusService';

const mockSetTypingStatus = vi.fn();
vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    setTypingStatus: (...args: unknown[]) => mockSetTypingStatus(...args),
}));

/**
 * Automated guard for SC-004/FR-006: typing-status updates MUST be event-driven, never
 * a fixed-interval polling loop. `setTimeout` (one-shot, reset per keystroke) is
 * expected and fine; `setInterval` (a recurring loop) would indicate a regression back
 * toward the polling this feature was explicitly required to avoid.
 */
describe('typing status: no polling loop', () => {
    let setIntervalSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        setIntervalSpy = vi.spyOn(global, 'setInterval');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('OptimizedTypingStatusService.setTypingStatusDebounced never registers a recurring interval', () => {
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: false });

        expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('useTypingStatus never registers a recurring interval across start/refresh/stop', () => {
        const { result, unmount } = renderHook(() =>
            useTypingStatus({ retrospectiveId: 'r1', currentUserId: 'u1', currentUsername: 'Alice', typingStatuses: [] }),
        );

        act(() => {
            result.current.startTyping('helped');
        });
        act(() => {
            vi.advanceTimersByTime(2500);
            result.current.startTyping('helped'); // a throttled refresh write, not a poll
        });
        act(() => {
            result.current.stopTyping('helped');
        });
        unmount();

        expect(setIntervalSpy).not.toHaveBeenCalled();
    });
});
