import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OptimizedTypingStatusService } from '@/features/boards/retrospective/services/OptimizedTypingStatusService';

const mockSetTypingStatus = vi.fn();
vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    setTypingStatus: (...args: unknown[]) => mockSetTypingStatus(...args),
}));

/** A promise the test controls the settlement of, to simulate a write whose network
 * round trip hasn't completed yet. */
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

/** Drains the microtask queue enough times for a chain of `.then()`/`await` hops
 * (queue → setTypingStatusImmediate's internal await → its caller) to settle. */
async function flushMicrotasks(times = 5): Promise<void> {
    for (let i = 0; i < times; i++) {
        await Promise.resolve();
    }
}

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

    // Feature 027: fix the ordering race behind the "ghost" typing indicator — a
    // later write for the same participant+column must never reach the server before
    // an earlier one that is still in flight.
    describe('write ordering (feature 027)', () => {
        it('does not send a later write for the same key until an earlier pending write for that key has settled', async () => {
            const first = deferred<void>();
            mockSetTypingStatus.mockReturnValueOnce(first.promise);
            mockSetTypingStatus.mockResolvedValueOnce(undefined);

            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: false });

            // The second call must not have reached the server yet — it's queued
            // behind the still-pending first write.
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
            expect(mockSetTypingStatus).toHaveBeenNthCalledWith(1, 'r1', 'helped', true);

            first.resolve();
            await flushMicrotasks();

            expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);
            expect(mockSetTypingStatus).toHaveBeenNthCalledWith(2, 'r1', 'helped', false);
        });

        it('discards a failed write and still processes the next queued write for the same key (FR-007)', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            const failing = deferred<void>();
            mockSetTypingStatus.mockReturnValueOnce(failing.promise);
            mockSetTypingStatus.mockResolvedValueOnce(undefined);

            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: false });

            expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);

            failing.reject(new Error('network error'));
            await flushMicrotasks();

            // The rejected first write must not block the second, queued write.
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);
            expect(mockSetTypingStatus).toHaveBeenNthCalledWith(2, 'r1', 'helped', false);

            consoleErrorSpy.mockRestore();
        });

        it('retries a failed isActive:false (clear) write a bounded number of times, off the write-serialization chain, so it never blocks the next queued write (FR-013, Contract 4, feature 034)', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            // The clear write fails on its first attempt, then succeeds on retry.
            mockSetTypingStatus
                .mockRejectedValueOnce(new Error('network error'))
                .mockResolvedValueOnce(undefined);

            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: false });
            await flushMicrotasks();

            // The failed write still doesn't block a next queued write for the same key
            // (existing FR-007 guarantee, unchanged) — a caller isn't left waiting on
            // the retry.
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);

            // The bounded retry (off-chain) eventually re-sends the clear.
            await vi.advanceTimersByTimeAsync(600);
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);
            expect(mockSetTypingStatus).toHaveBeenNthCalledWith(2, 'r1', 'helped', false);

            consoleErrorSpy.mockRestore();
        });

        it('gives up after a bounded number of retries for a persistently failing clear write, rather than retrying forever', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            mockSetTypingStatus.mockRejectedValue(new Error('network error'));

            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: false });
            await flushMicrotasks();
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(600);
            await flushMicrotasks();
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(600);
            await flushMicrotasks();
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(3);

            // No further retries beyond the bound, even given more time.
            await vi.advanceTimersByTimeAsync(5000);
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(3);

            consoleErrorSpy.mockRestore();
        });

        it('does not retry a failed isActive:true (start-typing) write — only clears need the bounded retry', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            mockSetTypingStatus.mockRejectedValueOnce(new Error('network error'));

            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
            await flushMicrotasks();
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(5000);
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);

            consoleErrorSpy.mockRestore();
        });

        it('does not serialize writes for different keys against each other', () => {
            const pendingHelped = deferred<void>();
            mockSetTypingStatus.mockReturnValueOnce(pendingHelped.promise);

            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'helped', isActive: true });
            OptimizedTypingStatusService.setTypingStatusDebounced({ userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'hindered', isActive: true });

            // A pending write for 'helped' must not delay an unrelated write for
            // 'hindered' — both reach the server immediately.
            expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);
            expect(mockSetTypingStatus).toHaveBeenNthCalledWith(1, 'r1', 'helped', true);
            expect(mockSetTypingStatus).toHaveBeenNthCalledWith(2, 'r1', 'hindered', true);
        });
    });
});
