import { describe, it, expect } from 'vitest';
import { computeActivitySummary } from '../../../src/domain/teams/activitySummary';

// 056-team-metrics-dashboard, T002 (spec.md User Story 1 / data-model.md
// "TeamMetricsSummary" / tasks.md T007):
//
//   retrospectiveCount: "Count of retrospectives docs with teamId == teamId. 0 for a
//   team with none (FR-010)."
//   averageParticipants: "Mean of participantCount across those retrospectives,
//   computed in-memory (research.md item 3). 0 when retrospectiveCount is 0. Not
//   rounded to an integer — carries one decimal place for readability (e.g. 4.3),
//   consistent with the existing moodScore precision convention."
//
// Signature contract for computeActivitySummary (pure, no I/O — same "small testable
// helper" pattern as domain/teams/selectNextOwner.ts):
//
//   computeActivitySummary(participantCounts: number[]):
//     { retrospectiveCount: number; averageParticipants: number }
//
// `participantCounts` is the array of each team retrospective's own participantCount
// field — the caller (FirestoreTeamMetricsAdapter, T009) has already fetched the
// team's retrospective docs and extracts this array before calling in, so this helper
// stays pure and trivially testable.
//
// computeActivitySummary does not exist yet — this file is expected to fail with a
// "Cannot find module" error until server/src/domain/teams/activitySummary.ts is
// implemented (T007).
describe('computeActivitySummary', () => {
    it('returns zeroed values for a team with no retrospectives (FR-010)', () => {
        const result = computeActivitySummary([]);

        expect(result).toEqual({ retrospectiveCount: 0, averageParticipants: 0 });
    });

    it('counts the retrospectives and averages participantCount across them', () => {
        const result = computeActivitySummary([2, 4, 6]);

        expect(result).toEqual({ retrospectiveCount: 3, averageParticipants: 4 });
    });

    it('rounds a non-integer average to exactly one decimal place', () => {
        const result = computeActivitySummary([2, 3]);

        expect(result).toEqual({ retrospectiveCount: 2, averageParticipants: 2.5 });
    });

    it('rounds a repeating-decimal average to one decimal place rather than truncating or leaving it unrounded', () => {
        const result = computeActivitySummary([1, 2, 4]);

        // (1 + 2 + 4) / 3 = 2.333... → rounds to 2.3, not 2.333333... or 2.
        expect(result).toEqual({ retrospectiveCount: 3, averageParticipants: 2.3 });
    });

    it('handles a single retrospective (average equals its own participantCount)', () => {
        const result = computeActivitySummary([7]);

        expect(result).toEqual({ retrospectiveCount: 1, averageParticipants: 7 });
    });
});
