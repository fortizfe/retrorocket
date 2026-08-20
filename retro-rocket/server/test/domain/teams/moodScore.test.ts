import { describe, it, expect } from 'vitest';
import { calculateMoodScore } from '../../../src/domain/teams/moodScore';
// PARITY IMPORT (test-file only — never for production code, see isConfident.test.ts's
// sibling note for the full rationale): the real frontend scoring function, imported by
// relative path so this test can assert the not-yet-existing server duplicate returns
// IDENTICAL output for the same fixtures.
import { calculateMoodScore as frontendCalculateMoodScore } from '../../../../src/features/boards/sentiment/domain/moodScore';
import type { AdjustedDistribution } from '../../../../src/features/boards/sentiment/domain/moodDistribution';

/**
 * calculateMoodScore only ever reads `positive`/`neutral`/`negative` off its argument
 * (verified by reading the source), but `AdjustedDistribution` is a full struct with
 * percentage/confidence/per-column fields this test's fixtures don't need. This helper
 * satisfies the type without a cast — the filler fields are never read by the function
 * under test, only present so the object structurally matches `AdjustedDistribution`.
 */
function toAdjustedDistribution(counts: { positive: number; neutral: number; negative: number }): AdjustedDistribution {
    const total = counts.positive + counts.neutral + counts.negative;
    return {
        ...counts,
        total,
        positivePct: 0,
        neutralPct: 0,
        negativePct: 0,
        averageConfidence: 0,
        perColumn: [],
    };
}

// 056-team-metrics-dashboard, T026 (spec.md User Story 3 / research.md item 5 /
// tasks.md T026):
//
//   "Unit test: server-side calculateMoodScore — parity fixtures asserting identical
//   output to src/features/boards/sentiment/domain/moodScore.ts's calculateMoodScore
//   for the same {positive, neutral, negative} distributions, plus this feature's own
//   'zero confident results → the caller returns null, not a score' contract at the
//   call site — in server/test/domain/teams/moodScore.test.ts."
//
// Per the task's own scope note, the "zero confident results → null" behavior is a
// CALL-SITE concern (FirestoreTeamMetricsAdapter.getTeamMetrics, T030), not something
// this pure scoring function itself does — calculateMoodScore's own empty/zero-total
// behavior is "return the neutral midpoint (5)", tested below, and the adapter layer
// (a separate task) is responsible for deciding to call it at all vs. returning null.
//
// research.md item 5: "isConfident and calculateMoodScore are both tiny,
// dependency-free pure functions (no React, no DOM) — duplicating them server-side is
// a small, easily-tested surface, guarded by parity unit tests asserting identical
// output to the frontend originals for shared fixtures, so drift between the two is
// caught immediately if either formula changes."
//
// Cross-project import note: moodScore.ts's only import is
// `import type { AdjustedDistribution } from
// '@/features/boards/sentiment/domain/moodDistribution'` — a TYPE-ONLY import, always
// fully erased by TypeScript/esbuild regardless of whether the '@' alias is configured
// for the consuming project (it isn't, in server/vitest.config.ts). That erasure is why
// the relative cross-project import above loads fine under Vitest even though the
// frontend and backend are otherwise separate compilation units (research.md item 5's
// "Alternatives considered" explicitly rejects a *production* cross-import for this
// reason — this test-only import sidesteps that concern entirely because nothing here
// is emitted at runtime). `calculateMoodScore` itself only ever reads
// `dist.positive`/`dist.neutral`/`dist.negative` off the `AdjustedDistribution`
// argument (verified by reading the source) — a plain `{ positive, neutral, negative }`
// literal is a valid runtime argument for it even though `AdjustedDistribution` also
// declares other required fields (total, percentages, averageConfidence, perColumn)
// that this test's fixtures deliberately omit.
//
// Signature contract for the not-yet-existing server calculateMoodScore (mirrors the
// frontend's formula exactly, F5/FR-007):
//
//   f     = p·1.0 + u·0.4 + n·0.0     ("mood fraction" in [0,1])
//   score = clamp(1, 10, 1 + 9·f)     (rounded to 1 decimal)
//
//   calculateMoodScore(counts: { positive: number; neutral: number; negative: number }): number
//
// Anchors documented in the frontend source: all-positive → 10.0, all-neutral → ≈4.6,
// all-negative → 1.0; an empty/zero-total distribution returns the neutral midpoint
// (5) rather than the harsh floor.
//
// calculateMoodScore does not exist yet at server/src/domain/teams/moodScore.ts — this
// file is expected to fail with a "Cannot find module '../../../src/domain/teams/moodScore'"
// error until T029 implements it.

describe('calculateMoodScore (server)', () => {
    it('returns 10.0 for an all-positive distribution', () => {
        const counts = { positive: 10, neutral: 0, negative: 0 };

        expect(calculateMoodScore(counts)).toBe(10);
        expect(frontendCalculateMoodScore(toAdjustedDistribution(counts))).toBe(10);
    });

    it('returns the documented ~4.6 anchor for an all-neutral distribution', () => {
        const counts = { positive: 0, neutral: 10, negative: 0 };

        // f = 0.4 → score = 1 + 9*0.4 = 4.6
        expect(calculateMoodScore(counts)).toBe(4.6);
        expect(frontendCalculateMoodScore(toAdjustedDistribution(counts))).toBe(4.6);
    });

    it('returns 1.0 for an all-negative distribution', () => {
        const counts = { positive: 0, neutral: 0, negative: 10 };

        expect(calculateMoodScore(counts)).toBe(1);
        expect(frontendCalculateMoodScore(toAdjustedDistribution(counts))).toBe(1);
    });

    it('returns the neutral midpoint (5) for an empty/zero-total distribution', () => {
        const counts = { positive: 0, neutral: 0, negative: 0 };

        expect(calculateMoodScore(counts)).toBe(5);
        // Not asserted against the frontend original here — the task's scope note
        // treats the zero-confident-results → null decision as a call-site concern,
        // not part of this pure function's parity contract, so this case documents
        // the server duplicate's own zero-total behavior in isolation.
    });

    it('computes a mixed distribution using the documented weighted formula', () => {
        // p=0.5, u=0.3, n=0.2 → f = 0.5*1.0 + 0.3*0.4 + 0.2*0.0 = 0.62
        // score = 1 + 9*0.62 = 6.58 → rounds to 6.6
        const counts = { positive: 5, neutral: 3, negative: 2 };

        expect(calculateMoodScore(counts)).toBe(6.6);
        expect(frontendCalculateMoodScore(toAdjustedDistribution(counts))).toBe(6.6);
    });
});
