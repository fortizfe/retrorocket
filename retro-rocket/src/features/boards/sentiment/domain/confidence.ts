import type { SentimentResult, SentimentConfiguration } from '@/features/boards/types/sentiment';

/**
 * The single confidence rule (F3/F7, FR-003/FR-009). Used everywhere a sentiment
 * state is shown or counted — card badges, sentiment counts, the filter, and the
 * team-mood aggregation — so "visible on the board" ⇔ "counted in the report".
 *
 * Per-sentiment thresholds take precedence (neutral is legitimately lower-confidence
 * from these models); when absent, it falls back to the flat `threshold`.
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
