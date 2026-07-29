import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OptimizedTypingStatusService } from '@/features/boards/retrospective/services/OptimizedTypingStatusService';

const mockSetTypingStatus = vi.fn();
vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    setTypingStatus: (...args: unknown[]) => mockSetTypingStatus(...args),
}));

describe('OptimizedTypingStatusService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        OptimizedTypingStatusService.cleanup();
    });

    afterEach(() => {
        OptimizedTypingStatusService.cleanup();
        vi.useRealTimers();
    });

    it('writes immediately via backendRetrospectiveClient.setTypingStatus on the first isActive:true call', () => {
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'helped', true);
    });

    it('auto-deactivates after the 300ms debounce window if no further keystroke resets it', () => {
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
        mockSetTypingStatus.mockClear();

        vi.advanceTimersByTime(300);
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'helped', false);
    });

    it('a repeated isActive:true call before the debounce fires resets the timer without a duplicate write', () => {
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
        mockSetTypingStatus.mockClear();

        vi.advanceTimersByTime(150);
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
        // Already "initialized" within the 5000ms TYPING_TIMEOUT window — no immediate re-write.
        expect(mockSetTypingStatus).not.toHaveBeenCalled();

        vi.advanceTimersByTime(150);
        // The reset 300ms debounce hasn't elapsed yet from the second call.
        expect(mockSetTypingStatus).not.toHaveBeenCalled();
    });

    it('isActive:false writes the deactivation immediately, not after a debounce', () => {
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: false });
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'helped', false);
    });

    it('cleanupUserTypingStatus deactivates every known column for the user', async () => {
        await OptimizedTypingStatusService.cleanupUserTypingStatus('u1', 'r1');
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'helped', false);
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'hindered', false);
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'improve', false);
    });
});
