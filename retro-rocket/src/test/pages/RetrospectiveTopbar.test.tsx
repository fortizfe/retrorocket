import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RetrospectiveTopbar from '@/features/boards/retrospective/components/RetrospectiveTopbar';
import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';
import { Retrospective } from '@/features/boards/types/retrospective';
import { Participant } from '@/features/boards/types/participant';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useParams: () => ({ id: 'retro-1' }),
    useNavigate: () => mockNavigate,
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
    default: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/hooks/useCurrentUser', () => ({
    useCurrentUser: () => ({ uid: 'user-1' }),
}));

vi.mock('@/features/boards/sentiment', () => ({
    useSentimentContext: () => ({}),
}));

vi.mock('@/features/boards/retrospective/contexts/useBoardData', () => ({
    useBoardData: vi.fn(),
}));

vi.mock('@/features/boards/participants/components/index', () => ({
    ResponsiveParticipantDisplay: ({ participants }: { participants: Participant[] }) => (
        <div data-testid="participant-display">{participants.length} participants</div>
    ),
}));

vi.mock('@/features/boards/countdown/components/index', () => ({
    CountdownTimer: () => <div data-testid="countdown-timer-mount" />,
    FacilitatorMenu: () => <div data-testid="facilitator-menu-mount" />,
}));

// Feature 038 (T012/T016): reflects the export-job props RetrospectiveTopbar lifts and
// threads down, so tests can assert the lifted state without depending on the real
// component's own markup (covered separately by ImprovedExportPopover.test.tsx). Since
// T016 made ImprovedExportPopover a pure content component (no `isOpen` prop — its
// caller only mounts it while open, matching FacilitatorMenuTabs.tsx), this mock
// renders unconditionally whenever RetrospectiveTopbar actually mounts it at all.
vi.mock('@/features/boards/export/components/ImprovedExportPopover', () => ({
    default: (props: {
        onClose: () => void;
        presentation?: 'desktop' | 'mobile';
        isExporting?: boolean;
        progress?: number;
        error?: string | null;
        success?: boolean;
        exportRetrospective?: (data: unknown, options: unknown) => Promise<void>;
    }) => (
        <div data-testid="export-popover">
            <div data-testid="export-presentation">{props.presentation}</div>
            <div data-testid="export-is-exporting">{String(props.isExporting)}</div>
            <div data-testid="export-progress">{props.progress}</div>
            <div data-testid="export-success">{String(props.success)}</div>
            <div data-testid="export-error">{String(props.error)}</div>
            <button onClick={props.onClose}>mock-close-export</button>
            <button onClick={() => props.exportRetrospective?.({}, {})}>mock-start-export</button>
        </div>
    ),
}));

// Feature 038 (T012): mocking the export *service* (not the useUnifiedExport hook
// itself) keeps the hook's real state machine running, so its setState calls are the
// ones under test — a deferred promise lets each test control exactly when an export
// "finishes" relative to the popover being open/closed.
const mockExportRetrospectiveService = vi.fn();
vi.mock('@/features/boards/export/services/unifiedExportService', () => ({
    exportRetrospective: (...args: unknown[]) => mockExportRetrospectiveService(...args),
}));

const mockUseBoardData = vi.mocked(useBoardData);

describe('RetrospectiveTopbar', () => {
    const retrospective = { id: 'retro-1', title: 'Sprint 42 Retro', createdBy: 'user-1' } as Retrospective;
    const participants = [{ id: 'p1' }, { id: 'p2' }] as Participant[];

    beforeEach(() => {
        mockNavigate.mockClear();
        mockToastSuccess.mockClear();
        mockToastError.mockClear();
        mockExportRetrospectiveService.mockClear();
    });

    const stubClipboard = () => {
        const writeText = vi.fn();
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        return writeText;
    };

    it('shows a loading placeholder when the retrospective has not loaded yet', () => {
        mockUseBoardData.mockReturnValue({
            cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
            retrospective: null, participants: [], timer: null, myFacilitatorNotes: [],
        });

        render(<RetrospectiveTopbar />);

        expect(screen.queryByTestId('countdown-timer-mount')).not.toBeInTheDocument();
    });

    it('renders the retrospective title, participant display, and countdown-timer mount point once loaded', () => {
        mockUseBoardData.mockReturnValue({
            cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: true,
            retrospective, participants, timer: null, myFacilitatorNotes: [],
        });

        render(<RetrospectiveTopbar />);

        expect(screen.getByText('Sprint 42 Retro')).toBeInTheDocument();
        expect(screen.getByTestId('participant-display')).toHaveTextContent('2 participants');
        expect(screen.getByTestId('countdown-timer-mount')).toBeInTheDocument();
        expect(screen.getByTestId('facilitator-menu-mount')).toBeInTheDocument();
    });

    describe('options menu — desktop (Direction B "Adaptive Sheet", feature 036)', () => {
        beforeEach(() => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: true,
                retrospective, participants, timer: null, myFacilitatorNotes: [],
            });
        });

        // Both the desktop (`hidden md:inline-flex`) and mobile (`md:hidden`) triggers
        // share the same accessible name by design — a real browser exposes only one to
        // the accessibility tree at a time via CSS, matching the active viewport (FR-013a).
        // jsdom doesn't apply the compiled Tailwind stylesheet, so both are present in the
        // DOM here; index [0] is the desktop trigger, [1] is the mobile one (see the
        // "mobile entry point" describe block below).
        const getDesktopTrigger = () => screen.getAllByRole('button', { name: 'retrospectivePage.options' })[0];

        it('opens the options menu with export, copy ID, share, and exit items', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            expect(screen.queryByRole('menuitem', { name: /retrospective.export.exportText/ })).not.toBeInTheDocument();

            await user.click(getDesktopTrigger());

            expect(screen.getByRole('menuitem', { name: /retrospective.export.exportText/ })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.copyId/ })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.share/ })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.exit/ })).toBeInTheDocument();
        });

        it('copies the retrospective ID and shows a confirmation toast', async () => {
            const user = userEvent.setup();
            const writeText = stubClipboard();
            render(<RetrospectiveTopbar />);

            await user.click(getDesktopTrigger());
            await user.click(screen.getByRole('menuitem', { name: /retrospectivePage.copyId/ }));

            expect(writeText).toHaveBeenCalledWith('retro-1');
            expect(mockToastSuccess).toHaveBeenCalledWith('retrospectivePage.copyId');
        });

        it('copies a shareable link and shows a confirmation toast', async () => {
            const user = userEvent.setup();
            const writeText = stubClipboard();
            render(<RetrospectiveTopbar />);

            await user.click(getDesktopTrigger());
            await user.click(screen.getByRole('menuitem', { name: /retrospectivePage.share/ }));

            expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/retro/retro-1'));
            expect(mockToastSuccess).toHaveBeenCalledWith('retrospectivePage.share');
        });

        it('navigates to the dashboard on exit', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getDesktopTrigger());
            await user.click(screen.getByRole('menuitem', { name: /retrospectivePage.exit/ }));

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });

        it('closes on Escape', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getDesktopTrigger());
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.exit/ })).toBeInTheDocument();

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('menuitem', { name: /retrospectivePage.exit/ })).not.toBeInTheDocument();
        });

        it('keeps the Floating UI positioning node separate from the Framer Motion entrance/exit node (Contract 1, feature 034) so the panel cannot lose its anchor position', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getDesktopTrigger());

            const panel = screen.getByRole('menu', { name: 'retrospectivePage.options' });
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
    });

    // Feature 038, T014/T017/T018 (US1, FR-002): selecting "Export" from the open
    // options panel closes that panel immediately and opens the export panel anchored
    // to the SAME "Options" trigger button — no new always-visible export trigger.
    describe('export panel — desktop anchor/transition mechanics (feature 038, FR-002)', () => {
        beforeEach(() => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: true,
                retrospective, participants, timer: null, myFacilitatorNotes: [],
            });
        });

        const getDesktopTrigger = () => screen.getAllByRole('button', { name: 'retrospectivePage.options' })[0];

        it('closes the options panel and opens the export panel anchored to the same Options trigger, with role dialog and the correct accessible name', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getDesktopTrigger());
            expect(screen.getByRole('menu', { name: 'retrospectivePage.options' })).toBeInTheDocument();

            await user.click(screen.getByRole('menuitem', { name: /retrospective.export.exportText/ }));

            // Options panel closed immediately.
            expect(screen.queryByRole('menu', { name: 'retrospectivePage.options' })).not.toBeInTheDocument();

            // Export panel open, anchored (role="dialog", correctly named), desktop presentation.
            const exportDialog = screen.getByRole('dialog', { name: 'retrospective.export.title' });
            expect(exportDialog).toBeInTheDocument();
            expect(screen.getByTestId('export-presentation')).toHaveTextContent('desktop');
        });

        it('shares the same DOM trigger button for both the options panel and the export panel (no new always-visible export trigger)', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            // Exactly one "Opciones" trigger on desktop — nothing new introduced for export.
            const desktopTriggers = screen.getAllByRole('button', { name: 'retrospectivePage.options' });
            expect(desktopTriggers).toHaveLength(2); // [0] desktop, [1] mobile — see mobile describe block below.

            await user.click(getDesktopTrigger());
            await user.click(screen.getByRole('menuitem', { name: /retrospective.export.exportText/ }));

            expect(screen.getByRole('dialog', { name: 'retrospective.export.title' })).toBeInTheDocument();
            // Still exactly the same two triggers — no third, export-specific button appeared.
            expect(screen.getAllByRole('button', { name: 'retrospectivePage.options' })).toHaveLength(2);
        });

        it('closes the export panel on Escape', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getDesktopTrigger());
            await user.click(screen.getByRole('menuitem', { name: /retrospective.export.exportText/ }));
            expect(screen.getByRole('dialog', { name: 'retrospective.export.title' })).toBeInTheDocument();

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('dialog', { name: 'retrospective.export.title' })).not.toBeInTheDocument();
        });
    });

    describe('options menu — mobile entry point (FR-013a, feature 036)', () => {
        beforeEach(() => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: true,
                retrospective, participants, timer: null, myFacilitatorNotes: [],
            });
        });

        const getMobileTrigger = () => screen.getAllByRole('button', { name: 'retrospectivePage.options' })[1];

        it('opens a bottom sheet with the same four actions', async () => {
            // The desktop dropdown and mobile sheet share one `open` boolean
            // (both triggers ultimately drive the same `useBoardMenuOverlay`
            // state) — in a real browser only one is ever visible, decided by
            // the `hidden md:*`/`md:hidden` CSS on each, which jsdom doesn't
            // apply. This test asserts the sheet itself renders correctly
            // when opened, not mutual exclusivity (a CSS concern, out of
            // jsdom's reach) — see e2e/export.spec.ts for the real-browser,
            // real-viewport version of that guarantee.
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getMobileTrigger());

            const sheet = screen.getByRole('dialog', { name: 'retrospectivePage.options' });
            expect(sheet).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retrospective.export.exportText/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retrospectivePage.copyId/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retrospectivePage.share/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retrospectivePage.exit/ })).toBeInTheDocument();
        });

        it('completes an action (copy ID) and closes the sheet', async () => {
            const user = userEvent.setup();
            const writeText = stubClipboard();
            render(<RetrospectiveTopbar />);

            await user.click(getMobileTrigger());
            await user.click(screen.getByRole('button', { name: /retrospectivePage.copyId/ }));

            expect(writeText).toHaveBeenCalledWith('retro-1');
            expect(screen.queryByRole('dialog', { name: 'retrospectivePage.options' })).not.toBeInTheDocument();
        });

        it('closes via an always-visible close button (not swipe-only, per contracts/accessibility-interaction-contract.md)', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getMobileTrigger());
            expect(screen.getByRole('dialog', { name: 'retrospectivePage.options' })).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'common.close' }));
            expect(screen.queryByRole('dialog', { name: 'retrospectivePage.options' })).not.toBeInTheDocument();
        });

        it('closes on Escape', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getMobileTrigger());
            expect(screen.getByRole('dialog', { name: 'retrospectivePage.options' })).toBeInTheDocument();

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('dialog', { name: 'retrospectivePage.options' })).not.toBeInTheDocument();
        });
    });

    // Feature 038, T020-T023 (US2, FR-003): selecting "Export" from the mobile options
    // sheet closes that sheet and opens the export window as its own BottomSheet
    // (mobile presentation), not the desktop-style anchored panel — reusing
    // BottomSheet.tsx unchanged, with its own independent open state (research.md §3's
    // known pitfall: sharing state with a Floating-UI-anchored dialog closes the sheet
    // prematurely since a press inside it reads as an outside press).
    describe('export panel — mobile bottom sheet (feature 038, FR-003)', () => {
        beforeEach(() => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: true,
                retrospective, participants, timer: null, myFacilitatorNotes: [],
            });
        });

        const getMobileTrigger = () => screen.getAllByRole('button', { name: 'retrospectivePage.options' })[1];

        it('closes the options sheet and opens the export window as a bottom sheet', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getMobileTrigger());
            expect(screen.getByRole('dialog', { name: 'retrospectivePage.options' })).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: /retrospective.export.exportText/ }));

            expect(screen.queryByRole('dialog', { name: 'retrospectivePage.options' })).not.toBeInTheDocument();
            expect(screen.getByRole('dialog', { name: 'retrospective.export.title' })).toBeInTheDocument();
            expect(screen.getByTestId('export-presentation')).toHaveTextContent('mobile');
        });

        it('closes via an always-visible close button', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getMobileTrigger());
            await user.click(screen.getByRole('button', { name: /retrospective.export.exportText/ }));
            expect(screen.getByRole('dialog', { name: 'retrospective.export.title' })).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'common.close' }));
            expect(screen.queryByRole('dialog', { name: 'retrospective.export.title' })).not.toBeInTheDocument();
        });

        it('does not share open state with the desktop export panel or the options sheet (research.md §3)', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(getMobileTrigger());
            await user.click(screen.getByRole('button', { name: /retrospective.export.exportText/ }));

            // Only the mobile export sheet is open — no desktop-anchored export dialog,
            // no options panel/sheet lingering open underneath it.
            expect(screen.getAllByRole('dialog', { name: 'retrospective.export.title' })).toHaveLength(1);
            expect(screen.queryByRole('menu', { name: 'retrospectivePage.options' })).not.toBeInTheDocument();
            expect(screen.queryByRole('dialog', { name: 'retrospectivePage.options' })).not.toBeInTheDocument();
        });
    });

    // Feature 038, T012 (Foundational): the export job's state (useUnifiedExport) is
    // lifted from ImprovedExportPopover.tsx up to this component so it survives the
    // popover's own open/closed state — FR-007's "re-presented correctly if reopened
    // while still running" and FR-007a's "dismissing never cancels an in-progress
    // export, outcome surfaces via toast if closed at completion". These tests exercise
    // the lift itself, independent of the desktop-anchor/mobile-sheet mechanics later
    // stories (T017-T023) build around it — opening the popover still goes through
    // today's `setShowExportPopover(true)` via the options-menu "Export" item.
    describe('export job lifecycle survives popover dismissal (feature 038, FR-007/FR-007a)', () => {
        beforeEach(() => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: true,
                retrospective, participants, timer: null, myFacilitatorNotes: [],
            });
        });

        const getDesktopTrigger = () => screen.getAllByRole('button', { name: 'retrospectivePage.options' })[0];

        function deferred<T>() {
            let resolve!: (value: T) => void;
            let reject!: (reason?: unknown) => void;
            const promise = new Promise<T>((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        }

        const openExportPopover = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.click(getDesktopTrigger());
            await user.click(screen.getByRole('menuitem', { name: /retrospective.export.exportText/ }));
        };

        it('keeps the export job running after the popover is dismissed mid-export, and shows the current progress again on reopen instead of a fresh idle panel', async () => {
            const user = userEvent.setup();
            const { promise, resolve } = deferred<void>();
            mockExportRetrospectiveService.mockReturnValue(promise);
            render(<RetrospectiveTopbar />);

            await openExportPopover(user);
            await user.click(screen.getByText('mock-start-export'));
            expect(screen.getByTestId('export-is-exporting')).toHaveTextContent('true');

            // Dismiss mid-export — the popover unmounts (mock returns null when !isOpen).
            await user.click(screen.getByText('mock-close-export'));
            expect(screen.queryByTestId('export-popover')).not.toBeInTheDocument();

            // Reopen while the job is still running: the export item click alone (no
            // separate "start") must show the job already in progress, not a fresh
            // idle panel — proving the state lived in this component, not the
            // (now-remounted) child.
            await openExportPopover(user);
            expect(screen.getByTestId('export-is-exporting')).toHaveTextContent('true');

            // The underlying job itself was never touched by the dismiss/reopen cycle —
            // only ever invoked once.
            expect(mockExportRetrospectiveService).toHaveBeenCalledTimes(1);

            resolve();
        });

        it('surfaces the export outcome via a toast when the popover is closed at completion, exactly once', async () => {
            const user = userEvent.setup();
            const { promise, resolve } = deferred<void>();
            mockExportRetrospectiveService.mockReturnValue(promise);
            render(<RetrospectiveTopbar />);

            await openExportPopover(user);
            await user.click(screen.getByText('mock-start-export'));
            await user.click(screen.getByText('mock-close-export'));

            expect(mockToastSuccess).not.toHaveBeenCalled();

            await act(async () => {
                resolve();
                await promise;
            });

            expect(mockToastSuccess).toHaveBeenCalledTimes(1);
        });

        it('auto-closes the panel once the in-panel success confirmation has had its moment, not the instant it appears (US1 Acceptance Scenario 3)', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            const user = userEvent.setup({ delay: null });
            const { promise, resolve } = deferred<void>();
            mockExportRetrospectiveService.mockReturnValue(promise);
            render(<RetrospectiveTopbar />);

            await openExportPopover(user);
            await user.click(screen.getByText('mock-start-export'));

            await act(async () => {
                resolve();
                await promise;
            });

            // Success banner visible immediately — not vanished on the same tick.
            expect(screen.getByTestId('export-popover')).toBeInTheDocument();
            expect(screen.getByTestId('export-success')).toHaveTextContent('true');

            // useUnifiedExport auto-resets `success` to false after 3s; that reset is
            // what triggers the auto-close, not the initial true transition.
            await act(async () => {
                vi.advanceTimersByTime(3000);
            });

            expect(screen.queryByTestId('export-popover')).not.toBeInTheDocument();
            vi.useRealTimers();
        });

        it('does not toast an export that completes while the popover is still open — the in-panel success state handles it', async () => {
            const user = userEvent.setup();
            const { promise, resolve } = deferred<void>();
            mockExportRetrospectiveService.mockReturnValue(promise);
            render(<RetrospectiveTopbar />);

            await openExportPopover(user);
            await user.click(screen.getByText('mock-start-export'));

            await act(async () => {
                resolve();
                await promise;
            });

            expect(screen.getByTestId('export-popover')).toBeInTheDocument();
            expect(mockToastSuccess).not.toHaveBeenCalled();
        });
    });
});
