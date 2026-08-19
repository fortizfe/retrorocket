import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Teams from '@/pages/Teams';
import type { TeamSummary } from '@/features/teams/types/team';
import { useTeamsQuery, type UseTeamsQueryResult } from '@/features/teams/hooks/useTeamsQuery';

// 054-team-management, T042 (spec.md User Story 3 / tasks.md Phase 5):
//
//   AC2: "Given a user who belongs to more than one team, When they open their teams
//   overview, Then they see every team they belong to, with no team missing or
//   duplicated."
//   AC3: "Given a user who belongs to no teams, When they open their teams overview,
//   Then they see an empty state indicating they are not part of any team yet."
//
// `Teams.tsx` gets its data through `useTeamsQuery` (T016) — that hook is mocked
// directly here (rather than mocking backendTeamsClient.listTeams underneath it) so this
// file is a focused test of the PAGE's rendering branches (empty state vs. populated
// list with correct per-row role badges), not of the hook's own fetch/loading/error
// bookkeeping. react-i18next, framer-motion, react-hot-toast, and react-router-dom's
// useNavigate are already mocked globally in src/test/setup.ts.

vi.mock('@/features/auth/components/AuthWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-wrapper">{children}</div>,
}));

vi.mock('@/features/teams/hooks/useTeamsQuery', () => ({
    useTeamsQuery: vi.fn(),
}));

function makeTeamsQueryResult(teams: TeamSummary[]): UseTeamsQueryResult {
    return { teams, loading: false, error: false, refetch: vi.fn() };
}

function makeTeam(overrides: Partial<TeamSummary> & Pick<TeamSummary, 'id' | 'name' | 'myRole'>): TeamSummary {
    return {
        description: null,
        ownerId: 'someone',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        memberCount: 1,
        ...overrides,
    };
}

const renderWithProviders = () =>
    render(
        <BrowserRouter>
            <Teams />
        </BrowserRouter>,
    );

describe('Teams overview page (User Story 3)', () => {
    beforeEach(() => {
        vi.mocked(useTeamsQuery).mockReset();
    });

    it('renders an explicit empty-state message when the user belongs to zero teams (AC3)', () => {
        vi.mocked(useTeamsQuery).mockReturnValue(makeTeamsQueryResult([]));

        renderWithProviders();

        expect(screen.getByText('teams.list.emptyState')).toBeInTheDocument();
        // No roster list rendered alongside the empty state.
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('lists every team the user belongs to, with the correct role badge per team, when non-empty (AC2)', () => {
        const owned = makeTeam({ id: 'team-owned', name: 'Platform Team', myRole: 'owner', memberCount: 4 });
        const joined = makeTeam({ id: 'team-joined', name: 'Growth Team', myRole: 'member', memberCount: 6 });
        vi.mocked(useTeamsQuery).mockReturnValue(makeTeamsQueryResult([owned, joined]));

        renderWithProviders();

        // Empty state must not also render alongside a populated list.
        expect(screen.queryByText('teams.list.emptyState')).not.toBeInTheDocument();

        const rows = screen.getAllByRole('listitem');
        expect(rows).toHaveLength(2);

        const ownedRow = rows.find((row) => row.textContent?.includes('Platform Team'));
        const joinedRow = rows.find((row) => row.textContent?.includes('Growth Team'));
        expect(ownedRow).toBeDefined();
        expect(joinedRow).toBeDefined();

        expect(ownedRow).toHaveTextContent('teams.list.ownerBadge');
        expect(ownedRow).not.toHaveTextContent('teams.list.memberBadge');

        expect(joinedRow).toHaveTextContent('teams.list.memberBadge');
        expect(joinedRow).not.toHaveTextContent('teams.list.ownerBadge');
    });
});
