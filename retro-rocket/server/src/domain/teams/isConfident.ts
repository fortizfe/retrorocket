import type { SentimentType } from '../../application/ports/sentiment';

// 056-team-metrics-dashboard, T028 (research.md item 5): independent server-side
// duplicate of src/features/boards/sentiment/domain/confidence.ts's isConfident.
// Production code under server/src/domain/ must NEVER import from src/ or use the
// '@/' alias (that alias exists in server/tsconfig.json only for test-file parity
// checks, see server/tsconfig.json's comment) — this file mirrors the frontend
// logic exactly but stays a real, independently-compiled duplicate. Guarded against
// drift by server/test/domain/teams/isConfident.test.ts's parity fixtures, which run
// both this copy and the real frontend original against identical inputs.

export interface SentimentResult {
    sentiment: SentimentType;
    confidence: number;
}

export interface SentimentConfiguration {
    threshold: number;
    thresholds?: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

/**
 * The single confidence rule (F3/F7, FR-003/FR-009), duplicated server-side for the
 * team-mood aggregation (research.md item 5). Per-sentiment thresholds take
 * precedence (neutral is legitimately lower-confidence from these models); when
 * absent, it falls back to the flat `threshold`.
 */
export function isConfident(
    result: SentimentResult | undefined,
    config: SentimentConfiguration
): boolean {
    if (!result) return false;

    const thresholds = config.thresholds;
    if (!thresholds) {
        return result.confidence >= config.threshold;
    }

    switch (result.sentiment) {
        case 'positive':
            return result.confidence >= thresholds.positive;
        case 'negative':
            return result.confidence >= thresholds.negative;
        case 'neutral':
            return result.confidence >= thresholds.neutral;
        default:
            return false;
    }
}
