import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountdownTimer from '@/features/boards/countdown/components/CountdownTimer';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Clock: ({ className }: any) => <div className={className} data-testid="clock-icon">Clock</div>,
    AlertCircle: ({ className }: any) => <div className={className} data-testid="alert-circle-icon">Alert</div>
}));

// Mock useCountdown hook
const mockUseCountdown = vi.fn();
vi.mock('@/features/boards/countdown/hooks/useCountdown', () => ({
    useCountdown: () => mockUseCountdown()
}));

describe('CountdownTimer', () => {
    const defaultProps = {
        retrospectiveId: 'test-retro-id',
        timer: null
    };

    const mockCountdownState = {
        timeRemaining: 300, // 5 minutes
        totalDuration: 600, // 10 minutes
        isRunning: false,
        isPaused: false,
        isFinished: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCountdown.mockReturnValue({
            countdownState: mockCountdownState,
            formatTime: vi.fn((time: number) => {
                const minutes = Math.floor(time / 60);
                const seconds = time % 60;
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            })
        });
    });

    it('renders nothing when totalDuration is 0', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, totalDuration: 0 },
            formatTime: vi.fn()
        });

        const { container } = render(<CountdownTimer {...defaultProps} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders timer when it has a duration', () => {
        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('5:00')).toBeInTheDocument();
        expect(screen.getByText('retrospective.facilitator.countdown.status.stopped')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('displays running state correctly', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isRunning: true },
            formatTime: vi.fn(() => '5:00')
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('retrospective.facilitator.countdown.status.running')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('displays paused state correctly', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isPaused: true },
            formatTime: vi.fn(() => '5:00')
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('retrospective.facilitator.countdown.status.paused')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('displays finished state correctly', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isFinished: true, timeRemaining: 0 },
            formatTime: vi.fn(() => '0:00')
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('retrospective.facilitator.countdown.status.finished')).toBeInTheDocument();
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('calls formatTime with correct time value', () => {
        const mockFormatTime = vi.fn(() => '5:00');
        mockUseCountdown.mockReturnValue({
            countdownState: mockCountdownState,
            formatTime: mockFormatTime
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(mockFormatTime).toHaveBeenCalledWith(300);
    });

    it('displays timer in monospace font', () => {
        render(<CountdownTimer {...defaultProps} />);

        const timeDisplay = screen.getByText('5:00');
        expect(timeDisplay).toHaveClass('font-mono', 'tabular-nums');
    });

    it('shows pulse animation when finished', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isFinished: true },
            formatTime: vi.fn(() => '0:00')
        });

        render(<CountdownTimer {...defaultProps} />);

        const timeDisplay = screen.getByText('0:00');
        expect(timeDisplay).toHaveClass('animate-pulse');
    });
});
