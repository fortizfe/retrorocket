import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFirebaseMetrics } from '../../hooks/useFirebaseMetrics';
import { FirebaseMetricsService } from '../../services/optimization/FirebaseMetricsService';

// Mock FirebaseMetricsService
vi.mock('../../services/optimization/FirebaseMetricsService', () => ({
    FirebaseMetricsService: {
        getMetrics: vi.fn(),
    },
}));

const mockMetrics = {
    summary: {
        reads: 100,
        writes: 50,
        listeners: 5,
        errors: 2,
        cacheHits: 80,
        cacheMisses: 20,
    },
    uptime: 120.5,
    averageReadsPerMinute: 25.5,
    averageWritesPerMinute: 12.3,
    errorRate: 0.02,
    cacheHitRate: 0.8,
};

describe('useFirebaseMetrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        (FirebaseMetricsService.getMetrics as any).mockReturnValue(mockMetrics);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should return initial metrics', () => {
        const { result } = renderHook(() => useFirebaseMetrics());

        expect(result.current.metrics).toEqual(mockMetrics);
        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should update metrics at specified interval', () => {
        renderHook(() => useFirebaseMetrics(1000)); // 1 second

        // Initial call
        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(1);

        // Advance time by 1 second
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(2);

        // Advance time by another second
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(3);
    });

    it('should use default interval of 5000ms', () => {
        renderHook(() => useFirebaseMetrics());

        // Initial call
        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(1);

        // Advance time by less than 5 seconds
        act(() => {
            vi.advanceTimersByTime(4000);
        });

        // Should not have called again
        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(1);

        // Advance time to complete 5 seconds
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Should have called again
        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(2);
    });

    it('should update metrics when service returns new data', () => {
        const updatedMetrics = {
            ...mockMetrics,
            summary: {
                ...mockMetrics.summary,
                reads: 200,
            },
        };

        const { result } = renderHook(() => useFirebaseMetrics(1000));

        // Initial metrics
        expect(result.current.metrics).toEqual(mockMetrics);

        // Mock service to return updated metrics
        (FirebaseMetricsService.getMetrics as any).mockReturnValue(updatedMetrics);

        // Advance time to trigger update
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.metrics).toEqual(updatedMetrics);
    });

    it('should handle null metrics from service', () => {
        (FirebaseMetricsService.getMetrics as any).mockReturnValue(null);

        const { result } = renderHook(() => useFirebaseMetrics());

        expect(result.current.metrics).toBeNull();
    });

    it('should handle undefined metrics from service', () => {
        (FirebaseMetricsService.getMetrics as any).mockReturnValue(undefined);

        const { result } = renderHook(() => useFirebaseMetrics());

        expect(result.current.metrics).toBeUndefined();
    });

    it('should clean up interval on unmount', () => {
        const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

        const { unmount } = renderHook(() => useFirebaseMetrics(1000));

        unmount();

        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should restart interval when updateInterval changes', () => {
        const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
        const setIntervalSpy = vi.spyOn(window, 'setInterval');

        const { rerender } = renderHook(
            ({ interval }) => useFirebaseMetrics(interval),
            { initialProps: { interval: 1000 } }
        );

        // Initial setup
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

        // Change interval
        rerender({ interval: 2000 });

        // Should clear old interval and set new one
        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    it('should call getMetrics immediately on mount and then at intervals', () => {
        renderHook(() => useFirebaseMetrics(1000));

        // Should call immediately
        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(1);

        // Advance time
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(2);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(3);
    });

    it('should continue updating even if service throws error', () => {
        // Mock service to throw error once, then return normal metrics
        (FirebaseMetricsService.getMetrics as any)
            .mockImplementationOnce(() => {
                throw new Error('Service error');
            })
            .mockReturnValue(mockMetrics);

        const { result } = renderHook(() => useFirebaseMetrics(1000));

        // First call throws error, metrics should be null
        expect(result.current.metrics).toBeNull();

        // Advance time to trigger next update
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Should recover and get metrics
        expect(result.current.metrics).toEqual(mockMetrics);
        expect(FirebaseMetricsService.getMetrics).toHaveBeenCalledTimes(2);
    });
});
