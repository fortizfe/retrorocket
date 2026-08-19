import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamDetail from '@/pages/TeamDetail';
import type { TeamDetail as TeamDetailType, TeamMember } from '@/features/teams/types/team';

// 054-team-management, T041 (spec.md User Story 3 / tasks.md Phase 5):
//
//   AC1: "Given a user who belongs to a team, When they open that team's screen, Then
//   they see every current member of the team, including the owner."
//   FR-008: "System MUST restrict adding and removing members to the team's owner;
//   other members MUST NOT be able to perform these actions."
//   FR-012: "System MUST allow any non-owner member to voluntarily leave a team on
//   their own..."
//
// The backend already enforces owner-only add/remove server-side (GetTeamWithMembers.ts
// allows any member to read; the membership mutation use-cases 403 for non-owners) — this
// test is purely about UI *gating*: TeamDetail.tsx must not even render the owner-only
// controls for a non-owner caller, per Phase 5's Goal note in tasks.md ("this story
// delivers the remaining member-facing presentation: read-only gating and the empty
// state").
//
// react-i18next, framer-motion, react-hot-toast, and react-router-dom's useNavigate/
// useLocation/useParams are already mocked globally in src/test/setup.ts; this file
// only overrides useParams (to supply a team id) and useNavigate (to assert on it, if
// ever needed) the same way src/test/pages/Dashboard.test.tsx re-mocks react-router-dom
// locally for its own needs.
//
// AddMemberByEmailForm and TeamMemberList are the REAL components (not stubbed) because
// the exact behavior under test — no add form, no remove control on another member's
// row, a leave control on the caller's own row — is implemented by their real render
// logic (AddMemberByEmailForm is gated by TeamDetail.tsx itself; the per-row remove/leave
// gating lives inside TeamMemberList). Stubbing either would make this test tautological.

const TEAM_ID = 'team-1';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({ id: TEAM_ID }),
    };
});

vi.mock('@/features/auth/components/AuthWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-wrapper">{children}</div>,
}));

const VIEWER_UID = 'viewer-1';

vi.mock('@/lib/contexts/useUserContext', () => ({
    useUser: () => ({
        user: { uid: VIEWER_UID, email: 'viewer@example.com', displayName: 'Viewer' },
        userProfile: { uid: VIEWER_UID, email: 'viewer@example.com', displayName: 'Viewer', createdAt: new Date() },
    }),
}));

vi.mock('@/features/teams/services/backendTeamsClient', async () => {
    const actual = await vi.importActual<typeof import('@/features/teams/services/backendTeamsClient')>(
        '@/features/teams/services/backendTeamsClient',
    );
    return {
        ...actual,
        getTeam: vi.fn(),
        addTeamMember: vi.fn(),
        removeTeamMember: vi.fn(),
    };
});

import * as backendTeamsClient from '@/features/teams/services/backendTeamsClient';

function makeMember(overrides: Partial<TeamMember> & Pick<TeamMember, 'userId' | 'role'>): TeamMember {
    return {
        displayName: overrides.userId,
        email: `${overrides.userId}@example.com`,
        photoURL: null,
        joinedAt: new Date('2024-01-01'),
        ...overrides,
    };
}

/** Viewer (`VIEWER_UID`) is a plain member; an owner and one other member are also
 * present, so "no remove control on any OTHER member's row" has an other row to check. */
const teamWhereViewerIsMember: TeamDetailType = {
    id: TEAM_ID,
    name: 'Platform Team',
    description: null,
    ownerId: 'owner-1',
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    members: [
        makeMember({ userId: 'owner-1', role: 'owner', displayName: 'Team Owner', joinedAt: new Date('2023-12-01') }),
        makeMember({ userId: VIEWER_UID, role: 'member', displayName: 'Viewer', joinedAt: new Date('2023-12-02') }),
        makeMember({ userId: 'other-member-1', role: 'member', displayName: 'Other Member', joinedAt: new Date('2023-12-03') }),
    ],
};

/** Contrasting fixture: the SAME viewer, but now the owner of a different team — proves
 * the test actually distinguishes 'member' from 'owner' rather than asserting "no owner
 * controls ever render" as a tautology. */
const teamWhereViewerIsOwner: TeamDetailType = {
    id: TEAM_ID,
    name: 'Growth Team',
    description: null,
    ownerId: VIEWER_UID,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    members: [
        makeMember({ userId: VIEWER_UID, role: 'owner', displayName: 'Viewer', joinedAt: new Date('2023-12-01') }),
        makeMember({ userId: 'other-member-1', role: 'member', displayName: 'Other Member', joinedAt: new Date('2023-12-02') }),
    ],
};

const renderWithProviders = () =>
    render(
        <BrowserRouter>
            <TeamDetail />
        </BrowserRouter>,
    );

describe('TeamDetail page — read-only gating for non-owner members (User Story 3)', () => {
    beforeEach(() => {
        vi.mocked(backendTeamsClient.getTeam).mockReset();
        vi.mocked(backendTeamsClient.addTeamMember).mockReset();
        vi.mocked(backendTeamsClient.removeTeamMember).mockReset();
    });

    describe('when the viewer\'s role is "member" (not owner)', () => {
        beforeEach(() => {
            vi.mocked(backendTeamsClient.getTeam).mockResolvedValue(teamWhereViewerIsMember);
        });

        it('renders the full roster read-only, including the owner', async () => {
            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Platform Team')).toBeInTheDocument();
            });
            expect(screen.getByText('Team Owner')).toBeInTheDocument();
            expect(screen.getByText('Viewer')).toBeInTheDocument();
            expect(screen.getByText('Other Member')).toBeInTheDocument();
        });

        it('does NOT render AddMemberByEmailForm', async () => {
            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Platform Team')).toBeInTheDocument();
            });
            expect(screen.queryByLabelText('teams.members.addLabel')).not.toBeInTheDocument();
            expect(screen.queryByText('teams.members.addSectionTitle')).not.toBeInTheDocument();
        });

        it('does NOT render a remove control on any other member\'s row', async () => {
            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Platform Team')).toBeInTheDocument();
            });
            expect(screen.queryAllByRole('button', { name: 'teams.members.removeAria' })).toHaveLength(0);
        });

        it('DOES show a "leave" control on the viewer\'s own row', async () => {
            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Platform Team')).toBeInTheDocument();
            });
            // Exactly one leave control — canLeave is `isSelf`, and only the viewer's own
            // row satisfies that in this fixture.
            expect(screen.getAllByRole('button', { name: 'teams.members.leaveAria' })).toHaveLength(1);
        });
    });

    describe('when the viewer\'s role is "owner" (contrasting case)', () => {
        beforeEach(() => {
            vi.mocked(backendTeamsClient.getTeam).mockResolvedValue(teamWhereViewerIsOwner);
        });

        it('DOES render AddMemberByEmailForm', async () => {
            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Growth Team')).toBeInTheDocument();
            });
            expect(screen.getByLabelText('teams.members.addLabel')).toBeInTheDocument();
        });

        it('DOES render a remove control on the other member\'s row', async () => {
            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Growth Team')).toBeInTheDocument();
            });
            expect(screen.getAllByRole('button', { name: 'teams.members.removeAria' })).toHaveLength(1);
        });

        it('also shows a "leave" control on the viewer\'s own (owner) row', async () => {
            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Growth Team')).toBeInTheDocument();
            });
            expect(screen.getAllByRole('button', { name: 'teams.members.leaveAria' })).toHaveLength(1);
        });
    });
});
