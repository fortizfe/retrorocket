import { describe, it, expect, vi } from 'vitest';
import { getTeamMetrics } from '../../../../src/application/use-cases/teams/GetTeamMetrics';
import { ForbiddenError } from '../../../../src/domain/errors';
import type { TeamsPort, TeamMembershipRecord } from '../../../../src/application/ports/teams';
import type { TeamMetricsPort, TeamMetricsSummary } from '../../../../src/application/ports/teamMetrics';

// 056-team-metrics-dashboard, T003 (spec.md User Story 1 / contracts/team-metrics-api.md's
// GET /api/teams/:id/metrics / tasks.md T008):
//
//   "Caller must be a current member of the team (owner or member) — same requirement
//   as GET /api/teams/:id (FR-002/FR-003)."
//   "This aggregation ... does not itself enforce membership — the calling use-case
//   checks TeamsPort.getMembership first (research.md item 2)."
//
// Signature contract for getTeamMetrics — mirrors the deps/params shape used across the
// other teams use-cases (e.g. getTeamWithMembers), but only needs the single
// TeamsPort method it actually calls:
//
//   getTeamMetrics(
//     deps: { teamsPort: Pick<TeamsPort, 'getMembership'>; teamMetricsPort: TeamMetricsPort },
//     input: { teamId: string; requesterUid: string },
//   ): Promise<TeamMetricsSummary>
//
// Uses simple inline fakes (vi.fn()-backed single-method objects), matching this
// codebase's established convention for a use-case that only needs one or two port
// methods (see e.g. test/application/use-cases/retrospective/SetTypingStatus.test.ts) —
// not the shared teamsFakes.ts in-memory port, which exists for the 054 use-cases that
// exercise TeamsPort's full read/write surface.
//
// getTeamMetrics does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// server/src/application/use-cases/teams/GetTeamMetrics.ts is implemented (T008).

function fakeMembership(overrides: Partial<TeamMembershipRecord> = {}): TeamMembershipRecord {
    return {
        id: 'm1',
        teamId: 't1',
        userId: 'u1',
        role: 'member',
        joinedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    };
}

function fakeTeamsPort(membership: TeamMembershipRecord | null): Pick<TeamsPort, 'getMembership'> {
    return {
        getMembership: vi.fn(async () => membership),
    };
}

const SUMMARY: TeamMetricsSummary = {
    teamId: 't1',
    retrospectiveCount: 3,
    averageParticipants: 4.3,
    actionItemsCreated: 0,
    moodEvolution: [],
};

function fakeTeamMetricsPort(summary: TeamMetricsSummary): TeamMetricsPort {
    return {
        getTeamMetrics: vi.fn(async () => summary),
    };
}

describe('getTeamMetrics', () => {
    it('throws a 403 ForbiddenError when the requester has no membership, without ever calling TeamMetricsPort', async () => {
        const teamsPort = fakeTeamsPort(null);
        const teamMetricsPort = fakeTeamMetricsPort(SUMMARY);

        await expect(
            getTeamMetrics({ teamsPort, teamMetricsPort }, { teamId: 't1', requesterUid: 'stranger' }),
        ).rejects.toThrow(ForbiddenError);

        expect(teamMetricsPort.getTeamMetrics).not.toHaveBeenCalled();
    });

    it('delegates to TeamMetricsPort.getTeamMetrics(teamId) and returns its result unchanged when the requester is a current member', async () => {
        const membership = fakeMembership({ teamId: 't1', userId: 'u1', role: 'member' });
        const teamsPort = fakeTeamsPort(membership);
        const teamMetricsPort = fakeTeamMetricsPort(SUMMARY);

        const result = await getTeamMetrics({ teamsPort, teamMetricsPort }, { teamId: 't1', requesterUid: 'u1' });

        expect(teamsPort.getMembership).toHaveBeenCalledWith('t1', 'u1');
        expect(teamMetricsPort.getTeamMetrics).toHaveBeenCalledWith('t1');
        expect(result).toBe(SUMMARY);
    });

    it('delegates the same way for an owner-role membership, not only a member-role one', async () => {
        const membership = fakeMembership({ teamId: 't1', userId: 'owner-1', role: 'owner' });
        const teamsPort = fakeTeamsPort(membership);
        const teamMetricsPort = fakeTeamMetricsPort(SUMMARY);

        const result = await getTeamMetrics({ teamsPort, teamMetricsPort }, { teamId: 't1', requesterUid: 'owner-1' });

        expect(teamMetricsPort.getTeamMetrics).toHaveBeenCalledWith('t1');
        expect(result).toEqual(SUMMARY);
    });
});
