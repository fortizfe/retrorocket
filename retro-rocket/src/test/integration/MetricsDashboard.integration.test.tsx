import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MetricsDashboard from '../../components/optimization/MetricsDashboard';
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

describe('MetricsDashboard Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (FirebaseMetricsService.getMetrics as any).mockReturnValue(mockMetrics);
        vi.stubEnv('DEV', true);
        vi.stubEnv('PROD', false);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('Keyboard Shortcut Integration', () => {
        it('should toggle visibility with Ctrl+Shift+M globally', async () => {
            render(<MetricsDashboard />);

            // Initially not visible
            expect(screen.queryByText('🔥 Firebase Metrics')).not.toBeInTheDocument();

            // Press Ctrl+Shift+M (lowercase)
            fireEvent.keyDown(window, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.getByText('🔥 Firebase Metrics')).toBeInTheDocument();
            });

            // Press again to hide
            fireEvent.keyDown(window, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.queryByText('🔥 Firebase Metrics')).not.toBeInTheDocument();
            });
        });

        it('should work with both case variations of M key', async () => {
            render(<MetricsDashboard />);

            // Test lowercase m
            fireEvent.keyDown(window, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.getByText('🔥 Firebase Metrics')).toBeInTheDocument();
            });

            // Hide panel
            fireEvent.keyDown(window, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.queryByText('🔥 Firebase Metrics')).not.toBeInTheDocument();
            });

            // Test uppercase M
            fireEvent.keyDown(window, {
                key: 'M',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.getByText('🔥 Firebase Metrics')).toBeInTheDocument();
            });
        });

        it('should prevent default behavior for the keyboard shortcut', async () => {
            render(<MetricsDashboard />);

            const event = new KeyboardEvent('keydown', {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true,
                cancelable: true,
            });

            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            // Dispatch the event to window
            window.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should not respond to partial key combinations', () => {
            render(<MetricsDashboard />);

            const wrongCombinations = [
                { key: 'm', ctrlKey: true, shiftKey: false },
                { key: 'm', ctrlKey: false, shiftKey: true },
                { key: 'm', ctrlKey: false, shiftKey: false },
                { key: 'n', ctrlKey: true, shiftKey: true },
            ];

            wrongCombinations.forEach(combination => {
                fireEvent.keyDown(window, combination);
                expect(screen.queryByText('🔥 Firebase Metrics')).not.toBeInTheDocument();
            });
        });
    });

    describe('Metrics Data Integration', () => {
        it('should display real metrics data when visible', async () => {
            render(<MetricsDashboard />);

            // Show panel
            fireEvent.keyDown(window, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.getByText('🔥 Firebase Metrics')).toBeInTheDocument();
            });

            // Verify metrics are displayed
            expect(screen.getByText('2h 0m')).toBeInTheDocument(); // formatted uptime
            expect(screen.getByText('25.5')).toBeInTheDocument(); // reads per minute
            expect(screen.getByText('12.3')).toBeInTheDocument(); // writes per minute
            expect(screen.getByText('5')).toBeInTheDocument(); // listeners
            expect(screen.getByText('80.0%')).toBeInTheDocument(); // cache hit rate
            expect(screen.getByText('2.00%')).toBeInTheDocument(); // error rate
            expect(screen.getByText('100')).toBeInTheDocument(); // total reads
            expect(screen.getByText('50')).toBeInTheDocument(); // total writes
            expect(screen.getByText('2')).toBeInTheDocument(); // total errors
        });
    });

    describe('Environment Integration', () => {
        it('should show help text in development mode', async () => {
            render(<MetricsDashboard />);

            fireEvent.keyDown(window, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.getByText('🔥 Firebase Metrics')).toBeInTheDocument();
            });

            expect(screen.getByText('Press Ctrl+Shift+M to toggle')).toBeInTheDocument();
        });
    });

    describe('Component Lifecycle Integration', () => {
        it('should properly clean up event listeners on unmount', () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = render(<MetricsDashboard />);

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        it('should clean up intervals on unmount', () => {
            vi.useFakeTimers();

            const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

            const { unmount } = render(<MetricsDashboard />);

            unmount();

            expect(clearIntervalSpy).toHaveBeenCalled();

            vi.useRealTimers();
        });
    });

    describe('User Interaction Integration', () => {
        it('should close panel via close button', async () => {
            render(<MetricsDashboard />);

            // Show panel
            fireEvent.keyDown(window, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            });

            await waitFor(() => {
                expect(screen.getByText('🔥 Firebase Metrics')).toBeInTheDocument();
            });

            // Click close button
            const closeButton = screen.getByRole('button', { name: '×' });
            fireEvent.click(closeButton);

            expect(screen.queryByText('🔥 Firebase Metrics')).not.toBeInTheDocument();
        });

        it('should maintain state consistency across multiple interactions', async () => {
            render(<MetricsDashboard />);

            // Multiple show/hide cycles
            for (let i = 0; i < 3; i++) {
                // Show
                fireEvent.keyDown(window, {
                    key: 'm',
                    ctrlKey: true,
                    shiftKey: true,
                });

                await waitFor(() => {
                    expect(screen.getByText('🔥 Firebase Metrics')).toBeInTheDocument();
                });

                // Hide
                fireEvent.keyDown(window, {
                    key: 'm',
                    ctrlKey: true,
                    shiftKey: true,
                });

                await waitFor(() => {
                    expect(screen.queryByText('🔥 Firebase Metrics')).not.toBeInTheDocument();
                });
            }
        });
    });
});
