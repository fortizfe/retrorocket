// 056-team-metrics-dashboard, T007 (spec.md User Story 1 / data-model.md
// "TeamMetricsSummary"): retrospectiveCount is the number of retrospectives the team
// has; averageParticipants is the mean of their participantCount fields, rounded to
// one decimal place for readability (consistent with the existing moodScore precision
// convention) rather than left as a long float or truncated to an integer.
//
// Pure domain helper — no I/O. `participantCounts` is the array of each team
// retrospective's own participantCount field, already fetched by the caller
// (FirestoreTeamMetricsAdapter).
export function computeActivitySummary(participantCounts: number[]): {
    retrospectiveCount: number;
    averageParticipants: number;
} {
    if (participantCounts.length === 0) {
        return { retrospectiveCount: 0, averageParticipants: 0 };
    }

    const total = participantCounts.reduce((sum, count) => sum + count, 0);
    const average = Math.round((total / participantCounts.length) * 10) / 10;

    return { retrospectiveCount: participantCounts.length, averageParticipants: average };
}
