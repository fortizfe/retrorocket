import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    useParams: () => ({ id: 'retro-42' }),
    useNavigate: () => mockNavigate,
}));

vi.mock('@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync', () => ({
    useRetrospectiveRealtimeSync: vi.fn(),
}));

vi.mock('@/lib/hooks/useCurrentUser', () => ({
    useCurrentUser: vi.fn(),
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key, language: 'es' }),
}));

vi.mock('@/features/boards/retrospective/components/RetrospectiveBoard', () => ({
    default: () => <div data-testid="retrospective-board" />,
}));

vi.mock('@/features/auth/components/AuthWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get: (_target, tag: string) =>
            ({ children, ...props }: any) => React.createElement(tag, props, children),
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/lib/components/ui/Loading', () => ({
    default: () => <div data-testid="loading-spinner" />,
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
    toast: { success: vi.fn(), error: vi.fn() },
}));

import { useRetrospectiveRealtimeSync } from '@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

const mockUseRetrospectiveRealtimeSync = vi.mocked(useRetrospectiveRealtimeSync);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockBoard = {
    id: 'retro-42',
    title: 'Sprint Review',
    createdBy: 'user-1',
    isFacilitator: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 2,
    isActive: true,
    columnGroupingStates: {},
    columns: [],
    cards: [],
    groups: [],
    actionItems: [],
    participants: [],
    timer: null,
    myFacilitatorNotes: [],
    sentimentResults: [],
} as any;

const setupMocks = ({
    loading = false,
    error = null as string | null,
    notFound = false,
    board = mockBoard,
    isReady = true,
    fullName = 'Alice',
} = {}) => {
    mockUseRetrospectiveRealtimeSync.mockReturnValue({ board, loading, error, notFound } as any);

    mockUseCurrentUser.mockReturnValue({
        uid: 'user-1',
        fullName,
        isReady,
        email: null,
        displayName: fullName,
        photoURL: null,
        userProfile: null,
        isAuthenticated: true,
        loading: false,
    } as any);
};

// Dynamic import the page after mocks are set up
const renderPage = async () => {
    const { default: RetrospectivePage } = await import('@/pages/RetrospectivePage');
    return render(<RetrospectivePage />);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RetrospectivePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading spinner while the board is loading', async () => {
        setupMocks({ loading: true, board: null as any });
        await renderPage();

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows loading when isReady=false', async () => {
        setupMocks({ isReady: false });
        await renderPage();

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows the board-deleted state when notFound=true, distinct from the generic error state', async () => {
        setupMocks({ notFound: true, board: null as any, error: 'El tablero especificado no existe o no está disponible' });
        await renderPage();

        expect(screen.getByText('retrospectivePage.boardDeleted.title')).toBeInTheDocument();
        expect(screen.queryByText('Retrospectiva no encontrada')).not.toBeInTheDocument();
    });

    it('shows a generic error state when the load fails for a reason other than not-found', async () => {
        setupMocks({ error: 'Network error', board: null as any });
        await renderPage();

        expect(screen.getByText('Retrospectiva no encontrada')).toBeInTheDocument();
    });

    it('shows error state when board is null after loading with no explicit error', async () => {
        setupMocks({ board: null as any });
        await renderPage();

        expect(screen.getByText('Retrospectiva no encontrada')).toBeInTheDocument();
    });

    it('renders RetrospectiveBoard once the board has loaded — no separate join/joining state (join happens inside the sync hook)', async () => {
        setupMocks();
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();
        });
    });
});
