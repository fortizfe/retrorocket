import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import ConnectedAppsCard from '@/features/auth/components/ConnectedAppsCard';
import { useConnectedApps } from '@/features/auth/hooks/useConnectedApps';
import type { ConnectedApp } from '@/features/auth/services/connectedAppsService';

/**
 * Component test for the connected-AI-assistants section (spec 050-profile-redesign,
 * tasks.md T025, User Story 3 — "Manage Account Access"). Updated ahead of the T030
 * rebuild of `ConnectedAppsCard.tsx` (per `ProfileDirectionB.tsx`'s `ConnectedAppRow` —
 * the selected direction's build reference: uniform Settings-row vocabulary shared
 * with the linked-providers list).
 *
 * The pre-existing suite only covered origin-label rendering and the
 * never-used-yet/last-used date branches, plus the AnimatePresence-wrapping
 * regression guard (design audit finding, spec 028) — genuinely thin against FR-006's
 * full contract ("listing connected apps with their connection date, and allowing
 * per-app revocation with a loading indicator and clear success/error feedback"), so
 * loading, error, empty, and revoke (success/error/in-progress) coverage is added here
 * rather than left implicit. Assertions favor semantic queries (role, raw i18n key
 * text via the global mock) over the card's specific markup/copy, which the rebuild is
 * expected to restructure.
 *
 * No local mock for `react-i18next`/`react-hot-toast`: relies on `src/test/setup.ts`'s
 * global mocks (raw-i18n-key passthrough, toast spies), same precedent
 * `UserProfileForm.test.tsx` (T018) established. `framer-motion` keeps a local
 * override — needed only to preserve the `AnimatePresence` detectable marker this
 * file's exit-animation regression test already relied on; every other `motion.*` tag
 * maps to its plain host element, same as the global mock. `Loading` is still mocked
 * locally (a stable, reused UI primitive per research.md §1) since it exposes no
 * accessible role/text of its own to query by.
 */
vi.mock('framer-motion', () => ({
    motion: {
        div: 'div',
        button: 'button',
        li: 'li',
    },
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

vi.mock('@/features/auth/hooks/useConnectedApps', () => ({
    useConnectedApps: vi.fn(),
}));

vi.mock('@/lib/components/ui/Loading', () => ({
    default: () => <div data-testid="loading" />,
}));

const mockUseConnectedApps = vi.mocked(useConnectedApps);

function app(overrides: Partial<ConnectedApp> = {}): ConnectedApp {
    return {
        id: 'c1',
        clientName: 'Claude',
        createdAt: '2026-07-20T10:00:00Z',
        status: 'active',
        origin: 'unknown',
        lastUsedAt: null,
        ...overrides,
    };
}

describe('ConnectedAppsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows a loading state while connected apps are being fetched (FR-006)', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [],
            isLoading: true,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('shows a clear error message when the fetch fails (FR-006)', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [],
            isLoading: false,
            error: 'network down',
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.loadError')).toBeInTheDocument();
    });

    it('shows a distinct empty state when no AI assistants are connected (data-model.md Connected Assistant Row[])', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.empty')).toBeInTheDocument();
    });

    it('renders distinct origin labels for two connections sharing the same clientName', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [
                app({ id: 'c1', origin: 'desktop' }),
                app({ id: 'c2', origin: 'mobile' }),
            ],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.originDesktop')).toBeInTheDocument();
        expect(screen.getByText('mcpConnector.connectedApps.originMobile')).toBeInTheDocument();
    });

    it('renders a "never used yet" state when lastUsedAt is null', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1', lastUsedAt: null })],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.neverUsedYet')).toBeInTheDocument();
        expect(screen.queryByText('mcpConnector.connectedApps.lastUsedOn')).not.toBeInTheDocument();
    });

    it('renders a last-used date instead of "never used yet" when lastUsedAt is set', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1', lastUsedAt: '2026-07-30T09:15:00Z' })],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.lastUsedOn')).toBeInTheDocument();
        expect(screen.queryByText('mcpConnector.connectedApps.neverUsedYet')).not.toBeInTheDocument();
    });

    it('wraps the connected-app list in AnimatePresence, so a revoked app can exit-animate instead of vanishing instantly (design audit finding, spec 028)', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1' }), app({ id: 'c2' })],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });

    it('revokes a connection on activation and shows a success confirmation (FR-006)', async () => {
        const mockRevoke = vi.fn().mockResolvedValue(undefined);
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1' })],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: mockRevoke,
        });

        render(<ConnectedAppsCard />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('c1'));
        await waitFor(() => expect(toast.success).toHaveBeenCalled());
    });

    it('shows a loading indicator on the control for a connection currently being revoked (FR-006)', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1' })],
            isLoading: false,
            error: null,
            revokingIds: ['c1'],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('leaves the entry visible and shows an error when revocation fails (FR-006, data-model.md revoke-error)', async () => {
        const mockRevoke = vi.fn().mockRejectedValue(new Error('revoke failed'));
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1', clientName: 'Claude' })],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: mockRevoke,
        });

        render(<ConnectedAppsCard />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('c1'));
        await waitFor(() => expect(toast.error).toHaveBeenCalled());

        // data-model.md: "revoke-error MUST leave the entry visible ... not silently
        // stuck in revoking."
        expect(screen.getByText('Claude')).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled();
    });
});
