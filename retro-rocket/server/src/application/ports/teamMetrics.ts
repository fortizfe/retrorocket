// ---------------------------------------------------------------------------
// TeamMetricsPort — read-only Firestore access for the Team Retrospective
// Metrics Dashboard (056). Deliberately separate from TeamsPort (owns
// `teams`/`teamMemberships` invariants, not board/action-item/sentiment
// data), BoardsPort (scoped to "my boards" — a single uid's created/joined
// boards, not "every retrospective a team owns"), ActionItemPort and
// SentimentResultPort (both scoped per-retrospective, not per-team). None of
// those existing ports naturally owns a read spanning `retrospectives` +
// `actionItems` + `sentimentResults` by teamId — a small dedicated port
// keeps each existing interface's responsibility exactly as-is (Interface
// Segregation) and gives this capability one clear, testable home
// (research.md item 1).
// ---------------------------------------------------------------------------

export interface RetrospectiveMoodPoint {
    retrospectiveId: string;
    retrospectiveTitle: string;
    createdAt: Date;
    /** 1-10, one decimal place. null means zero confident sentiment results — an explicit "no data" state, never a default score (FR-009). */
    moodScore: number | null;
}

export interface TeamMetricsSummary {
    teamId: string;
    /** Count of retrospectives with teamId == teamId. 0 for a team with none (FR-010). */
    retrospectiveCount: number;
    /** Mean of participantCount across those retrospectives, one decimal place. 0 when retrospectiveCount is 0. */
    averageParticipants: number;
    /** Created-count only, summed across the team's retrospectives — no completed/pending breakdown (no such field exists yet). */
    actionItemsCreated: number;
    /** Ascending by createdAt. Empty array when retrospectiveCount is 0. */
    moodEvolution: RetrospectiveMoodPoint[];
}

export interface TeamMetricsPort {
    /** Aggregates across retrospectives/actionItems/sentimentResults for teamId. Does not itself enforce membership — the calling use-case checks TeamsPort.getMembership first (research.md item 2). */
    getTeamMetrics(teamId: string): Promise<TeamMetricsSummary>;
}
