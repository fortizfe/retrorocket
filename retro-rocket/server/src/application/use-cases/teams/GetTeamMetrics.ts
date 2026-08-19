import type { TeamsPort } from '../../ports/teams';
import type { TeamMetricsPort, TeamMetricsSummary } from '../../ports/teamMetrics';
import { ForbiddenError } from '../../../domain/errors';

export interface GetTeamMetricsParams {
    teamId: string;
    requesterUid: string;
}

/**
 * GET /api/teams/:id/metrics (FR-002/FR-003, contracts/team-metrics-api.md). Any
 * current member (owner or not) can read the team's aggregated retrospective metrics;
 * a non-member is denied even if the team exists. Mirrors getTeamWithMembers's
 * membership-gate shape, but the aggregation itself lives behind TeamMetricsPort
 * rather than TeamsPort.
 */
export async function getTeamMetrics(
    deps: { teamsPort: Pick<TeamsPort, 'getMembership'>; teamMetricsPort: TeamMetricsPort },
    params: GetTeamMetricsParams,
): Promise<TeamMetricsSummary> {
    const membership = await deps.teamsPort.getMembership(params.teamId, params.requesterUid);
    if (!membership) {
        throw new ForbiddenError('Not a member of this team');
    }

    return deps.teamMetricsPort.getTeamMetrics(params.teamId);
}
