import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountdownTimer from '../../../components/countdown/CountdownTimer';

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
vi.mock('../../../hooks/useCountdown', () => ({
    useCountdown: () => mockUseCountdown()
}));

describe('CountdownTimer', () => {
    const defaultProps = {
        retrospectiveId: 'test-retro-id'
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
            }),
            loading: false
        });
    });

    it('renders nothing when loading', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: mockCountdownState,
            formatTime: vi.fn(),
            loading: true
        });

        const { container } = render(<CountdownTimer {...defaultProps} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when totalDuration is 0', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, totalDuration: 0 },
            formatTime: vi.fn(),
            loading: false
        });

        const { container } = render(<CountdownTimer {...defaultProps} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders timer when not loading and has duration', () => {
        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('5:00')).toBeInTheDocument();
        expect(screen.getByText('Detenido')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('displays running state correctly', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isRunning: true },
            formatTime: vi.fn(() => '5:00'),
            loading: false
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('En curso')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('displays paused state correctly', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isPaused: true },
            formatTime: vi.fn(() => '5:00'),
            loading: false
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('Pausado')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('displays finished state correctly', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isFinished: true, timeRemaining: 0 },
            formatTime: vi.fn(() => '0:00'),
            loading: false
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('Tiempo terminado')).toBeInTheDocument();
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('calculates and displays progress percentage correctly', () => {
        // 300 remaining out of 600 total = 50% progress
        render(<CountdownTimer {...defaultProps} />);

        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('calls formatTime with correct time value', () => {
        const mockFormatTime = vi.fn(() => '5:00');
        mockUseCountdown.mockReturnValue({
            countdownState: mockCountdownState,
            formatTime: mockFormatTime,
            loading: false
        });

        render(<CountdownTimer {...defaultProps} />);

        expect(mockFormatTime).toHaveBeenCalledWith(300);
    });

    it('displays timer in monospace font', () => {
        render(<CountdownTimer {...defaultProps} />);

        const timeDisplay = screen.getByText('5:00');
        expect(timeDisplay).toHaveClass('text-xl', 'font-mono', 'font-bold');
    });

    it('shows pulse animation when finished', () => {
        mockUseCountdown.mockReturnValue({
            countdownState: { ...mockCountdownState, isFinished: true },
            formatTime: vi.fn(() => '0:00'),
            loading: false
        });

        render(<CountdownTimer {...defaultProps} />);

        const timeDisplay = screen.getByText('0:00');
        expect(timeDisplay).toHaveClass('animate-pulse');
    });
});
