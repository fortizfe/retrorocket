import type { TeamsPort, TeamSummary } from '../../ports/teams';

/** GET /api/teams (session-cookie-authenticated). */
export async function listTeamsForUser(deps: { teamsPort: TeamsPort }, uid: string): Promise<TeamSummary[]> {
    return deps.teamsPort.listTeamsForUser(uid);
}
