import { renderHook, act, waitFor } from '@testing-library/react';
import { useCountdown } from './useCountdown';
import { CountdownService } from '../services/countdownService';
import { CountdownTimer } from '../types/countdown';

// Mock the CountdownService
jest.mock('../services/countdownService', () => ({
    CountdownService: {
        getTimer: jest.fn(),
        createOrUpdateTimer: jest.fn(),
        startTimer: jest.fn(),
        pauseTimer: jest.fn(),
        resetTimer: jest.fn(),
        deleteTimer: jest.fn(),
        subscribeToTimer: jest.fn(),
    }
}));

// Mock timers for testing
jest.useFakeTimers();

const createMockTimer = (overrides: Partial<CountdownTimer> = {}): CountdownTimer => ({
    id: 'test-timer-id',
    retrospectiveId: 'test-retro-id',
    duration: 300, // 5 minutes in seconds
    originalDuration: 300,
    isRunning: false,
    isPaused: false,
    startTime: null,
    endTime: null,
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
});

const createMockSubscription = (timer: CountdownTimer | null) => {
    return (id: string, callback: (timer: CountdownTimer | null) => void) => {
        setTimeout(() => {
            callback(timer);
        }, 0);
        return jest.fn();
    };
};

describe('useCountdown Hook', () => {
    const retrospectiveId = 'test-retro-id';
    const mockCountdownService = CountdownService as jest.Mocked<typeof CountdownService>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('initialization', () => {
        it('should initialize with loading state', () => {
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(null));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            expect(result.current.loading).toBe(true);
            expect(result.current.timer).toBe(null);
            expect(result.current.countdownState.isRunning).toBe(false);
            expect(result.current.countdownState.timeRemaining).toBe(0);
        });

        it('should load existing timer on mount', async () => {
            const mockTimer = createMockTimer();
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.timer).toEqual(mockTimer);
            expect(result.current.countdownState.totalDuration).toBe(mockTimer.originalDuration);
        });

        it('should handle no existing timer', async () => {
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(null));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.timer).toBe(null);
        });

        it('should set up subscription to timer updates', async () => {
            const unsubscribeMock = jest.fn();
            mockCountdownService.subscribeToTimer.mockReturnValue(unsubscribeMock);

            const { unmount } = renderHook(() => useCountdown(retrospectiveId));

            expect(mockCountdownService.subscribeToTimer).toHaveBeenCalledWith(
                retrospectiveId,
                expect.any(Function)
            );

            unmount();
            expect(unsubscribeMock).toHaveBeenCalled();
        });
    });

    describe('timer creation', () => {
        it('should create a new timer', async () => {
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(null));
            mockCountdownService.createOrUpdateTimer.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await act(async () => {
                await result.current.createTimer(300, 'test-user');
            });

            expect(mockCountdownService.createOrUpdateTimer).toHaveBeenCalledWith(
                retrospectiveId,
                300,
                'test-user'
            );
        });

        it('should handle timer creation errors', async () => {
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(null));
            mockCountdownService.createOrUpdateTimer.mockRejectedValue(new Error('Creation failed'));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            try {
                await act(async () => {
                    await result.current.createTimer(300, 'test-user');
                });
            } catch (error) {
                expect(error).toEqual(new Error('Creation failed'));
            }

            expect(result.current.error).toBe('Creation failed');
        });
    });

    describe('timer controls', () => {
        it('should start a timer', async () => {
            const mockTimer = createMockTimer();
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));
            mockCountdownService.startTimer.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await act(() => result.current.startTimer());

            expect(mockCountdownService.startTimer).toHaveBeenCalledWith(retrospectiveId);
        });

        it('should pause a running timer', async () => {
            const mockTimer = createMockTimer({
                isRunning: true,
                startTime: new Date(Date.now() - 60000) // Started 1 minute ago
            });
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));
            mockCountdownService.pauseTimer.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await act(() => result.current.pauseTimer());

            expect(mockCountdownService.pauseTimer).toHaveBeenCalledWith(retrospectiveId);
        });

        it('should reset a timer', async () => {
            const mockTimer = createMockTimer({ isRunning: true });
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));
            mockCountdownService.resetTimer.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await act(() => result.current.resetTimer());

            expect(mockCountdownService.resetTimer).toHaveBeenCalledWith(retrospectiveId);
        });

        it('should delete a timer', async () => {
            const mockTimer = createMockTimer();
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));
            mockCountdownService.deleteTimer.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await act(() => result.current.deleteTimer());

            expect(mockCountdownService.deleteTimer).toHaveBeenCalledWith(retrospectiveId);
        });
    });

    describe('countdown state calculations', () => {
        it('should calculate correct time remaining for running timer', async () => {
            const startTime = new Date(Date.now() - 60000); // Started 1 minute ago
            const mockTimer = createMockTimer({
                isRunning: true,
                startTime,
                duration: 300 // 5 minutes
            });

            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.countdownState.timeRemaining).toBeLessThan(300);
            expect(result.current.countdownState.timeRemaining).toBeGreaterThan(230); // Should be around 4 minutes
            expect(result.current.countdownState.isRunning).toBe(true);
        });

        it('should detect when timer is finished', async () => {
            const startTime = new Date(Date.now() - 350000); // Started way past duration
            const mockTimer = createMockTimer({
                isRunning: true,
                startTime,
                duration: 300 // 5 minutes in seconds
            });

            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.countdownState.timeRemaining).toBe(0);
            expect(result.current.countdownState.isFinished).toBe(true);
        });

        it('should show full duration for paused timer', async () => {
            const mockTimer = createMockTimer({
                isRunning: false,
                isPaused: true,
                duration: 300
            });

            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(mockTimer));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.countdownState.timeRemaining).toBe(300);
            expect(result.current.countdownState.isPaused).toBe(true);
        });
    });

    describe('real-time updates', () => {
        it('should update timer when subscription fires', async () => {
            const mockTimer = createMockTimer();
            const updatedTimer = createMockTimer({ duration: 240 }); // Updated duration
            let subscriptionCallback: Function;

            mockCountdownService.subscribeToTimer.mockImplementation((_, callback) => {
                subscriptionCallback = callback;
                setTimeout(() => {
                    callback(mockTimer);
                }, 0);
                return jest.fn();
            });

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            act(() => {
                subscriptionCallback(updatedTimer);
            });

            expect(result.current.timer?.duration).toBe(240);
        });
    });

    describe('time formatting', () => {
        it('should format time correctly', async () => {
            mockCountdownService.subscribeToTimer.mockImplementation(createMockSubscription(null));

            const { result } = renderHook(() => useCountdown(retrospectiveId));

            expect(result.current.formatTime(0)).toBe('00:00');
            expect(result.current.formatTime(60)).toBe('01:00');
            expect(result.current.formatTime(125)).toBe('02:05');
            expect(result.current.formatTime(3661)).toBe('61:01');
        });
    });

    describe('cleanup', () => {
        it('should unsubscribe from timer updates on unmount', async () => {
            const unsubscribeMock = jest.fn();

            mockCountdownService.subscribeToTimer.mockReturnValue(unsubscribeMock);

            const { unmount } = renderHook(() => useCountdown(retrospectiveId));

            unmount();

            expect(unsubscribeMock).toHaveBeenCalled();
        });
    });
});
