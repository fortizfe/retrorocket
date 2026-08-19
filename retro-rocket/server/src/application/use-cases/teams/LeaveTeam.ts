import type { TeamMembershipRecord, TeamsPort } from '../../ports/teams';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { selectNextOwner } from '../../../domain/teams/selectNextOwner';

export interface LeaveTeamParams {
    teamId: string;
    uid: string;
}

export interface LeaveTeamResult {
    teamEmptied: boolean;
    newOwnerId: string | null;
}

/**
 * DELETE /api/teams/:id/members/:userId, case 3 — the owner departure path (FR-013,
 * FR-014, FR-015). Owner-only; a non-owner's voluntary leave goes through
 * removeTeamMember instead.
 *
 * - Other members remain: ownership transfers to the earliest-joined remaining member
 *   (selectNextOwner) and the former owner's membership is removed by
 *   `transferOwnership`.
 * - Owner is the sole remaining member: only their membership is removed; the team
 *   document itself is NOT deleted (FR-015) — it persists inertly, ownerless.
 */
export async function leaveTeam(
    deps: { teamsPort: TeamsPort },
    params: LeaveTeamParams,
): Promise<LeaveTeamResult> {
    const { teamId, uid } = params;

    const requesterMembership = await deps.teamsPort.getMembership(teamId, uid);
    if (!requesterMembership || requesterMembership.role !== 'owner') {
        throw new ForbiddenError('Only the team owner can use the leave-team flow');
    }

    const detail = await deps.teamsPort.getTeamWithMembers(teamId, uid);
    if (!detail) {
        throw new NotFoundError('Team not found');
    }

    const memberRecords: TeamMembershipRecord[] = detail.members.map((member) => ({
        id: `${teamId}:${member.userId}`,
        teamId,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
    }));

    const others = memberRecords.filter((member) => member.userId !== uid);

    if (others.length === 0) {
        await deps.teamsPort.removeMembership(teamId, uid);
        return { teamEmptied: true, newOwnerId: null };
    }

    const nextOwner = selectNextOwner(memberRecords, uid);
    await deps.teamsPort.transferOwnership(teamId, uid, nextOwner.userId);
    return { teamEmptied: false, newOwnerId: nextOwner.userId };
}
