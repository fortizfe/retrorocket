import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LinkedProvidersCard from '@/features/auth/components/LinkedProvidersCard';
import { useLinkedProviders } from '@/features/auth/hooks/useLinkedProviders';
import { startLinkProvider } from '@/features/auth/services/backendAuthClient';

/**
 * Component test for the linked sign-in providers section (spec 050-profile-redesign,
 * tasks.md T024, User Story 3 — "Manage Account Access"). Updated ahead of the T029
 * rebuild of `LinkedProvidersCard.tsx` (per `ProfileDirectionB.tsx`'s `ProviderRow` —
 * the selected direction's build reference: uniform Settings-row vocabulary, explicit
 * status text, an explicit not-yet-available row for Apple).
 *
 * Assertions now favor semantic queries (role, accessible name/description, disabled
 * state, callback behavior) over the previous hand-rolled `data-testid` icon/Button/
 * Card mocks and hardcoded-Spanish-copy text assertions, which coupled this file to
 * markup/copy the rebuild is expected to change — the current component hardcodes its
 * copy in Spanish outside i18next entirely (a gap noted in tasks.md T005/data-model.md),
 * so T029 is expected to introduce translation keys here, which would break any
 * assertion tied to the literal current Spanish strings.
 *
 * No local mocks for `react-i18next`/`react-hot-toast`: relies on `src/test/setup.ts`'s
 * global mocks (raw-i18n-key passthrough, toast spies), same precedent
 * `UserProfileForm.test.tsx` (T018) established. `Loading` is still mocked locally (a
 * stable, reused UI primitive per research.md §1 — not expected to be swapped out by
 * the rebuild) since it exposes no accessible role/text of its own to query by.
 */
vi.mock('@/features/auth/hooks/useLinkedProviders', () => ({
    useLinkedProviders: vi.fn(),
    getProviderDisplayName: vi.fn((provider: string) => {
        if (provider === 'google.com') return 'Google';
        if (provider === 'github.com') return 'GitHub';
        return provider;
    }),
}));
vi.mock('@/features/auth/services/backendAuthClient', () => ({
    startLinkProvider: vi.fn(),
}));
vi.mock('@/lib/components/ui/Loading', () => ({
    default: () => <div data-testid="loading" />,
}));

const mockUseLinkedProviders = vi.mocked(useLinkedProviders);
const mockStartLinkProvider = vi.mocked(startLinkProvider);

describe('LinkedProvidersCard', () => {
    const mockRefreshLinkedProviders = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseLinkedProviders.mockReturnValue({
            linkedProviders: [],
            isLoading: false,
            error: null,
            refreshLinkedProviders: mockRefreshLinkedProviders,
        });
    });

    it('shows the loading state while providers are being fetched', () => {
        mockUseLinkedProviders.mockReturnValue({
            linkedProviders: [],
            isLoading: true,
            error: null,
            refreshLinkedProviders: mockRefreshLinkedProviders,
        });
        render(<LinkedProvidersCard />);
        expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('displays an error message with a retry action that refreshes the list', () => {
        mockUseLinkedProviders.mockReturnValue({
            linkedProviders: [],
            isLoading: false,
            error: 'Test error',
            refreshLinkedProviders: mockRefreshLinkedProviders,
        });
        render(<LinkedProvidersCard />);
        expect(screen.getByText('Test error')).toBeInTheDocument();

        // The error state's only control is the retry action — a role-based query
        // rather than matching its (currently hardcoded, likely-to-change) label text.
        fireEvent.click(screen.getByRole('button'));
        expect(mockRefreshLinkedProviders).toHaveBeenCalled();
    });

    it('lists Google and GitHub as available to link when neither is linked yet (FR-005, linkable state)', () => {
        render(<LinkedProvidersCard />);
        // Provider names are rendered literally ("Google"/"GitHub"), the same
        // convention `ProfileDirectionB.tsx`'s `PROVIDER_LABELS` and `Profile.test.tsx`
        // (T012) rely on for their own primary-provider assertion — stable regardless
        // of whatever surrounding i18n copy the rebuild introduces.
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('GitHub')).toBeInTheDocument();

        // data-model.md's Linked Provider Row: a "linkable" provider offers a link
        // action. Both are linkable here, so exactly two actionable controls exist.
        const actionableButtons = screen.getAllByRole('button').filter((btn) => !(btn as HTMLButtonElement).disabled);
        expect(actionableButtons).toHaveLength(2);
    });

    it('completes the link flow when a linkable provider\'s action is activated (FR-005)', () => {
        Object.defineProperty(window, 'location', { value: { pathname: '/perfil' }, writable: true, configurable: true });
        render(<LinkedProvidersCard />);

        // Google is listed before GitHub in every direction inventoried for this
        // feature (current component's `availableProviders`, ProfileDirectionB's
        // `PROVIDER_DEFS`) — first actionable control is Google's link action.
        const actionableButtons = screen.getAllByRole('button').filter((btn) => !(btn as HTMLButtonElement).disabled);
        fireEvent.click(actionableButtons[0]);
        expect(mockStartLinkProvider).toHaveBeenCalledWith('google', '/perfil');
    });

    it('shows a linked provider as linked and does not offer a link action for it (FR-005, linked state)', () => {
        mockUseLinkedProviders.mockReturnValue({
            linkedProviders: ['google.com'],
            isLoading: false,
            error: null,
            refreshLinkedProviders: mockRefreshLinkedProviders,
        });
        render(<LinkedProvidersCard />);

        // "Google" still appears (as the linked provider's own name) but no longer as
        // an actionable link target — data-model.md: "A provider already linked MUST
        // NOT also offer a link action." Only GitHub's link action remains.
        expect(screen.getByText('Google')).toBeInTheDocument();
        const actionableButtons = screen.getAllByRole('button').filter((btn) => !(btn as HTMLButtonElement).disabled);
        expect(actionableButtons).toHaveLength(1);
    });

    // EXPECTED TO FAIL against the pre-rebuild LinkedProvidersCard.tsx: Apple is
    // entirely absent from the rendered UI today (`availableProviders` only lists
    // google/github — confirmed by reading the component; `handleLinkProvider`'s
    // apple branch and `getProviderIcon`'s 'apple.com' case are dead code, never
    // reached from any rendered row). FR-005 requires providers "not yet available"
    // (Apple) to be clearly indicated, and data-model.md's Linked Provider Row
    // validation rule requires that status be communicated through visible text —
    // not silently omitted. This is the gap T029 closes (ProfileDirectionB.tsx's
    // `PROVIDER_DEFS` already includes an `apple`/`available: false` entry as its
    // build reference).
    it('shows Apple as not-yet-available rather than omitting it from the list (FR-005, not-yet-available state)', () => {
        render(<LinkedProvidersCard />);
        expect(screen.getByText(/apple/i)).toBeInTheDocument();
    });
});
