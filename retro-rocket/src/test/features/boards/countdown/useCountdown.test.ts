import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import type { CountdownTimer } from '@/features/boards/retrospective/services/backendRetrospectiveClient';

vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    configureTimer: vi.fn(),
    startTimer: vi.fn(),
    pauseTimer: vi.fn(),
    resetTimer: vi.fn(),
    deleteTimer: vi.fn(),
}));

// Mock Audio API
Object.defineProperty(window, 'Audio', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        load: vi.fn()
    }))
});

const mockedClient = vi.mocked(backendRetrospectiveClient);

describe('useCountdown', () => {
    const mockTimer: CountdownTimer = {
        retrospectiveId: 'retro-1',
        startTime: null,
        duration: 300, // 5 minutes
        originalDuration: 300,
        isRunning: false,
        isPaused: false,
        endTime: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Basic functionality', () => {
        it('reflects a null timer input as an empty countdown state', () => {
            const { result } = renderHook(() => useCountdown('retro-1', null));

            expect(result.current.timer).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.countdownState).toEqual({
                timeRemaining: 0,
                isRunning: false,
                isPaused: false,
                isFinished: false,
                totalDuration: 0
            });
        });

        it('derives countdownState from the timer input', () => {
            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            expect(result.current.timer).toEqual(mockTimer);
            expect(result.current.countdownState).toEqual({
                timeRemaining: 300,
                isRunning: false,
                isPaused: false,
                isFinished: false,
                totalDuration: 300
            });
        });

        it('recomputes countdownState when the timer prop changes (e.g. a live update)', () => {
            const { result, rerender } = renderHook(({ timer }) => useCountdown('retro-1', timer), {
                initialProps: { timer: null as CountdownTimer | null },
            });

            expect(result.current.countdownState.totalDuration).toBe(0);

            rerender({ timer: mockTimer });

            expect(result.current.countdownState).toEqual({
                timeRemaining: 300,
                isRunning: false,
                isPaused: false,
                isFinished: false,
                totalDuration: 300
            });
        });
    });

    describe('Timer control methods', () => {
        it('should create timer', async () => {
            mockedClient.configureTimer.mockResolvedValue(mockTimer);

            const { result } = renderHook(() => useCountdown('retro-1', null));

            await act(async () => {
                await result.current.createTimer(300);
            });

            expect(mockedClient.configureTimer).toHaveBeenCalledWith('retro-1', 300);
            expect(result.current.error).toBeNull();
        });

        it('should handle create timer error', async () => {
            mockedClient.configureTimer.mockRejectedValue(new Error('Create failed'));

            const { result } = renderHook(() => useCountdown('retro-1', null));

            await act(async () => {
                await expect(result.current.createTimer(300)).rejects.toThrow('Create failed');
            });

            expect(result.current.error).toBe('Create failed');
        });

        it('should start timer', async () => {
            mockedClient.startTimer.mockResolvedValue({ ...mockTimer, isRunning: true });

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await result.current.startTimer();
            });

            expect(mockedClient.startTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });

        it('should pause timer', async () => {
            mockedClient.pauseTimer.mockResolvedValue({ ...mockTimer, isPaused: true });

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await result.current.pauseTimer();
            });

            expect(mockedClient.pauseTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });

        it('should reset timer', async () => {
            mockedClient.resetTimer.mockResolvedValue(mockTimer);

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await result.current.resetTimer();
            });

            expect(mockedClient.resetTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });

        it('should delete timer', async () => {
            mockedClient.deleteTimer.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await result.current.deleteTimer();
            });

            expect(mockedClient.deleteTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });
    });

    describe('Real-time countdown functionality', () => {
        it('should start real-time countdown when timer is running', () => {
            const runningTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date()
            };

            const { result } = renderHook(() => useCountdown('retro-1', runningTimer));

            expect(result.current.countdownState.isRunning).toBe(true);

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(result.current.countdownState.timeRemaining).toBe(299);
        });

        it('should stop countdown when timer reaches zero', () => {
            const almostFinishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 299000), // Started 299 seconds ago
                duration: 300
            };

            const { result } = renderHook(() => useCountdown('retro-1', almostFinishedTimer));

            expect(result.current.countdownState.timeRemaining).toBe(1);

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(result.current.countdownState.timeRemaining).toBe(0);
            expect(result.current.countdownState.isFinished).toBe(true);
        });

        it('should calculate time remaining correctly', () => {
            const partialTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 150000)
            };

            const { result } = renderHook(() => useCountdown('retro-1', partialTimer));

            expect(result.current.countdownState.timeRemaining).toBe(150);
        });

        it('should not go below zero for time remaining', () => {
            const overdueTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 500000) // Started 500 seconds ago
            };

            const { result } = renderHook(() => useCountdown('retro-1', overdueTimer));

            expect(result.current.countdownState.timeRemaining).toBe(0);
            expect(result.current.countdownState.isFinished).toBe(true);
        });
    });

    describe('Time formatting', () => {
        it('should format time correctly', () => {
            const { result } = renderHook(() => useCountdown('retro-1', null));

            expect(result.current.formatTime(0)).toBe('00:00');
            expect(result.current.formatTime(30)).toBe('00:30');
            expect(result.current.formatTime(60)).toBe('01:00');
            expect(result.current.formatTime(125)).toBe('02:05');
            expect(result.current.formatTime(3661)).toBe('61:01');
        });
    });

    describe('Audio notification', () => {
        it('should play sound when timer finishes', () => {
            const mockAudioInstance = {
                play: vi.fn().mockResolvedValue(undefined),
                pause: vi.fn(),
                load: vi.fn()
            };
            const mockAudioConstructor = vi.fn(() => mockAudioInstance);
            Object.defineProperty(window, 'Audio', {
                writable: true,
                value: mockAudioConstructor
            });

            const finishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 300000) // Started 300 seconds ago
            };

            const { result } = renderHook(() => useCountdown('retro-1', finishedTimer));

            expect(result.current.countdownState.isFinished).toBe(true);
            expect(mockAudioConstructor).toHaveBeenCalled();
            expect(mockAudioInstance.play).toHaveBeenCalled();
        });

        it('should handle audio play errors gracefully', () => {
            const mockAudioInstance = {
                play: vi.fn().mockRejectedValue(new Error('Autoplay blocked')),
                pause: vi.fn(),
                load: vi.fn()
            };
            const mockAudioConstructor = vi.fn(() => mockAudioInstance);
            Object.defineProperty(window, 'Audio', {
                writable: true,
                value: mockAudioConstructor
            });

            const finishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 300000)
            };

            expect(() => {
                renderHook(() => useCountdown('retro-1', finishedTimer));
            }).not.toThrow();
        });
    });

    describe('Cleanup and edge cases', () => {
        it('clears the countdown interval on unmount', () => {
            const runningTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date()
            };

            const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
            const { unmount } = renderHook(() => useCountdown('retro-1', runningTimer));

            unmount();
            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it('should clear intervals when timer stops running', () => {
            const runningTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date()
            };

            const { result, rerender } = renderHook(({ timer }) => useCountdown('retro-1', timer), {
                initialProps: { timer: runningTimer },
            });

            expect(result.current.countdownState.isRunning).toBe(true);

            const stoppedTimer: CountdownTimer = { ...runningTimer, isRunning: false };
            rerender({ timer: stoppedTimer });

            expect(result.current.countdownState.isRunning).toBe(false);
        });

        it('should use originalDuration for totalDuration when available', () => {
            const timerWithOriginalDuration: CountdownTimer = {
                ...mockTimer,
                duration: 150, // Current duration (might be less due to pause/resume)
                originalDuration: 300 // Original duration
            };

            const { result } = renderHook(() => useCountdown('retro-1', timerWithOriginalDuration));

            expect(result.current.countdownState.totalDuration).toBe(300);
        });

        it('should reset sound flag when timer is reset', () => {
            const finishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 300000)
            };

            const { result, rerender } = renderHook(({ timer }) => useCountdown('retro-1', timer), {
                initialProps: { timer: finishedTimer },
            });

            expect(result.current.countdownState.isFinished).toBe(true);

            const resetTimerValue: CountdownTimer = { ...mockTimer, isRunning: false, startTime: null };
            rerender({ timer: resetTimerValue });

            expect(result.current.countdownState.isFinished).toBe(false);
            expect(result.current.countdownState.timeRemaining).toBe(300);
        });
    });

    describe('Error handling', () => {
        it('should handle start timer error', async () => {
            mockedClient.startTimer.mockRejectedValue(new Error('Start failed'));

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await expect(result.current.startTimer()).rejects.toThrow('Start failed');
            });

            expect(result.current.error).toBe('Start failed');
        });

        it('should handle pause timer error', async () => {
            mockedClient.pauseTimer.mockRejectedValue(new Error('Pause failed'));

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await expect(result.current.pauseTimer()).rejects.toThrow('Pause failed');
            });

            expect(result.current.error).toBe('Pause failed');
        });

        it('should handle reset timer error', async () => {
            mockedClient.resetTimer.mockRejectedValue(new Error('Reset failed'));

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await expect(result.current.resetTimer()).rejects.toThrow('Reset failed');
            });

            expect(result.current.error).toBe('Reset failed');
        });

        it('should handle delete timer error', async () => {
            mockedClient.deleteTimer.mockRejectedValue(new Error('Delete failed'));

            const { result } = renderHook(() => useCountdown('retro-1', mockTimer));

            await act(async () => {
                await expect(result.current.deleteTimer()).rejects.toThrow('Delete failed');
            });

            expect(result.current.error).toBe('Delete failed');
        });

        it('should clear error on successful operations', async () => {
            mockedClient.configureTimer
                .mockRejectedValueOnce(new Error('Failed'))
                .mockResolvedValueOnce(mockTimer);

            const { result } = renderHook(() => useCountdown('retro-1', null));

            // First call fails
            await act(async () => {
                await expect(result.current.createTimer(300)).rejects.toThrow('Failed');
            });

            expect(result.current.error).toBe('Failed');

            // Second call succeeds
            await act(async () => {
                await result.current.createTimer(300);
            });

            expect(result.current.error).toBeNull();
        });
    });
});
