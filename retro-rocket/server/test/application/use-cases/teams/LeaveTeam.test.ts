import { describe, it, expect } from 'vitest';
import { leaveTeam } from '../../../../src/application/use-cases/teams/LeaveTeam';
import { inMemoryTeamsPort, fakeTeam, fakeMembership } from './teamsFakes';
import { ForbiddenError } from '../../../../src/domain/errors';

// 054-team-management, T024 (spec.md User Story 2 / FR-013, FR-014, FR-015,
// data-model.md "State transitions", research.md item 4, contracts/teams-api.md's
// DELETE /api/teams/:id/members/:userId case 3):
//
//   AC7: "Given a team owner who chooses to leave a team that still has other members,
//   When they leave, Then ownership automatically transfers to the longest-standing
//   remaining member and the former owner is no longer part of the team."
//   Edge case: "When the owner is the sole remaining member and leaves, the team ends
//   up with zero members and no owner; it is not deleted (FR-015) and simply persists
//   inertly."
//
// Signature: leaveTeam(deps: { teamsPort }, params: { teamId, uid }) — the OWNER-
// departure path specifically. A non-owner voluntarily leaving goes through
// removeTeamMember (T023/T029) instead; this use-case is owner-only and rejects any
// other caller.
//
// Result shape: { teamEmptied: boolean; newOwnerId: string | null } — mirrors
// contracts/teams-api.md's 204-vs-`200 {teamEmptied: true}` distinction at the
// use-case level (the HTTP route, T032, maps this to the actual status codes).
//
// leaveTeam does not exist yet — this file is expected to fail with a "Cannot find
// module" error until server/src/application/use-cases/teams/LeaveTeam.ts is
// implemented (T030).
describe('leaveTeam', () => {
    it('rejects a non-owner caller — voluntary leave for a non-owner goes through removeTeamMember instead', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'member-1', role: 'member' }),
            ],
        );

        await expect(leaveTeam({ teamsPort }, { teamId: 't1', uid: 'member-1' })).rejects.toThrow(ForbiddenError);

        // Untouched — the rejected call must not have removed anyone.
        expect(await teamsPort.getMembership('t1', 'member-1')).not.toBeNull();
    });

    it('transfers ownership to the earliest-joined remaining member when others remain (AC7, FR-013)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner', joinedAt: new Date('2025-01-01T00:00:00Z') }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'later-member', role: 'member', joinedAt: new Date('2026-03-01T00:00:00Z') }),
                fakeMembership({ id: 'm3', teamId: 't1', userId: 'earliest-member', role: 'member', joinedAt: new Date('2026-01-01T00:00:00Z') }),
            ],
        );

        const result = await leaveTeam({ teamsPort }, { teamId: 't1', uid: 'owner-1' });

        expect(result).toEqual({ teamEmptied: false, newOwnerId: 'earliest-member' });

        // Former owner is gone entirely.
        expect(await teamsPort.getMembership('t1', 'owner-1')).toBeNull();
        // New owner's membership is promoted.
        const newOwnerMembership = await teamsPort.getMembership('t1', 'earliest-member');
        expect(newOwnerMembership?.role).toBe('owner');
        // Other members untouched.
        const laterMembership = await teamsPort.getMembership('t1', 'later-member');
        expect(laterMembership?.role).toBe('member');

        const detail = await teamsPort.getTeamWithMembers('t1', 'earliest-member');
        expect(detail?.team.ownerId).toBe('earliest-member');
        expect(detail?.members).toHaveLength(2);
    });

    it('empties the team when the owner is the sole remaining member, without deleting the team doc (FR-014, FR-015)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', name: 'Solo Team', ownerId: 'owner-1', createdBy: 'owner-1' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner-1', role: 'owner' })],
        );

        const result = await leaveTeam({ teamsPort }, { teamId: 't1', uid: 'owner-1' });

        expect(result).toEqual({ teamEmptied: true, newOwnerId: null });

        expect(await teamsPort.getMembership('t1', 'owner-1')).toBeNull();

        // The team document itself persists (FR-015) — not deleted, just ownerless.
        const detail = await teamsPort.getTeamWithMembers('t1', 'owner-1');
        expect(detail).not.toBeNull();
        expect(detail?.team.name).toBe('Solo Team');
        expect(detail?.members).toHaveLength(0);
    });
});
