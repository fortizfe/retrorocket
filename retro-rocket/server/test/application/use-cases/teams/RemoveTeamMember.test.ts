import { describe, it, expect } from 'vitest';
import { removeTeamMember } from '../../../../src/application/use-cases/teams/RemoveTeamMember';
import { inMemoryTeamsPort, fakeTeam, fakeMembership } from './teamsFakes';
import { AppError, ForbiddenError, NotFoundError } from '../../../../src/domain/errors';

// 054-team-management, T023 (spec.md User Story 2 / FR-005, FR-008, FR-012,
// contracts/teams-api.md's DELETE /api/teams/:id/members/:userId, cases 1 and 2 only —
// case 3, the owner removing themself, is the separate leaveTeam flow, T024):
//
//   AC3: "Given a team owner viewing the member list, When they remove a member who is
//   not the owner, Then that person no longer appears in the team's member list."
//   AC5: "Given a user who is a team member but not its owner, When they attempt to add
//   or remove another member, Then the system denies the action."
//   AC6: "Given a non-owner member who no longer wants to be part of a team, When they
//   choose to leave the team, Then they are removed from the member list without
//   needing the owner to act." (FR-012)
//
// Signature: removeTeamMember(deps: { teamsPort }, params: { teamId, targetUserId,
// requestedBy }) — mirrors addTeamMember's deps/params shape.
//
// Owner-removes-self handling: per contracts/teams-api.md, `targetUserId === requestedBy
// && requestedBy` is the team's owner is case 3 of the DELETE endpoint — the OWNER
// DEPARTURE path, which triggers ownership transfer / team-emptied logic that belongs to
// leaveTeam (T024), not here. This use-case rejects that combination outright (documented
// error code `owner_must_use_leave_team`, 400) rather than silently doing nothing or
// performing a plain removal — the HTTP route (T032) is expected to route case 3 to
// leaveTeam instead of calling removeTeamMember for it at all, but removeTeamMember must
// not be silently misusable to strand a team without an owner if called that way anyway.
//
// removeTeamMember does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// server/src/application/use-cases/teams/RemoveTeamMember.ts is implemented (T029).
describe('removeTeamMember', () => {
    it('lets the owner remove a different non-owner member (AC3, FR-005)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
            ],
        );

        await removeTeamMember({ teamsPort }, { teamId: 't1', targetUserId: 'member-1', requestedBy: 'owner-1' });

        expect(await teamsPort.getMembership('t1', 'member-1')).toBeNull();
        expect(await teamsPort.getMembership('t1', 'owner-1')).not.toBeNull();
    });

    it('lets a non-owner member remove themself — voluntary leave (AC6, FR-012)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
            ],
        );

        await removeTeamMember({ teamsPort }, { teamId: 't1', targetUserId: 'member-1', requestedBy: 'member-1' });

        expect(await teamsPort.getMembership('t1', 'member-1')).toBeNull();
    });

    it('denies a non-owner attempting to remove someone other than themself (AC5, FR-008)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
                fakeMembership({ id: 'm3', teamId: 't1', userId: 'member-2', role: 'member' }),
            ],
        );

        await expect(
            removeTeamMember({ teamsPort }, { teamId: 't1', targetUserId: 'member-2', requestedBy: 'member-1' }),
        ).rejects.toThrow(ForbiddenError);

        expect(await teamsPort.getMembership('t1', 'member-2')).not.toBeNull();
    });

    it('rejects an owner attempting to remove themself — that path belongs to leaveTeam (T024)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
            ],
        );

        const error: unknown = await removeTeamMember(
            { teamsPort },
            { teamId: 't1', targetUserId: 'owner-1', requestedBy: 'owner-1' },
        ).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe('owner_must_use_leave_team');
        // The owner's membership must be untouched — this use-case must not have
        // performed a partial/incorrect removal before rejecting.
        expect(await teamsPort.getMembership('t1', 'owner-1')).not.toBeNull();
    });

    it('throws a NotFoundError when the target has no membership on the team', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' })],
        );

        await expect(
            removeTeamMember({ teamsPort }, { teamId: 't1', targetUserId: 'never-joined', requestedBy: 'owner-1' }),
        ).rejects.toThrow(NotFoundError);
    });
});
