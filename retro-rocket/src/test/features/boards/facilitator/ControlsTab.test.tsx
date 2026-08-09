import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ControlsTab from '@/features/boards/facilitator/components/ControlsTab';
import uiPreferencesStore from '@/lib/uiPreferencesStore';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
    Settings: () => <div data-testid="settings-icon" />,
    Play: () => <div data-testid="play-icon" />,
    Pause: () => <div data-testid="pause-icon" />,
    RotateCcw: () => <div data-testid="reset-icon" />,
    Trash2: () => <div data-testid="trash-icon" />,
    Clock: () => <div data-testid="clock-icon" />,
    Timer: () => <div data-testid="timer-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
}));

vi.mock('@/lib/components/ui/ControlCard', () => ({
    default: ({ children, title }: any) => <section aria-label={title}>{children}</section>,
}));

vi.mock('@/lib/components/ui/SettingsRow', () => ({
    default: ({ label, control }: any) => <div>{label}{control}</div>,
}));

vi.mock('@/features/boards/retrospective/components/ActionColumnToggle', () => ({
    default: ({ visible, onToggle }: any) => (
        <button onClick={onToggle} data-testid="action-column-toggle">{visible ? 'on' : 'off'}</button>
    ),
}));

const mockUseCountdown = vi.fn();
vi.mock('@/features/boards/countdown/hooks/useCountdown', () => ({
    useCountdown: (...args: unknown[]) => mockUseCountdown(...args),
}));

describe('ControlsTab', () => {
    const startTimer = vi.fn();
    const pauseTimer = vi.fn();
    const resetTimer = vi.fn();
    const deleteTimer = vi.fn();
    const createTimer = vi.fn();
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    beforeEach(() => {
        vi.clearAllMocks();
        uiPreferencesStore.setShowActionColumn(true);
    });

    it('shows the timer-creation form when no timer exists', () => {
        mockUseCountdown.mockReturnValue({
            timer: null,
            countdownState: { timeRemaining: 0, totalDuration: 0, isRunning: false, isPaused: false, isFinished: false },
            loading: false,
            createTimer,
            startTimer,
            pauseTimer,
            resetTimer,
            deleteTimer,
            formatTime,
        });

        render(<ControlsTab retrospectiveId="retro-1" timer={null} />);

        expect(screen.getByText('retrospective.facilitator.countdown.create')).toBeInTheDocument();
    });

    it('shows Start when a timer exists but is not running, and calls startTimer on click', () => {
        mockUseCountdown.mockReturnValue({
            timer: { duration: 300, isRunning: false },
            countdownState: { timeRemaining: 300, totalDuration: 300, isRunning: false, isPaused: false, isFinished: false },
            loading: false,
            createTimer,
            startTimer,
            pauseTimer,
            resetTimer,
            deleteTimer,
            formatTime,
        });

        render(<ControlsTab retrospectiveId="retro-1" timer={null} />);

        const startButton = screen.getByText('retrospective.facilitator.countdown.start');
        fireEvent.click(startButton);
        expect(startTimer).toHaveBeenCalledTimes(1);
    });

    it('shows Pause (not Start) while the timer is running, and calls pauseTimer on click', () => {
        mockUseCountdown.mockReturnValue({
            timer: { duration: 300, isRunning: true },
            countdownState: { timeRemaining: 200, totalDuration: 300, isRunning: true, isPaused: false, isFinished: false },
            loading: false,
            createTimer,
            startTimer,
            pauseTimer,
            resetTimer,
            deleteTimer,
            formatTime,
        });

        render(<ControlsTab retrospectiveId="retro-1" timer={null} />);

        expect(screen.queryByText('retrospective.facilitator.countdown.start')).not.toBeInTheDocument();
        const pauseButton = screen.getByText('retrospective.facilitator.countdown.pause');
        fireEvent.click(pauseButton);
        expect(pauseTimer).toHaveBeenCalledTimes(1);
    });

    it('toggles the action-column visibility via uiPreferencesStore', () => {
        mockUseCountdown.mockReturnValue({
            timer: null,
            countdownState: { timeRemaining: 0, totalDuration: 0, isRunning: false, isPaused: false, isFinished: false },
            loading: false,
            createTimer,
            startTimer,
            pauseTimer,
            resetTimer,
            deleteTimer,
            formatTime,
        });

        render(<ControlsTab retrospectiveId="retro-1" timer={null} />);

        const toggle = screen.getByTestId('action-column-toggle');
        expect(toggle).toHaveTextContent('on');
        fireEvent.click(toggle);
        expect(uiPreferencesStore.getShowActionColumn()).toBe(false);
    });

    it('does not render the timer section without a retrospectiveId', () => {
        mockUseCountdown.mockReturnValue({
            timer: null,
            countdownState: { timeRemaining: 0, totalDuration: 0, isRunning: false, isPaused: false, isFinished: false },
            loading: false,
            createTimer,
            startTimer,
            pauseTimer,
            resetTimer,
            deleteTimer,
            formatTime,
        });

        render(<ControlsTab timer={null} />);

        expect(screen.queryByText('retrospective.facilitator.countdown.create')).not.toBeInTheDocument();
    });
});
