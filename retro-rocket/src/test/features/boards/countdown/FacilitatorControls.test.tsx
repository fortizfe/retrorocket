import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacilitatorControls from '@/features/boards/countdown/components/FacilitatorControls';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Settings: ({ className }: any) => <div className={className} data-testid="settings-icon">Settings</div>,
    Play: ({ className }: any) => <div className={className} data-testid="play-icon">Play</div>,
    Pause: ({ className }: any) => <div className={className} data-testid="pause-icon">Pause</div>,
    RotateCcw: ({ className }: any) => <div className={className} data-testid="rotate-ccw-icon">Reset</div>,
    Trash2: ({ className }: any) => <div className={className} data-testid="trash-icon">Delete</div>,
    ChevronDown: ({ className }: any) => <div className={className} data-testid="chevron-down-icon">ChevronDown</div>,
    ChevronUp: ({ className }: any) => <div className={className} data-testid="chevron-up-icon">ChevronUp</div>
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
        success: vi.fn()
    }
}));

// Mock hooks
const mockUseCountdown = vi.fn();
const mockUseCurrentUser = vi.fn();

vi.mock('@/features/boards/countdown/hooks/useCountdown', () => ({
    useCountdown: () => mockUseCountdown()
}));

vi.mock('@/lib/hooks/useCurrentUser', () => ({
    useCurrentUser: () => mockUseCurrentUser()
}));

describe('FacilitatorControls', () => {
    const user = userEvent.setup();
    const defaultProps = {
        retrospectiveId: 'test-retro-id',
        isOwner: true
    };

    const mockCurrentUser = {
        uid: 'user-123'
    };

    const mockCountdownState = {
        timeRemaining: 300,
        totalDuration: 600,
        isRunning: false,
        isPaused: false,
        isFinished: false
    };

    const mockCountdownActions = {
        createTimer: vi.fn(),
        startTimer: vi.fn(),
        pauseTimer: vi.fn(),
        resetTimer: vi.fn(),
        deleteTimer: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCurrentUser.mockReturnValue(mockCurrentUser);
        mockUseCountdown.mockReturnValue({
            timer: null,
            countdownState: mockCountdownState,
            loading: false,
            ...mockCountdownActions
        });
    });

    it('renders collapsed state by default', () => {
        render(<FacilitatorControls {...defaultProps} />);

        // component renders a translation key in tests environment
        expect(screen.getByText('retrospective.facilitator.menu')).toBeInTheDocument();
        expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    it('does not render when user is not owner', () => {
        const nonOwnerProps = { ...defaultProps, isOwner: false };
        const { container } = render(<FacilitatorControls {...nonOwnerProps} />);

        // Should not render anything when not owner
        expect(container.firstChild).toBeNull();
    });

    it('does not render when user uid is not available', () => {
        mockUseCurrentUser.mockReturnValue({ uid: null });
        const { container } = render(<FacilitatorControls {...defaultProps} />);

        // Should not render anything when uid is not available
        expect(container.firstChild).toBeNull();
    });

    it('toggles expanded state when header is clicked', async () => {
        render(<FacilitatorControls {...defaultProps} />);

        const header = screen.getByRole('button');
        await user.click(header);

        expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
    });

    it('shows timer creation form when expanded', async () => {
        render(<FacilitatorControls {...defaultProps} />);

        const header = screen.getByRole('button');
        await user.click(header);

        expect(screen.getByText('Configurar Tiempo')).toBeInTheDocument();
        expect(screen.getByText('min')).toBeInTheDocument();
        expect(screen.getByText('seg')).toBeInTheDocument();
        expect(screen.getByText('Crear')).toBeInTheDocument();
    });

    it('has default timer values', async () => {
        render(<FacilitatorControls {...defaultProps} />);

        const header = screen.getByRole('button');
        await user.click(header);

        const minutesInput = screen.getByDisplayValue('5');
        const secondsInput = screen.getByDisplayValue('0');

        expect(minutesInput).toBeInTheDocument();
        expect(secondsInput).toBeInTheDocument();
    });

    it('handles loading state correctly', () => {
        mockUseCountdown.mockReturnValue({
            timer: null,
            countdownState: mockCountdownState,
            loading: true,
            ...mockCountdownActions
        });

        render(<FacilitatorControls {...defaultProps} />);

        // Component should still render (translation key shown in test env)
        expect(screen.getByText('retrospective.facilitator.menu')).toBeInTheDocument();
    });
});
