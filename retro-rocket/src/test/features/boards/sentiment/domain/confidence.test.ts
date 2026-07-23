import { describe, it, expect } from 'vitest';
import { isConfident } from '@/features/boards/sentiment/domain/confidence';
import { shouldShowSentimentBadge, DEFAULT_SENTIMENT_CONFIG, type SentimentResult, type SentimentConfiguration } from '@/features/boards/types/sentiment';

function res(sentiment: SentimentResult['sentiment'], confidence: number): SentimentResult {
    return { cardId: 'c', sentiment, confidence, timestamp: new Date() };
}

describe('isConfident', () => {
    it('applies per-sentiment thresholds (pos 0.4 / neg 0.4 / neu 0.25)', () => {
        const cfg = DEFAULT_SENTIMENT_CONFIG;
        expect(isConfident(res('positive', 0.4), cfg)).toBe(true);
        expect(isConfident(res('positive', 0.39), cfg)).toBe(false);
        expect(isConfident(res('negative', 0.4), cfg)).toBe(true);
        expect(isConfident(res('negative', 0.39), cfg)).toBe(false);
        expect(isConfident(res('neutral', 0.25), cfg)).toBe(true);
        expect(isConfident(res('neutral', 0.24), cfg)).toBe(false);
    });

    it('falls back to the flat threshold when thresholds are absent', () => {
        const cfg: SentimentConfiguration = {
            enabled: true, modelId: 'm', threshold: 0.5, batchSize: 5,
        };
        expect(isConfident(res('neutral', 0.5), cfg)).toBe(true);
        expect(isConfident(res('neutral', 0.49), cfg)).toBe(false);
        expect(isConfident(res('positive', 0.6), cfg)).toBe(true);
    });

    it('returns false for a missing result', () => {
        expect(isConfident(undefined, DEFAULT_SENTIMENT_CONFIG)).toBe(false);
    });

    it('guarantees shown-on-board ⇔ counted parity with shouldShowSentimentBadge', () => {
        const cfg = DEFAULT_SENTIMENT_CONFIG;
        for (const s of ['positive', 'negative', 'neutral'] as const) {
            for (const c of [0.1, 0.24, 0.25, 0.39, 0.4, 0.8]) {
                const r = res(s, c);
                expect(shouldShowSentimentBadge(r, cfg)).toBe(isConfident(r, cfg));
            }
        }
    });
});
