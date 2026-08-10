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

    describe('options menu (useBoardMenuOverlay, T054)', () => {
        beforeEach(() => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: true,
                retrospective, participants, timer: null, myFacilitatorNotes: [],
            });
        });

        it('opens the options menu with export, copy ID, share, and exit items', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            expect(screen.queryByRole('menuitem', { name: /retrospective.export.exportText/ })).not.toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'retrospectivePage.options' }));

            expect(screen.getByRole('menuitem', { name: /retrospective.export.exportText/ })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.copyId/ })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.share/ })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.exit/ })).toBeInTheDocument();
        });

        it('copies the retrospective ID and shows a confirmation toast', async () => {
            const user = userEvent.setup();
            const writeText = stubClipboard();
            render(<RetrospectiveTopbar />);

            await user.click(screen.getByRole('button', { name: 'retrospectivePage.options' }));
            await user.click(screen.getByRole('menuitem', { name: /retrospectivePage.copyId/ }));

            expect(writeText).toHaveBeenCalledWith('retro-1');
            expect(mockToastSuccess).toHaveBeenCalledWith('retrospectivePage.copyId');
        });

        it('copies a shareable link and shows a confirmation toast', async () => {
            const user = userEvent.setup();
            const writeText = stubClipboard();
            render(<RetrospectiveTopbar />);

            await user.click(screen.getByRole('button', { name: 'retrospectivePage.options' }));
            await user.click(screen.getByRole('menuitem', { name: /retrospectivePage.share/ }));

            expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/retro/retro-1'));
            expect(mockToastSuccess).toHaveBeenCalledWith('retrospectivePage.share');
        });

        it('navigates to the dashboard on exit', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(screen.getByRole('button', { name: 'retrospectivePage.options' }));
            await user.click(screen.getByRole('menuitem', { name: /retrospectivePage.exit/ }));

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });

        it('closes on Escape', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(screen.getByRole('button', { name: 'retrospectivePage.options' }));
            expect(screen.getByRole('menuitem', { name: /retrospectivePage.exit/ })).toBeInTheDocument();

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('menuitem', { name: /retrospectivePage.exit/ })).not.toBeInTheDocument();
        });

        it('keeps the Floating UI positioning node separate from the Framer Motion entrance/exit node (Contract 1, feature 034) so the panel cannot lose its anchor position', async () => {
            const user = userEvent.setup();
            render(<RetrospectiveTopbar />);

            await user.click(screen.getByRole('button', { name: 'retrospectivePage.options' }));

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
});
