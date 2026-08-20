/**
 * Frontend types for the Team Retrospective Metrics Dashboard (spec 056). Mirror the
 * shapes described in specs/056-team-metrics-dashboard/data-model.md and
 * contracts/team-metrics-api.md; dates are parsed from the backend's ISO-8601 strings
 * into `Date` instances, the same way `src/features/teams/types/team.ts` does for team
 * dates — this file plays the same "frontend-facing types" role for the metrics domain
 * that `team.ts` plays for `backendTeamsClient.ts`, keeping the DTO/wire-format shapes in
 * the client file and the consumer-facing shapes here.
 */

/** One point of a team's mood trend over time (data-model.md's `RetrospectiveMoodPoint`).
 * `moodScore` is `null` when that retrospective has no confident sentiment results (FR-009)
 * — render this as an explicit "no data" state, never a default/zero score. */
export interface RetrospectiveMoodPoint {
    retrospectiveId: string;
    retrospectiveTitle: string;
    createdAt: Date;
    moodScore: number | null;
}

/** Aggregated, read-only retrospective metrics for one team (data-model.md's
 * `TeamMetricsSummary`), as returned by `GET /api/teams/:id/metrics`. */
export interface TeamMetricsSummary {
    teamId: string;
    retrospectiveCount: number;
    averageParticipants: number;
    actionItemsCreated: number;
    /** Always pre-sorted ascending by `createdAt` (oldest first) by the backend — the
     * frontend does not re-sort. */
    moodEvolution: RetrospectiveMoodPoint[];
}
