// 056-team-metrics-dashboard, T029 (research.md item 5): independent server-side
// duplicate of src/features/boards/sentiment/domain/moodScore.ts's
// calculateMoodScore. Production code under server/src/domain/ must NEVER import
// from src/ or use the '@/' alias — this mirrors the frontend formula exactly but
// stays a real, independently-compiled duplicate, guarded against drift by
// server/test/domain/teams/moodScore.test.ts's parity fixtures.

/** Neutral contributes a low baseline so a board with no positive signal reads as mild concern. */
const NEUTRAL_WEIGHT = 0.4;

/**
 * Neutral-aware team-mood score in [1, 10] (F5/FR-007), derived from confident
 * sentiment counts:
 *
 *   f     = p·1.0 + u·0.4 + n·0.0     ("mood fraction" in [0,1])
 *   score = clamp(1, 10, 1 + 9·f)     (rounded to 1 decimal)
 *
 * Anchors: all-positive → 10.0, all-neutral → ≈4.6, all-negative → 1.0. An
 * empty/zero-total distribution returns the neutral midpoint (5.0) rather than the
 * harsh floor.
 */
export function calculateMoodScore(counts: { positive: number; neutral: number; negative: number }): number {
    const total = counts.positive + counts.neutral + counts.negative;
    if (total === 0) return 5;

    const p = counts.positive / total;
    const u = counts.neutral / total;
    const fraction = p + NEUTRAL_WEIGHT * u;

    const raw = 1 + 9 * fraction;
    const clamped = Math.max(1, Math.min(10, raw));
    return Math.round(clamped * 10) / 10;
}
