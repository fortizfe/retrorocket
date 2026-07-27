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

const mockAddParticipant = vi.fn();

vi.mock('@/features/boards/retrospective/hooks/useRetrospective', () => ({
    useRetrospective: vi.fn(),
}));

vi.mock('@/features/boards/participants/hooks/useParticipants', () => ({
    useParticipants: vi.fn(),
}));

vi.mock('@/lib/hooks/useCurrentUser', () => ({
    useCurrentUser: vi.fn(),
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key, language: 'es' }),
}));

vi.mock('@/lib/services/OptimizedRetrospectiveService', () => ({
    OptimizedRetrospectiveService: {
        incrementParticipantCount: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/features/boards/retrospective/components/RetrospectiveBoard', () => ({
    default: () => <div data-testid="retrospective-board" />,
}));

vi.mock('@/features/auth/components/AuthWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/boards/export/components/ExportButtonGroup', () => ({
    default: () => null,
}));

vi.mock('@/features/boards/participants/components/index', () => ({
    ResponsiveParticipantDisplay: () => null,
}));

vi.mock('@/features/boards/countdown/components/index', () => ({
    CountdownTimer: () => null,
    FacilitatorMenu: () => null,
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

import { useRetrospective } from '@/features/boards/retrospective/hooks/useRetrospective';
import { useParticipants } from '@/features/boards/participants/hooks/useParticipants';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { OptimizedRetrospectiveService } from '@/lib/services/OptimizedRetrospectiveService';

const mockUseRetrospective = vi.mocked(useRetrospective);
const mockUseParticipants = vi.mocked(useParticipants);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockRetrospective = {
    id: 'retro-42',
    title: 'Sprint Review',
    template: 'start-stop-continue',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    isActive: true,
    participantCount: 2,
} as any;

const setupMocks = ({
    retroLoading = false,
    retroError = null,
    retro = mockRetrospective,
    isReady = true,
    uid = 'user-1',
    fullName = 'Alice',
} = {}) => {
    mockUseRetrospective.mockReturnValue({
        retrospective: retro,
        loading: retroLoading,
        error: retroError,
    } as any);

    mockUseParticipants.mockReturnValue({
        addParticipant: mockAddParticipant,
        participants: [],
        loading: false,
        error: null,
        removeParticipant: vi.fn(),
        refetch: vi.fn(),
    } as any);

    mockUseCurrentUser.mockReturnValue({
        uid,
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
        localStorage.clear();
    });

    it('shows loading spinner when retroLoading=true', async () => {
        setupMocks({ retroLoading: true, retro: null as any });
        await renderPage();

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows loading when isReady=false', async () => {
        setupMocks({ isReady: false });
        await renderPage();

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows error state when retroError is set', async () => {
        setupMocks({ retroError: 'Board not found', retro: null as any });
        await renderPage();

        expect(screen.getByText('Retrospectiva no encontrada')).toBeInTheDocument();
    });

    it('shows error state when retrospective is null after loading', async () => {
        setupMocks({ retro: null as any });
        await renderPage();

        expect(screen.getByText('Retrospectiva no encontrada')).toBeInTheDocument();
    });

    it('auto-joins when user is ready and no saved participantId', async () => {
        mockAddParticipant.mockResolvedValue({ id: 'p-new', isNew: true });
        setupMocks();
        await renderPage();

        await waitFor(() => {
            expect(mockAddParticipant).toHaveBeenCalledWith({
                name: 'Alice',
                userId: 'user-1',
                retrospectiveId: 'retro-42',
            });
        });
    });

    it('skips auto-join when localStorage has a saved participantId', async () => {
        localStorage.setItem('participant_retro-42_user-1', 'p-existing');
        setupMocks();
        await renderPage();

        await waitFor(() => {
            expect(mockAddParticipant).not.toHaveBeenCalled();
        });
    });

    it('increments participant count only for new participants', async () => {
        mockAddParticipant.mockResolvedValue({ id: 'p-new', isNew: true });
        setupMocks();
        await renderPage();

        await waitFor(() => {
            expect(OptimizedRetrospectiveService.incrementParticipantCount).toHaveBeenCalledWith('retro-42');
        });
    });

    it('does not increment participant count for returning participants', async () => {
        mockAddParticipant.mockResolvedValue({ id: 'p-old', isNew: false });
        setupMocks();
        await renderPage();

        await waitFor(() => {
            expect(mockAddParticipant).toHaveBeenCalled();
        });

        expect(OptimizedRetrospectiveService.incrementParticipantCount).not.toHaveBeenCalled();
    });

    it('renders RetrospectiveBoard after joining', async () => {
        mockAddParticipant.mockResolvedValue({ id: 'p-new', isNew: true });
        setupMocks();
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();
        });
    });

    it('renders board immediately when participant already in localStorage', async () => {
        localStorage.setItem('participant_retro-42_user-1', 'p-existing');
        setupMocks();
        await renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();
        });
    });
});
