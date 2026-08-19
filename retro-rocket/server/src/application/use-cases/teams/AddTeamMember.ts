import type { TeamMemberView, TeamsPort } from '../../ports/teams';
import { AppError, ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface AddTeamMemberParams {
    teamId: string;
    email: string;
    requestedBy: string; // uid
}

/**
 * POST /api/teams/:id/members. Owner looks up an existing RetroRocket user by exact
 * email (case/whitespace-insensitive, research.md item 2) and adds them (FR-003,
 * FR-004). Owner-only (FR-008). "No matching account" is surfaced as a single
 * `user_not_found` AppError (404) — distinct from the port's ConflictError (409) for
 * an already-a-member email, which is left to propagate as-is.
 */
export async function addTeamMember(
    deps: { teamsPort: TeamsPort },
    params: AddTeamMemberParams,
): Promise<TeamMemberView> {
    const detail = await deps.teamsPort.getTeamWithMembers(params.teamId, params.requestedBy);
    if (!detail) {
        throw new NotFoundError('Team not found');
    }

    if (detail.team.ownerId !== params.requestedBy) {
        throw new ForbiddenError('Only the team owner can add members');
    }

    const normalizedEmail = params.email.trim().toLowerCase();
    const found = await deps.teamsPort.findUserByEmail(normalizedEmail);
    if (!found) {
        throw new AppError('user_not_found', 'No matching RetroRocket account was found', 404);
    }

    return deps.teamsPort.addMember(params.teamId, found.uid, 'member');
}
