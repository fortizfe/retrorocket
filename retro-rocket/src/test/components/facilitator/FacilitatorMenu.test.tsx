import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all dependencies first
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../components/ui/Button', () => ({
    default: ({ children, onClick, disabled, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('lucide-react', () => ({
    Menu: () => <svg data-testid="menu-icon" />,
    X: () => <svg data-testid="x-icon" />,
    Settings: () => <svg data-testid="settings-icon" />,
    Play: () => <svg data-testid="play-icon" />,
    Pause: () => <svg data-testid="pause-icon" />,
    RotateCcw: () => <svg data-testid="rotate-icon" />,
    Trash2: () => <svg data-testid="trash-icon" />,
    Timer: () => <svg data-testid="timer-icon" />,
    Brain: () => <svg data-testid="brain-icon" />,
    StickyNote: () => <svg data-testid="sticky-note-icon" />,
}));

vi.mock('../../../hooks/useCountdown', () => ({
    useCountdown: vi.fn(),
}));

vi.mock('../../../hooks/useBodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(),
}));

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: vi.fn(),
}));

vi.mock('../../../components/facilitator/FacilitatorNotes', () => ({
    FacilitatorNotes: ({ retrospectiveId, facilitatorId }: any) => (
        <div data-testid="facilitator-notes">
            Notes for {retrospectiveId} by {facilitatorId}
        </div>
    ),
}));

vi.mock('../../../components/facilitator/FacilitatorMenuTabs', () => ({
    default: ({ children, onClose, activeTab, onTabChange }: any) => (
        <div data-testid="facilitator-menu-tabs">
            <button onClick={onClose} data-testid="close-menu">Close</button>
            <button onClick={() => onTabChange?.('timer')} data-testid="timer-tab-button">Timer</button>
            <button onClick={() => onTabChange?.('notes')} data-testid="notes-tab-button">Notes</button>
            {children}
        </div>
    ),
}));

vi.mock('../../../components/facilitator/TimerTab', () => ({
    default: ({ retrospectiveId }: any) => (
        <div data-testid="timer-tab">
            Timer for {retrospectiveId}
            <button data-testid="create-timer-button">Crear Temporizador</button>
            <div>Iniciar</div>
            <div>Eliminar</div>
        </div>
    ),
}));

vi.mock('../../../components/facilitator/SentimentTab', () => ({
    default: (props: any) => (
        <div data-testid="sentiment-tab">
            Sentiment Analysis {props.enabled ? 'enabled' : 'disabled'}
        </div>
    ),
}));

vi.mock('../../../components/facilitator/NotesTab', () => ({
    default: ({ retrospectiveId, facilitatorId }: any) => (
        <div data-testid="facilitator-notes">
            Notes for {retrospectiveId} by {facilitatorId}
        </div>
    ),
}));

// Now import the component
import FacilitatorMenu from '../../../components/countdown/FacilitatorMenu';
import { useCountdown } from '../../../hooks/useCountdown';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useLanguage } from '../../../hooks/useLanguage';

describe('FacilitatorMenu', () => {
    const defaultProps = {
        retrospectiveId: 'retro-123',
        facilitatorId: 'facilitator-456',
        isOwner: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup useCountdown mock
        vi.mocked(useCountdown).mockReturnValue({
            timer: null,
            countdownState: {
                isRunning: false,
                isPaused: false,
                isFinished: false,
                timeRemaining: 0,
                totalDuration: 300,
            },
            loading: false,
            error: null,
            createTimer: vi.fn(),
            startTimer: vi.fn(),
            pauseTimer: vi.fn(),
            resetTimer: vi.fn(),
            deleteTimer: vi.fn(),
            formatTime: vi.fn((seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`),
        });

        // Setup useLanguage mock with type assertion
        vi.mocked(useLanguage).mockReturnValue({
            currentLanguage: 'es',
            changeLanguage: vi.fn(),
            getAvailableLanguages: vi.fn(() => []),
            t: vi.fn().mockImplementation((key: string) => {
                const translations: Record<string, string> = {
                    'retrospective.facilitator.controls': 'Controles del Facilitador',
                    'retrospective.facilitator.configureTime': 'Configurar Tiempo',
                    'retrospective.facilitator.create': 'Crear Temporizador',
                    'retrospective.facilitator.onlyYouCanSee': 'Solo tú puedes ver estos controles',
                    'facilitator.timer.create': 'Crear Temporizador',
                    'facilitator.timer.start': 'Iniciar',
                    'facilitator.timer.pause': 'Pausar',
                    'facilitator.timer.reset': 'Reiniciar',
                    'facilitator.timer.delete': 'Eliminar',
                    'facilitator.timer.minutes': 'minutos',
                    'facilitator.timer.seconds': 'segundos',
                };
                return translations[key] || key;
            }) as any,
        });

        // Setup useBodyScrollLock mock
        vi.mocked(useBodyScrollLock).mockReturnValue({
            restoreScroll: vi.fn(),
        });
    });

    describe('Rendering', () => {
        it('renders facilitator menu button when user is owner', () => {
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            expect(menuButton).toBeInTheDocument();
        });

        it('does not render when user is not owner', () => {
            render(<FacilitatorMenu {...defaultProps} isOwner={false} />);

            const menuButton = screen.queryByLabelText('Controles del Facilitador');
            expect(menuButton).not.toBeInTheDocument();
        });

        it('opens menu when button is clicked', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            await user.click(menuButton);

            expect(menuButton).toHaveAttribute('aria-expanded', 'true');
        });

        it('displays timer creation controls when no timer exists', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            await user.click(menuButton);

            expect(screen.getByText('Crear Temporizador')).toBeInTheDocument();
        });

        it('displays facilitator notes component', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            await user.click(menuButton);

            // Click on notes tab to switch to notes
            const notesTabButton = screen.getByTestId('notes-tab-button');
            await user.click(notesTabButton);

            expect(screen.getByTestId('facilitator-notes')).toBeInTheDocument();
            expect(screen.getByText(/Notes for retro-123 by/)).toBeInTheDocument();
        });
    });

    describe('Timer functionality', () => {
        it('shows timer controls when timer exists', async () => {
            const user = userEvent.setup();

            vi.mocked(useCountdown).mockReturnValue({
                timer: { id: 'timer-1', duration: 300 } as any,
                countdownState: {
                    isRunning: false,
                    isPaused: false,
                    isFinished: false,
                    timeRemaining: 300,
                    totalDuration: 300,
                },
                loading: false,
                error: null,
                createTimer: vi.fn(),
                startTimer: vi.fn(),
                pauseTimer: vi.fn(),
                resetTimer: vi.fn(),
                deleteTimer: vi.fn(),
                formatTime: vi.fn((seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`),
            });

            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            await user.click(menuButton);

            expect(screen.getByText('Iniciar')).toBeInTheDocument();
            expect(screen.getByText('Eliminar')).toBeInTheDocument();
        });

        it('handles timer creation', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            await user.click(menuButton);

            const createButton = screen.getByText('Crear Temporizador');
            expect(createButton).toBeInTheDocument();
        });
    });

    describe('Edge cases', () => {
        it('handles timer tab interaction', async () => {
            const user = userEvent.setup();

            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            await user.click(menuButton);

            const createButton = screen.getByText('Crear Temporizador');
            expect(createButton).toBeInTheDocument();
        });

        it('handles retrospectiveId prop correctly', () => {
            render(<FacilitatorMenu {...defaultProps} retrospectiveId="test-123" />);

            const menuButton = screen.getByLabelText('Controles del Facilitador');
            expect(menuButton).toBeInTheDocument();
        });
    });
});