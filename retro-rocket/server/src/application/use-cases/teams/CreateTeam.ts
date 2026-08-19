import type { TeamsPort } from '../../ports/teams';
import { AppError } from '../../../domain/errors';

export interface CreateTeamParams {
    name: string;
    description?: string;
    createdBy: string;
}

/** POST /api/teams (session-cookie-authenticated). Caller becomes the team's owner (FR-001, FR-002). */
export async function createTeam(
    deps: { teamsPort: TeamsPort },
    params: CreateTeamParams,
): Promise<{ teamId: string }> {
    const name = params.name.trim();
    if (!name) {
        throw new AppError('validation_error', 'name is required', 400);
    }

    return deps.teamsPort.createTeam({
        name,
        description: params.description,
        createdBy: params.createdBy,
    });
}
