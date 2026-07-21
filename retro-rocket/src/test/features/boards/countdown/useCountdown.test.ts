import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { CountdownService } from '@/features/boards/countdown/services/countdownService';
import { CountdownTimer } from '@/features/boards/types/countdown';

// Mock the CountdownService
vi.mock('@/features/boards/countdown/services/countdownService', () => ({
    CountdownService: {
        subscribeToTimer: vi.fn(),
        createOrUpdateTimer: vi.fn(),
        startTimer: vi.fn(),
        pauseTimer: vi.fn(),
        resetTimer: vi.fn(),
        deleteTimer: vi.fn()
    }
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

const mockedCountdownService = vi.mocked(CountdownService);

describe('useCountdown', () => {
    const mockTimer: CountdownTimer = {
        id: 'timer-1',
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
        mockedCountdownService.subscribeToTimer.mockReturnValue(vi.fn());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Basic functionality', () => {
        it('should initialize with loading state and setup subscription', () => {
            const { result } = renderHook(() => useCountdown('retro-1'));

            expect(result.current.loading).toBe(true);
            expect(result.current.timer).toBeNull();
            expect(result.current.error).toBeNull();
            expect(result.current.countdownState).toEqual({
                timeRemaining: 0,
                isRunning: false,
                isPaused: false,
                isFinished: false,
                totalDuration: 0
            });
            expect(mockedCountdownService.subscribeToTimer).toHaveBeenCalledWith(
                'retro-1',
                expect.any(Function)
            );
        });

        it('should handle subscription data with timer', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            act(() => {
                subscriptionCallback?.(mockTimer);
            });

            expect(result.current.timer).toEqual(mockTimer);
            expect(result.current.loading).toBe(false);
            expect(result.current.countdownState).toEqual({
                timeRemaining: 300,
                isRunning: false,
                isPaused: false,
                isFinished: false,
                totalDuration: 300
            });
        });

        it('should handle subscription data with null timer', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            act(() => {
                subscriptionCallback?.(null);
            });

            expect(result.current.timer).toBeNull();
            expect(result.current.countdownState).toEqual({
                timeRemaining: 0,
                isRunning: false,
                isPaused: false,
                isFinished: false,
                totalDuration: 0
            });
        });
    });

    describe('Timer control methods', () => {
        it('should create timer', async () => {
            mockedCountdownService.createOrUpdateTimer.mockResolvedValue();

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await result.current.createTimer(300, 'user-1');
            });

            expect(mockedCountdownService.createOrUpdateTimer).toHaveBeenCalledWith('retro-1', 300, 'user-1');
            expect(result.current.error).toBeNull();
        });

        it('should handle create timer error', async () => {
            mockedCountdownService.createOrUpdateTimer.mockRejectedValue(new Error('Create failed'));

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await expect(result.current.createTimer(300, 'user-1')).rejects.toThrow('Create failed');
            });

            expect(result.current.error).toBe('Create failed');
        });

        it('should start timer', async () => {
            mockedCountdownService.startTimer.mockResolvedValue();

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await result.current.startTimer();
            });

            expect(mockedCountdownService.startTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });

        it('should pause timer', async () => {
            mockedCountdownService.pauseTimer.mockResolvedValue();

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await result.current.pauseTimer();
            });

            expect(mockedCountdownService.pauseTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });

        it('should reset timer', async () => {
            mockedCountdownService.resetTimer.mockResolvedValue();

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await result.current.resetTimer();
            });

            expect(mockedCountdownService.resetTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });

        it('should delete timer', async () => {
            mockedCountdownService.deleteTimer.mockResolvedValue();

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await result.current.deleteTimer();
            });

            expect(mockedCountdownService.deleteTimer).toHaveBeenCalledWith('retro-1');
            expect(result.current.error).toBeNull();
        });
    });

    describe('Real-time countdown functionality', () => {
        it('should start real-time countdown when timer is running', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // Create a running timer
            const runningTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date()
            };

            act(() => {
                subscriptionCallback?.(runningTimer);
            });

            expect(result.current.countdownState.isRunning).toBe(true);

            // Advance timer by 1 second
            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(result.current.countdownState.timeRemaining).toBe(299);
        });

        it('should stop countdown when timer reaches zero', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // Create a timer that's almost finished
            const almostFinishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 299000), // Started 299 seconds ago
                duration: 300
            };

            act(() => {
                subscriptionCallback?.(almostFinishedTimer);
            });

            expect(result.current.countdownState.timeRemaining).toBe(1);

            // Advance timer by 1 second to finish
            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(result.current.countdownState.timeRemaining).toBe(0);
            expect(result.current.countdownState.isFinished).toBe(true);
        });

        it('should calculate time remaining correctly', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // Timer started 150 seconds ago with 300 second duration
            const partialTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 150000)
            };

            act(() => {
                subscriptionCallback?.(partialTimer);
            });

            expect(result.current.countdownState.timeRemaining).toBe(150);
        });

        it('should not go below zero for time remaining', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // Timer started way in the past
            const overdueTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 500000) // Started 500 seconds ago
            };

            act(() => {
                subscriptionCallback?.(overdueTimer);
            });

            expect(result.current.countdownState.timeRemaining).toBe(0);
            expect(result.current.countdownState.isFinished).toBe(true);
        });
    });

    describe('Time formatting', () => {
        it('should format time correctly', () => {
            const { result } = renderHook(() => useCountdown('retro-1'));

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

            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // Set up a finished timer
            const finishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 300000) // Started 300 seconds ago
            };

            act(() => {
                subscriptionCallback?.(finishedTimer);
            });

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

            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // This should not throw even if audio play fails
            const finishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 300000)
            };

            expect(() => {
                act(() => {
                    subscriptionCallback?.(finishedTimer);
                });
            }).not.toThrow();

            expect(result.current.countdownState.isFinished).toBe(true);
        });
    });

    describe('Cleanup and edge cases', () => {
        it('should cleanup subscription and intervals on unmount', () => {
            const mockUnsubscribe = vi.fn();
            mockedCountdownService.subscribeToTimer.mockReturnValue(mockUnsubscribe);

            const { unmount } = renderHook(() => useCountdown('retro-1'));

            unmount();
            expect(mockUnsubscribe).toHaveBeenCalled();
        });

        it('should clear intervals when timer stops running', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // Start with running timer
            const runningTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date()
            };

            act(() => {
                subscriptionCallback?.(runningTimer);
            });

            expect(result.current.countdownState.isRunning).toBe(true);

            // Stop the timer
            const stoppedTimer: CountdownTimer = {
                ...runningTimer,
                isRunning: false
            };

            act(() => {
                subscriptionCallback?.(stoppedTimer);
            });

            expect(result.current.countdownState.isRunning).toBe(false);
        });

        it('should use originalDuration for totalDuration when available', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            const timerWithOriginalDuration: CountdownTimer = {
                ...mockTimer,
                duration: 150, // Current duration (might be less due to pause/resume)
                originalDuration: 300 // Original duration
            };

            act(() => {
                subscriptionCallback?.(timerWithOriginalDuration);
            });

            expect(result.current.countdownState.totalDuration).toBe(300);
        });

        it('should reset sound flag when timer is reset', () => {
            let subscriptionCallback: ((timer: CountdownTimer | null) => void) | undefined;
            mockedCountdownService.subscribeToTimer.mockImplementation((retroId, callback) => {
                subscriptionCallback = callback;
                return vi.fn();
            });

            const { result } = renderHook(() => useCountdown('retro-1'));

            // First finish the timer
            const finishedTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: true,
                startTime: new Date(Date.now() - 300000)
            };

            act(() => {
                subscriptionCallback?.(finishedTimer);
            });

            expect(result.current.countdownState.isFinished).toBe(true);

            // Then reset the timer
            const resetTimer: CountdownTimer = {
                ...mockTimer,
                isRunning: false,
                startTime: null
            };

            act(() => {
                subscriptionCallback?.(resetTimer);
            });

            expect(result.current.countdownState.isFinished).toBe(false);
            expect(result.current.countdownState.timeRemaining).toBe(300);
        });
    });

    describe('Error handling', () => {
        it('should handle start timer error', async () => {
            mockedCountdownService.startTimer.mockRejectedValue(new Error('Start failed'));

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await expect(result.current.startTimer()).rejects.toThrow('Start failed');
            });

            expect(result.current.error).toBe('Start failed');
        });

        it('should handle pause timer error', async () => {
            mockedCountdownService.pauseTimer.mockRejectedValue(new Error('Pause failed'));

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await expect(result.current.pauseTimer()).rejects.toThrow('Pause failed');
            });

            expect(result.current.error).toBe('Pause failed');
        });

        it('should handle reset timer error', async () => {
            mockedCountdownService.resetTimer.mockRejectedValue(new Error('Reset failed'));

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await expect(result.current.resetTimer()).rejects.toThrow('Reset failed');
            });

            expect(result.current.error).toBe('Reset failed');
        });

        it('should handle delete timer error', async () => {
            mockedCountdownService.deleteTimer.mockRejectedValue(new Error('Delete failed'));

            const { result } = renderHook(() => useCountdown('retro-1'));

            await act(async () => {
                await expect(result.current.deleteTimer()).rejects.toThrow('Delete failed');
            });

            expect(result.current.error).toBe('Delete failed');
        });

        it('should clear error on successful operations', async () => {
            mockedCountdownService.createOrUpdateTimer
                .mockRejectedValueOnce(new Error('Failed'))
                .mockResolvedValueOnce(undefined);

            const { result } = renderHook(() => useCountdown('retro-1'));

            // First call fails
            await act(async () => {
                await expect(result.current.createTimer(300, 'user-1')).rejects.toThrow('Failed');
            });

            expect(result.current.error).toBe('Failed');

            // Second call succeeds
            await act(async () => {
                await result.current.createTimer(300, 'user-1');
            });

            expect(result.current.error).toBeNull();
        });
    });
});
