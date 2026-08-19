import { describe, it, expect } from 'vitest';
import { getTeamWithMembers } from '../../../../src/application/use-cases/teams/GetTeamWithMembers';
import { inMemoryTeamsPort, fakeTeam, fakeMembership } from './teamsFakes';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';

// 054-team-management, T025 (spec.md User Story 2/3 / FR-009, contracts/teams-api.md's
// GET /api/teams/:id):
//
//   FR-009: "System MUST allow any member of a team (owner or not) to view the complete
//   current list of that team's members."
//   contracts/teams-api.md: "Caller must be a current member (any role)." — 404
//   `not_found` when the team doesn't exist, 403 `forbidden` when the caller isn't a
//   member.
//
// Signature: getTeamWithMembers(deps: { teamsPort }, params: { teamId, requesterUid }) —
// mirrors the deps/params shape used across the other 054 use-cases.
//
// getTeamWithMembers does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// server/src/application/use-cases/teams/GetTeamWithMembers.ts is implemented (T031).
describe('getTeamWithMembers', () => {
    it("lets the team's owner read the team detail and full roster", async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', name: 'Platform Team', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
            ],
        );

        const result = await getTeamWithMembers({ teamsPort }, { teamId: 't1', requesterUid: 'owner-1' });

        expect(result.team).toMatchObject({ id: 't1', name: 'Platform Team' });
        expect(result.members.map((m: { userId: string }) => m.userId).sort()).toEqual(['member-1', 'owner-1']);
    });

    it('lets a non-owner member read the same team detail and full roster (not owner-only, FR-009)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
            ],
        );

        const result = await getTeamWithMembers({ teamsPort }, { teamId: 't1', requesterUid: 'member-1' });

        expect(result.members).toHaveLength(2);
    });

    it('denies a non-member with a 403 ForbiddenError', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' })],
        );

        await expect(
            getTeamWithMembers({ teamsPort }, { teamId: 't1', requesterUid: 'stranger' }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('throws a 404 NotFoundError for a nonexistent teamId', async () => {
        const teamsPort = inMemoryTeamsPort();

        await expect(
            getTeamWithMembers({ teamsPort }, { teamId: 'does-not-exist', requesterUid: 'anyone' }),
        ).rejects.toThrow(NotFoundError);
    });
});
