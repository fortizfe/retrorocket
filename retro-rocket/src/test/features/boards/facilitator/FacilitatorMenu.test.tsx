import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all dependencies first
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        // Needed by the real FacilitatorTabList (feature 036's mobile entry
        // point renders it unmocked) — its team-mood badge defaults to a
        // truthy placeholder ('⚪') even with sentiment analysis unmocked/
        // disabled, so the badge's `motion.span` always renders here.
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    // A detectable marker (not a bare fragment passthrough) so tests can assert
    // AnimatePresence stays mounted (in the portal) across the isOpen transition —
    // required for the dropdown to exit-animate instead of vanishing instantly
    // (design audit finding, spec 028: same AnimatePresence-boundary bug class as
    // DAF-001; `{isOpen && createPortal(<AnimatePresence>...)}` previously removed
    // AnimatePresence itself along with everything inside it in one render pass).
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

vi.mock('@/lib/components/ui/Button', () => ({
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
    Clock: () => <svg data-testid="clock-icon" />,
    Plus: () => <svg data-testid="plus-icon" />,
    Brain: () => <svg data-testid="brain-icon" />,
    StickyNote: () => <svg data-testid="sticky-note-icon" />,
    Users: () => <svg data-testid="users-icon" />,
    SlidersHorizontal: () => <svg data-testid="sliders-icon" />,
}));

vi.mock('@/features/boards/countdown/hooks/useCountdown', () => ({
    useCountdown: vi.fn(),
}));

vi.mock('@/lib/hooks/useBodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(),
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: vi.fn(),
}));

vi.mock('@/features/boards/facilitator/components/FacilitatorMenuTabs', () => ({
    default: ({ children, onClose, onTabChange }: any) => (
        <div data-testid="facilitator-menu-tabs">
            <button onClick={onClose} data-testid="close-menu">Close</button>
            <button onClick={() => onTabChange?.('controls')} data-testid="controls-tab-button">Controls</button>
            <button onClick={() => onTabChange?.('notes')} data-testid="notes-tab-button">Notes</button>
            {children}
        </div>
    ),
}));


vi.mock('@/features/boards/facilitator/components/SentimentTab', () => ({
    default: (props: any) => (
        <div data-testid="sentiment-tab">
            Sentiment Analysis {props.enabled ? 'enabled' : 'disabled'}
        </div>
    ),
}));

vi.mock('@/features/boards/facilitator/components/NotesTab', () => ({
    default: ({ retrospectiveId, facilitatorId }: any) => (
        <div data-testid="facilitator-notes">
            Notes for {retrospectiveId} by {facilitatorId}
        </div>
    ),
}));

// Now import the component
import FacilitatorMenu from '@/features/boards/countdown/components/FacilitatorMenu';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useLanguage } from '@/lib/hooks/useLanguage';

describe('FacilitatorMenu', () => {
    const defaultProps = {
        retrospectiveId: 'retro-123',
        facilitatorId: 'facilitator-456',
        isOwner: true,
        timer: null,
        myFacilitatorNotes: [],
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
                    'retrospective.facilitator.onlyYouCanSee': 'Visible solo para facilitadores',
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

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
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

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            await user.click(menuButton);

            // menu content should appear (tabs container is rendered)
            expect(screen.getByTestId('facilitator-menu-tabs')).toBeInTheDocument();
        });

        it('keeps AnimatePresence mounted even when closed, so the dropdown can exit-animate instead of being removed via `isOpen &&` gating the whole portal (design audit finding, spec 028)', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            // AnimatePresence must always be present (portaled to document.body),
            // independent of isOpen — only its child should be conditional.
            // Two are expected even before opening anything: one for the
            // desktop dialog's own AnimatePresence (FacilitatorMenu.tsx) and
            // one for the mobile BottomSheet's (feature 036, not mocked here).
            expect(screen.getAllByTestId('animate-presence').length).toBeGreaterThanOrEqual(1);
            expect(screen.queryByTestId('facilitator-menu-tabs')).not.toBeInTheDocument();

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            await user.click(menuButton);

            // Open state now also renders ControlsTab's own AnimatePresence boundaries
            // (design audit finding DAF's timer-panel exit fixes), so multiple markers
            // are expected here — the assertion is that at least one persists.
            expect(screen.getAllByTestId('animate-presence').length).toBeGreaterThanOrEqual(1);
            expect(screen.getByTestId('facilitator-menu-tabs')).toBeInTheDocument();
        });

        it('displays timer creation controls when no timer exists', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            await user.click(menuButton);

            // creation UI contains plus icon
            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });

        it('keeps the Floating UI positioning node separate from the Framer Motion entrance/exit node (Contract 1, feature 034) so the panel cannot lose its anchor position', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            await user.click(menuButton);

            const panel = screen.getByRole('dialog', { name: 'Controles del Facilitador' });
            // The node Floating UI positions (carries its computed inline `position`) must
            // not be the same node Framer Motion animates via `initial`/`animate`/`exit` —
            // otherwise Framer Motion's own `transform` (from animating `y`/`scale`) silently
            // overwrites Floating UI's positioning `transform`, pinning the panel to the
            // viewport's top-left corner instead of its trigger button (research.md §1).
            expect(panel.style.position).toBeTruthy();
            expect(panel.hasAttribute('initial')).toBe(false);
            expect(panel.hasAttribute('animate')).toBe(false);
            expect(panel.hasAttribute('exit')).toBe(false);
            // The entrance/exit animation must still happen, just on a nested node.
            expect(panel.querySelector('[animate]')).not.toBeNull();
        });

        it('displays facilitator notes component', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
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

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            await user.click(menuButton);

            // Ensure Controls tab is active
            const controlsTab = screen.getByTestId('controls-tab-button');
            await user.click(controlsTab);

            // Buttons render icons; assert icons are present
            expect(screen.getByTestId('play-icon')).toBeInTheDocument();
            expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
        });

        it('handles timer creation', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            await user.click(menuButton);

            // Click controls tab to make sure controls are visible
            const controlsTabButton = screen.getByTestId('controls-tab-button');
            await user.click(controlsTabButton);

            // The create button contains an icon (plus); assert by test id presence
            const plusIcon = screen.getByTestId('plus-icon');
            expect(plusIcon).toBeInTheDocument();
        });
    });

    describe('Edge cases', () => {
        it('handles timer tab interaction', async () => {
            const user = userEvent.setup();

            render(<FacilitatorMenu {...defaultProps} />);

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            await user.click(menuButton);

            // creation UI contains plus icon
            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });

        it('handles retrospectiveId prop correctly', () => {
            render(<FacilitatorMenu {...defaultProps} retrospectiveId="test-123" />);

            const menuButton = screen.getAllByLabelText('Controles del Facilitador')[0];
            expect(menuButton).toBeInTheDocument();
        });
    });

    describe('mobile entry point (FR-013a, feature 036)', () => {
        // Both the desktop (`hidden md:inline-flex`) and mobile (`md:hidden`)
        // triggers share the same accessible name by design — a real browser
        // exposes only one to the accessibility tree at a time via CSS,
        // matching the active viewport. jsdom doesn't apply the compiled
        // Tailwind stylesheet, so both are present here; index [1] is mobile.
        const getMobileTrigger = () => screen.getAllByLabelText('Controles del Facilitador')[1];

        it('is absent entirely (not just the desktop trigger) for a non-owner', () => {
            render(<FacilitatorMenu {...defaultProps} isOwner={false} />);
            expect(screen.queryAllByLabelText('Controles del Facilitador')).toHaveLength(0);
        });

        it('opens a bottom sheet with the real tab list, defaulting to Controls', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            await user.click(getMobileTrigger());

            const sheet = screen.getByRole('dialog', { name: 'Controles del Facilitador' });
            expect(sheet).toBeInTheDocument();
            // Desktop's FacilitatorMenuTabs is mocked to plain buttons (no
            // role="tab") in this file, so every real tab found here is the
            // mobile sheet's own FacilitatorTabList instance.
            const tabs = screen.getAllByRole('tab');
            expect(tabs).toHaveLength(4);
            const controlsTab = tabs.find((tab) => tab.id === 'facilitator-mobile-tab-controls');
            expect(controlsTab).toHaveAttribute('aria-selected', 'true');
        });

        it('switches tabs and shows the notes content, same as desktop', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            await user.click(getMobileTrigger());
            // Found by element ID, not translated text: the mocked useLanguage
            // in this file only translates a handful of controls-tab-specific
            // keys, so untranslated tab labels (e.g. the "notes" tab) render
            // as their raw i18n key — matching FacilitatorMenuTabs.test.tsx's
            // own precedent of asserting tabs by ID rather than label text.
            const notesTab = document.getElementById('facilitator-mobile-tab-notes');
            expect(notesTab).not.toBeNull();
            await user.click(notesTab!);

            expect(screen.getByTestId('facilitator-notes')).toBeInTheDocument();
        });

        it('closes on Escape', async () => {
            const user = userEvent.setup();
            render(<FacilitatorMenu {...defaultProps} />);

            await user.click(getMobileTrigger());
            expect(screen.getByRole('dialog', { name: 'Controles del Facilitador' })).toBeInTheDocument();

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('dialog', { name: 'Controles del Facilitador' })).not.toBeInTheDocument();
        });
    });
});