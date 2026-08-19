import type { TeamsPort } from '../../ports/teams';
import { AppError, ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface RemoveTeamMemberParams {
    teamId: string;
    targetUserId: string;
    requestedBy: string; // uid
}

/**
 * DELETE /api/teams/:id/members/:userId, cases 1 and 2 (case 3 — the owner removing
 * themself — belongs to leaveTeam; this use-case rejects that combination outright with
 * a documented `owner_must_use_leave_team` AppError, 400, rather than performing a
 * plain removal that would strand the team without an owner).
 *
 * - Owner removes a different, non-owner member (FR-005) — allowed.
 * - A non-owner member removes themself (FR-012, voluntary leave) — allowed.
 * - A non-owner attempting to remove someone other than themself (FR-008) — denied.
 */
export async function removeTeamMember(
    deps: { teamsPort: TeamsPort },
    params: RemoveTeamMemberParams,
): Promise<void> {
    const { teamId, targetUserId, requestedBy } = params;

    const requesterMembership = await deps.teamsPort.getMembership(teamId, requestedBy);
    if (!requesterMembership) {
        throw new ForbiddenError('Not allowed to remove members from this team');
    }
    const requesterIsOwner = requesterMembership.role === 'owner';

    if (targetUserId === requestedBy) {
        if (requesterIsOwner) {
            throw new AppError(
                'owner_must_use_leave_team',
                'The team owner must leave via the leave-team flow',
                400,
            );
        }
        // Non-owner removing themself — voluntary leave, allowed below.
    } else if (!requesterIsOwner) {
        throw new ForbiddenError('Only the team owner can remove other members');
    }

    const targetMembership = await deps.teamsPort.getMembership(teamId, targetUserId);
    if (!targetMembership) {
        throw new NotFoundError('Membership not found');
    }

    await deps.teamsPort.removeMembership(teamId, targetUserId);
}
