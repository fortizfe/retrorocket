import { describe, it, expect } from 'vitest';
import { calculateMoodScore } from '@/features/boards/sentiment/domain/moodScore';
import type { AdjustedDistribution } from '@/features/boards/sentiment/domain/moodDistribution';

function dist(positive: number, neutral: number, negative: number): AdjustedDistribution {
    const total = positive + neutral + negative;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return {
        positive, neutral, negative, total,
        positivePct: pct(positive), neutralPct: pct(neutral), negativePct: pct(negative),
        averageConfidence: 0.9,
        perColumn: [],
    };
}

describe('calculateMoodScore', () => {
    it('matches the anchor table', () => {
        expect(calculateMoodScore(dist(1, 0, 0))).toBe(10);   // all positive
        expect(calculateMoodScore(dist(0, 1, 0))).toBe(4.6);  // all neutral → "Preocupante"
        expect(calculateMoodScore(dist(0, 0, 1))).toBe(1);    // all negative
        expect(calculateMoodScore(dist(1, 0, 1))).toBe(5.5);  // balanced pos/neg
        expect(calculateMoodScore(dist(1, 1, 1))).toBe(5.2);  // mixed thirds
    });

    it('keeps an all-neutral board inside the "Preocupante" band (>= 4.5, < 5.5)', () => {
        const score = calculateMoodScore(dist(0, 8, 0));
        expect(score).toBeGreaterThanOrEqual(4.5);
        expect(score).toBeLessThan(5.5);
    });

    it('is monotonic: more positives never lowers the score', () => {
        let prev = -Infinity;
        for (let p = 0; p <= 10; p++) {
            const score = calculateMoodScore(dist(p, 0, 10 - p));
            expect(score).toBeGreaterThanOrEqual(prev);
            prev = score;
        }
    });

    it('clamps into [1, 10] and rounds to one decimal', () => {
        const score = calculateMoodScore(dist(3, 5, 2));
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(10);
        expect(Math.round(score * 10)).toBe(score * 10);
    });

    it('returns the neutral midpoint for an empty distribution', () => {
        expect(calculateMoodScore(dist(0, 0, 0))).toBe(5);
    });
});
