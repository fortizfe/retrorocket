import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
vi.mock('react-hot-toast', () => ({
    default: { success: (...args: unknown[]) => mockToastSuccess(...args) },
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

vi.mock('@/features/boards/export/components/ImprovedExportPopover', () => ({
    default: () => null,
}));

const mockUseBoardData = vi.mocked(useBoardData);

describe('RetrospectiveTopbar', () => {
    const retrospective = { id: 'retro-1', title: 'Sprint 42 Retro', createdBy: 'user-1' } as Retrospective;
    const participants = [{ id: 'p1' }, { id: 'p2' }] as Participant[];

    beforeEach(() => {
        mockNavigate.mockClear();
        mockToastSuccess.mockClear();
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
});
