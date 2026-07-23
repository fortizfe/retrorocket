import type { AdjustedDistribution } from '@/features/boards/sentiment/domain/moodDistribution';

/** Neutral contributes a low baseline so a board with no positive signal reads as mild concern. */
const NEUTRAL_WEIGHT = 0.4;

/**
 * Neutral-aware team-mood score in [1, 10] (F5/FR-007), derived from the single
 * column-role-adjusted distribution:
 *
 *   f     = p·1.0 + u·0.4 + n·0.0     ("mood fraction" in [0,1])
 *   score = clamp(1, 10, 1 + 9·f)     (rounded to 1 decimal)
 *
 * Anchors: all-positive → 10.0, all-neutral → ≈4.6 ("Preocupante"), all-negative → 1.0.
 * An empty/no-confident-cards distribution returns the neutral midpoint (5.0) rather
 * than the harsh floor, since the report separately surfaces an insufficient-data insight.
 */
export function calculateMoodScore(dist: AdjustedDistribution): number {
    const total = dist.positive + dist.neutral + dist.negative;
    if (total === 0) return 5;

    const p = dist.positive / total;
    const u = dist.neutral / total;
    const fraction = p + NEUTRAL_WEIGHT * u;

    const raw = 1 + 9 * fraction;
    const clamped = Math.max(1, Math.min(10, raw));
    return Math.round(clamped * 10) / 10;
}
