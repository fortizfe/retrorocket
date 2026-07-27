import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import * as countdownApi from '@/features/boards/countdown/services/countdownApiClient';

type SnapshotHandler = (data: unknown) => void;
let capturedOnSnapshot: SnapshotHandler | null = null;
let capturedOnCountdown: SnapshotHandler | null = null;

vi.mock('@/lib/hooks/useBoardEvents', () => ({
    useBoardEvents: (_boardId: string | undefined, options: { onSnapshot?: SnapshotHandler; on?: Record<string, SnapshotHandler> }) => {
        capturedOnSnapshot = options.onSnapshot ?? null;
        capturedOnCountdown = options.on?.countdown ?? null;
        return { connectionState: 'connected' };
    },
}));

vi.mock('@/features/boards/countdown/services/countdownApiClient', () => ({
    createOrUpdateTimer: vi.fn(),
    startTimer: vi.fn(),
    pauseTimer: vi.fn(),
    resetTimer: vi.fn(),
    deleteTimer: vi.fn(),
    parseCountdownSnapshot: (raw: Record<string, unknown> | null) =>
        raw ? { ...raw, startTime: raw.startTime ? new Date(raw.startTime as string) : null, endTime: raw.endTime ? new Date(raw.endTime as string) : null } : null,
}));

const mocked = vi.mocked(countdownApi);

const RAW_TIMER = {
    id: 'retro-1', retrospectiveId: 'retro-1', duration: 100, originalDuration: 100,
    startTime: null, endTime: null, isRunning: false, isPaused: false, createdBy: 'facilitator-1',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

describe('useCountdown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnSnapshot = null;
        capturedOnCountdown = null;
    });

    it('starts in a loading state until a snapshot arrives', () => {
        const { result } = renderHook(() => useCountdown('retro-1'));
        expect(result.current.loading).toBe(true);
        expect(result.current.timer).toBeNull();
    });

    it('populates the timer from the initial snapshot', () => {
        const { result } = renderHook(() => useCountdown('retro-1'));
        act(() => { capturedOnSnapshot!({ countdown: RAW_TIMER }); });

        expect(result.current.loading).toBe(false);
        expect(result.current.timer?.duration).toBe(100);
    });

    it('updates on a named "countdown" event', () => {
        const { result } = renderHook(() => useCountdown('retro-1'));
        act(() => { capturedOnSnapshot!({ countdown: null }); });
        act(() => { capturedOnCountdown!({ ...RAW_TIMER, isRunning: true }); });

        expect(result.current.timer?.isRunning).toBe(true);
        expect(result.current.countdownState.isRunning).toBe(true);
    });

    it('handles a null countdown snapshot (no timer created yet)', () => {
        const { result } = renderHook(() => useCountdown('retro-1'));
        act(() => { capturedOnSnapshot!({ countdown: null }); });

        expect(result.current.timer).toBeNull();
        expect(result.current.countdownState.totalDuration).toBe(0);
    });

    it('createTimer calls the backend endpoint and ignores a legacy createdBy arg', async () => {
        mocked.createOrUpdateTimer.mockResolvedValue(RAW_TIMER as never);
        const { result } = renderHook(() => useCountdown('retro-1'));

        await act(async () => result.current.createTimer(300, 'legacy-uid'));

        expect(mocked.createOrUpdateTimer).toHaveBeenCalledWith('retro-1', 300);
    });

    it('startTimer/pauseTimer/resetTimer/deleteTimer call the backend endpoints', async () => {
        mocked.startTimer.mockResolvedValue(RAW_TIMER as never);
        mocked.pauseTimer.mockResolvedValue(RAW_TIMER as never);
        mocked.resetTimer.mockResolvedValue(RAW_TIMER as never);
        mocked.deleteTimer.mockResolvedValue(undefined);
        const { result } = renderHook(() => useCountdown('retro-1'));

        await act(async () => result.current.startTimer());
        await act(async () => result.current.pauseTimer());
        await act(async () => result.current.resetTimer());
        await act(async () => result.current.deleteTimer());

        expect(mocked.startTimer).toHaveBeenCalledWith('retro-1');
        expect(mocked.pauseTimer).toHaveBeenCalledWith('retro-1');
        expect(mocked.resetTimer).toHaveBeenCalledWith('retro-1');
        expect(mocked.deleteTimer).toHaveBeenCalledWith('retro-1');
    });

    it('sets error and rethrows on a failed write', async () => {
        mocked.startTimer.mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useCountdown('retro-1'));

        await expect(result.current.startTimer()).rejects.toThrow('boom');
        await waitFor(() => expect(result.current.error).toBe('boom'));
    });

    it('formats seconds as mm:ss', () => {
        const { result } = renderHook(() => useCountdown('retro-1'));
        expect(result.current.formatTime(65)).toBe('01:05');
    });
});
