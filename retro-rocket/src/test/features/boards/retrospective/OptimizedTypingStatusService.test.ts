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
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('writes immediately via backendRetrospectiveClient.setTypingStatus on the first isActive:true call', () => {
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'helped', true);
    });

    it('never auto-deactivates on its own — isActive:false is only ever written when explicitly called', () => {
        OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });

        vi.advanceTimersByTime(10000);

        expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
        expect(mockSetTypingStatus).toHaveBeenCalledWith('r1', 'helped', true);
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
