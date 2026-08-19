import type { TeamMemberView, TeamRecord, TeamsPort } from '../../ports/teams';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface GetTeamWithMembersParams {
    teamId: string;
    requesterUid: string;
}

export interface GetTeamWithMembersResult {
    team: TeamRecord;
    members: TeamMemberView[];
}

/**
 * GET /api/teams/:id (FR-009). Any current member (owner or not) can read the team
 * detail and full roster; a non-member is denied even if the team exists.
 */
export async function getTeamWithMembers(
    deps: { teamsPort: TeamsPort },
    params: GetTeamWithMembersParams,
): Promise<GetTeamWithMembersResult> {
    const detail = await deps.teamsPort.getTeamWithMembers(params.teamId, params.requesterUid);
    if (!detail) {
        throw new NotFoundError('Team not found');
    }

    const isMember = detail.members.some((member) => member.userId === params.requesterUid);
    if (!isMember) {
        throw new ForbiddenError('Not a member of this team');
    }

    return detail;
}
