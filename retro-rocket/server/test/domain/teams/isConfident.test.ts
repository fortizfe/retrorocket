import { describe, it, expect } from 'vitest';
import { isConfident } from '../../../src/domain/teams/isConfident';
// PARITY IMPORT (test-file only — never for production code, see note below): the real
// frontend predicate, imported by relative path so this test can assert the
// not-yet-existing server duplicate returns IDENTICAL output for the same fixtures.
import { isConfident as frontendIsConfident } from '../../../../src/features/boards/sentiment/domain/confidence';
import type { SentimentType } from '../../../src/application/ports/sentiment';

// 056-team-metrics-dashboard, T025 (spec.md User Story 3 / research.md item 5 /
// tasks.md T025):
//
//   "Unit test: server-side `isConfident` predicate — parity fixtures asserting
//   identical output to src/features/boards/sentiment/domain/confidence.ts's
//   isConfident for the same SentimentResult/DEFAULT_SENTIMENT_CONFIG inputs."
//
// research.md item 5 explains WHY a server-side duplicate exists at all instead of the
// server just importing the frontend function directly in production code: frontend
// (tsconfig.json) and backend (server/tsconfig.json) are separate TypeScript
// compilation units with "no existing cross-import precedent anywhere in the
// codebase" — introducing one for a ~15-line pure predicate isn't worth the coupling.
// So server/src/domain/teams/isConfident.ts (T028) will be an independent duplicate of
// the same logic, and the risk that duplication introduces is silent drift between the
// two copies over time. This test's job is to catch that drift: it runs BOTH the
// not-yet-existing server copy AND the real frontend original against the exact same
// fixtures and asserts identical boolean output. The cross-import above is for THIS
// TEST FILE ONLY (a parity guard), never a pattern for production code.
//
// Cross-project import note: confidence.ts's only import is
// `import type { SentimentResult, SentimentConfiguration } from
// '@/features/boards/types/sentiment'` — a TYPE-ONLY import, which TypeScript/esbuild
// always fully erase from the compiled output regardless of whether the '@' path alias
// is configured for the consuming project. Since server/vitest.config.ts has no '@'
// alias (only '@server'), this import would NOT resolve for anything but a type-only
// dependency — which is exactly what it is here, so the relative import above is safe
// to load under Vitest. (See T025 completion notes for how this was verified; a
// `npm run type-check:server` pass, a separate task (T038), may still need a
// server/tsconfig.json adjustment since tsc — unlike Vitest's esbuild transform — does
// try to resolve type-only imports for type-checking purposes.)
//
// Signature contract for the not-yet-existing server isConfident (mirrors the
// frontend's exactly — per-sentiment thresholds take precedence over the flat
// `threshold` fallback, F3/F7 / FR-003/FR-009):
//
//   isConfident(result: SentimentResult | undefined, config: SentimentConfiguration): boolean
//
// where (server-local, minimal — only the fields this predicate actually reads):
//   SentimentResult { sentiment: SentimentType; confidence: number }
//   SentimentConfiguration { threshold: number; thresholds?: { positive: number; negative: number; neutral: number } }
//
// `SentimentType` is reused from server/src/application/ports/sentiment.ts (already the
// identical 'positive' | 'negative' | 'neutral' union) rather than redefined here.
//
// isConfident does not exist yet at server/src/domain/teams/isConfident.ts — this file
// is expected to fail with a "Cannot find module '../../../src/domain/teams/isConfident'"
// error until T028 implements it.

// Mirrors DEFAULT_SENTIMENT_CONFIG's threshold values (src/features/boards/types/sentiment.ts)
// without importing that module directly: that file imports `isConfident` as a real
// VALUE (for `shouldShowSentimentBadge`), a genuine runtime dependency on the '@' path
// alias that only the frontend's own Vite config resolves — unlike confidence.ts's own
// type-only import, this one would NOT be erased and would fail to resolve under the
// server's Vitest config. So this file limits its cross-project import to the two pure
// predicate/score functions themselves and inlines the threshold VALUES here instead.
const GRANULAR_CONFIG = {
    enabled: true,
    modelId: 'test-model',
    batchSize: 5,
    threshold: 0.4,
    thresholds: {
        positive: 0.4,
        negative: 0.4,
        neutral: 0.25,
    },
};

const FLAT_ONLY_CONFIG = {
    enabled: true,
    modelId: 'test-model',
    batchSize: 5,
    threshold: 0.5,
};

function sentimentResult(sentiment: SentimentType, confidence: number) {
    // cardId/timestamp are required by the frontend's real SentimentResult type but
    // unused by the predicate itself — included so the same fixture literal works for
    // both the server's minimal type and the frontend's fuller one in the parity calls.
    return {
        sentiment,
        confidence,
        cardId: 'card-1',
        timestamp: new Date('2026-01-01T00:00:00Z'),
    };
}

describe('isConfident (server)', () => {
    it('returns false for an undefined result', () => {
        expect(isConfident(undefined, GRANULAR_CONFIG)).toBe(false);

        // Parity: the frontend original agrees.
        expect(frontendIsConfident(undefined, GRANULAR_CONFIG)).toBe(false);
    });

    it('returns false when confidence is below the applicable per-sentiment threshold', () => {
        // 'positive' threshold is 0.4; 0.3 falls short.
        const result = sentimentResult('positive', 0.3);

        expect(isConfident(result, GRANULAR_CONFIG)).toBe(false);
        expect(frontendIsConfident(result, GRANULAR_CONFIG)).toBe(false);
    });

    it('returns true when confidence meets or exceeds the applicable per-sentiment threshold', () => {
        // Exactly at the 'positive' threshold (0.4) — >= is inclusive.
        const result = sentimentResult('positive', 0.4);

        expect(isConfident(result, GRANULAR_CONFIG)).toBe(true);
        expect(frontendIsConfident(result, GRANULAR_CONFIG)).toBe(true);
    });

    it('honors per-sentiment thresholds (negative uses config.thresholds.negative, not the flat threshold)', () => {
        // A negative result at 0.35 confidence: below a hypothetical flat 0.4/0.5
        // fallback, but above thresholds.negative (0.4 in GRANULAR_CONFIG is NOT met at
        // 0.35, so use a config whose flat threshold would say "not confident" while
        // thresholds.negative would say "confident") to prove thresholds take
        // precedence over the flat value entirely, in both directions.
        const config = {
            enabled: true,
            modelId: 'test-model',
            batchSize: 5,
            threshold: 0.9, // would reject 0.35 if the flat fallback were (wrongly) used
            thresholds: {
                positive: 0.4,
                negative: 0.3, // 0.35 clears this per-sentiment threshold
                neutral: 0.25,
            },
        };
        const result = sentimentResult('negative', 0.35);

        expect(isConfident(result, config)).toBe(true);
        expect(frontendIsConfident(result, config)).toBe(true);
    });

    it('honors per-sentiment thresholds for neutral (config.thresholds.neutral, not the flat threshold)', () => {
        // Parity gap fix: every other per-sentiment case (positive above via the
        // basic true/false tests, negative via the dedicated test above) already
        // exercises the switch branch with config.thresholds present; 'neutral' was
        // previously only exercised via FLAT_ONLY_CONFIG (config.thresholds absent),
        // leaving the switch's 'neutral' case itself uncovered. thresholds.neutral is
        // 0.25 in GRANULAR_CONFIG — below-and-at-or-above both branches, in parity.
        const belowNeutralThreshold = sentimentResult('neutral', 0.24);
        const atOrAboveNeutralThreshold = sentimentResult('neutral', 0.25);

        expect(isConfident(belowNeutralThreshold, GRANULAR_CONFIG)).toBe(false);
        expect(isConfident(atOrAboveNeutralThreshold, GRANULAR_CONFIG)).toBe(true);

        expect(frontendIsConfident(belowNeutralThreshold, GRANULAR_CONFIG)).toBe(false);
        expect(frontendIsConfident(atOrAboveNeutralThreshold, GRANULAR_CONFIG)).toBe(true);
    });

    it('falls back to the flat config.threshold when config.thresholds is absent', () => {
        const belowFlat = sentimentResult('neutral', 0.4);
        const atOrAboveFlat = sentimentResult('neutral', 0.5);

        expect(isConfident(belowFlat, FLAT_ONLY_CONFIG)).toBe(false);
        expect(isConfident(atOrAboveFlat, FLAT_ONLY_CONFIG)).toBe(true);

        // Parity for both branches of the flat-fallback case.
        expect(frontendIsConfident(belowFlat, FLAT_ONLY_CONFIG)).toBe(false);
        expect(frontendIsConfident(atOrAboveFlat, FLAT_ONLY_CONFIG)).toBe(true);
    });
});
