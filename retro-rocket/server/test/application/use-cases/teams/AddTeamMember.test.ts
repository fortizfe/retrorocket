import { describe, it, expect, vi } from 'vitest';
import { addTeamMember } from '../../../../src/application/use-cases/teams/AddTeamMember';
import { inMemoryTeamsPort, fakeTeam, fakeMembership, fakeProfile } from './teamsFakes';
import { AppError, ForbiddenError, ConflictError } from '../../../../src/domain/errors';

// 054-team-management, T022 (spec.md User Story 2 / FR-003, FR-004, FR-006, FR-007,
// FR-008, contracts/teams-api.md's POST /api/teams/:id/members):
//
//   AC1: "Given a team owner on the team's screen, When they enter the exact email
//   address of an existing RetroRocket user and select 'add,' Then that user is added
//   to the team and appears in the member list."
//   AC2: "...When they enter an email address that matches no existing RetroRocket
//   account, Then the system indicates no matching user was found and does not add
//   anyone."
//   AC4: "Given a team owner attempting to add a user who is already a member, When
//   they select that user again, Then the system prevents a duplicate membership and
//   indicates the user is already on the team."
//   AC5: "Given a user who is a team member but not its owner, When they attempt to
//   add or remove another member, Then the system denies the action."
//
// Signature: addTeamMember(deps: { teamsPort }, params: { teamId, email, requestedBy })
// — mirrors createTeam/listTeamsForUser's `deps` + `params` shape already established
// in CreateTeam.ts/ListTeamsForUser.ts.
//
// Per contracts/teams-api.md, "no matching user was found" is surfaced as a single
// `user_not_found` AppError code (404) — distinct from the port's own ConflictError
// (409) for the already-a-member case, which addMember already raises and this
// use-case is expected to simply let propagate.
//
// addTeamMember does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// server/src/application/use-cases/teams/AddTeamMember.ts is implemented (T028).
describe('addTeamMember', () => {
    it('denies a non-owner member with a 403 ForbiddenError and does not add anyone (AC5, FR-008)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
            ],
            [fakeProfile({ uid: 'new-user', email: 'new@example.com' })],
        );
        const addMemberSpy = vi.spyOn(teamsPort, 'addMember');

        await expect(
            addTeamMember({ teamsPort }, { teamId: 't1', email: 'new@example.com', requestedBy: 'member-1' }),
        ).rejects.toThrow(ForbiddenError);
        expect(addMemberSpy).not.toHaveBeenCalled();
    });

    it('denies a caller with no membership on the team at all (not just a non-owner member)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' })],
            [fakeProfile({ uid: 'new-user', email: 'new@example.com' })],
        );

        await expect(
            addTeamMember({ teamsPort }, { teamId: 't1', email: 'new@example.com', requestedBy: 'stranger' }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('throws a user_not_found AppError when the email matches no existing account, and adds no one (AC2, FR-006)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' })],
            [], // no profiles at all — email lookup must miss
        );

        const error: unknown = await addTeamMember(
            { teamsPort },
            { teamId: 't1', email: 'ghost@example.com', requestedBy: 'owner-1' },
        ).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe('user_not_found');
        expect((error as AppError).httpStatus).toBe(404);

        const detail = await teamsPort.getTeamWithMembers('t1', 'owner-1');
        expect(detail?.members).toHaveLength(1); // still just the owner
    });

    it('throws a 409 ConflictError when the found user is already a member (AC4, FR-007)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'existing-member', role: 'member' }),
            ],
            [fakeProfile({ uid: 'existing-member', email: 'existing@example.com' })],
        );

        await expect(
            addTeamMember({ teamsPort }, { teamId: 't1', email: 'existing@example.com', requestedBy: 'owner-1' }),
        ).rejects.toThrow(ConflictError);

        const detail = await teamsPort.getTeamWithMembers('t1', 'owner-1');
        expect(detail?.members).toHaveLength(2); // no duplicate row was created
    });

    it('adds a found, not-yet-member user and returns the new TeamMemberView (AC1, FR-003, FR-004)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' })],
            [fakeProfile({ uid: 'new-user', email: 'new@example.com', displayName: 'New User' })],
        );

        const result = await addTeamMember(
            { teamsPort },
            { teamId: 't1', email: 'new@example.com', requestedBy: 'owner-1' },
        );

        expect(result).toMatchObject({
            userId: 'new-user',
            displayName: 'New User',
            email: 'new@example.com',
            role: 'member',
        });

        const detail = await teamsPort.getTeamWithMembers('t1', 'owner-1');
        expect(detail?.members.map((m) => m.userId)).toEqual(expect.arrayContaining(['owner-1', 'new-user']));
    });

    it('matches the account regardless of email capitalization or surrounding whitespace (edge case, research.md item 2)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' })],
            [fakeProfile({ uid: 'new-user', email: 'new@example.com' })],
        );

        const result = await addTeamMember(
            { teamsPort },
            { teamId: 't1', email: '  New@Example.com  ', requestedBy: 'owner-1' },
        );

        expect(result.userId).toBe('new-user');
    });
});
