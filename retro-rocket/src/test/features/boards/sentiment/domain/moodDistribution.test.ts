import { describe, it, expect } from 'vitest';
import { computeMoodDistribution } from '@/features/boards/sentiment/domain/moodDistribution';
import { calculateMoodScore } from '@/features/boards/sentiment/domain/moodScore';
import { DEFAULT_SENTIMENT_CONFIG, type SentimentResult } from '@/features/boards/types/sentiment';
import type { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { makeCard } from '@/test/features/boards/sentiment/fixtures/cards';
import { HEAVY_EXPECTED_NEGATIVITY_BOARD } from '@/test/features/boards/sentiment/fixtures/boards';

function cfgFor(role: DynamicColumnConfig['role'], id: string): DynamicColumnConfig {
    return { id, title: id, description: '', color: '#fff', icon: '📝', role };
}

const COLS: Record<string, DynamicColumnConfig> = {
    went_well: cfgFor('positive', 'went_well'),
    not_went_well: cfgFor('negative', 'not_went_well'),
    improve: cfgFor('neutral', 'improve'),
    actions: cfgFor('action', 'actions'),
};

function result(cardId: string, sentiment: SentimentResult['sentiment'], confidence = 0.9): SentimentResult {
    return { cardId, sentiment, confidence, timestamp: new Date() };
}

describe('computeMoodDistribution', () => {
    it('reclassifies negative cards in a negative-role column as expected (neutral)', () => {
        const cards = [
            makeCard({ id: 'a', content: 'blocker', column: 'not_went_well' }),
            makeCard({ id: 'b', content: 'blocker', column: 'not_went_well' }),
        ];
        const results = new Map([
            ['a', result('a', 'negative')],
            ['b', result('b', 'negative')],
        ]);
        const dist = computeMoodDistribution(cards, results, COLS, DEFAULT_SENTIMENT_CONFIG);
        expect(dist.negative).toBe(0);
        expect(dist.neutral).toBe(2);
        expect(dist.negativePct).toBe(0);
    });

    it('counts negative cards in a non-negative-role column as negative', () => {
        const cards = [makeCard({ id: 'a', content: 'bug', column: 'improve' })];
        const results = new Map([['a', result('a', 'negative')]]);
        const dist = computeMoodDistribution(cards, results, COLS, DEFAULT_SENTIMENT_CONFIG);
        expect(dist.negative).toBe(1);
        expect(dist.neutral).toBe(0);
    });

    it('feeds score, percentages, and alert inputs from the SAME adjusted counts', () => {
        const { cards, results, columnConfigs } = HEAVY_EXPECTED_NEGATIVITY_BOARD;
        const dist = computeMoodDistribution(cards, results, columnConfigs, DEFAULT_SENTIMENT_CONFIG);
        // 3 expected-negatives reclassified to neutral, 2 positives → no team negativity
        expect(dist.negativePct).toBe(0);
        // score is not depressed by expected negativity, and no critical (>=40%) alert can fire
        expect(dist.negativePct).toBeLessThan(40);
        expect(calculateMoodScore(dist)).toBeGreaterThan(5);
    });

    it('excludes action-role columns entirely', () => {
        const cards = [
            makeCard({ id: 'a', content: 'do the thing', column: 'actions' }),
            makeCard({ id: 'b', content: 'went great', column: 'went_well' }),
        ];
        const results = new Map([
            ['a', result('a', 'negative')],
            ['b', result('b', 'positive')],
        ]);
        const dist = computeMoodDistribution(cards, results, COLS, DEFAULT_SENTIMENT_CONFIG);
        expect(dist.total).toBe(1);
        expect(dist.perColumn.some(c => c.column === 'actions')).toBe(false);
    });

    it('only counts cards passing the confidence rule', () => {
        const cards = [
            makeCard({ id: 'a', content: 'meh', column: 'improve' }),
            makeCard({ id: 'b', content: 'yay', column: 'went_well' }),
        ];
        const results = new Map([
            ['a', result('a', 'positive', 0.1)], // below positive threshold 0.4
            ['b', result('b', 'positive', 0.9)],
        ]);
        const dist = computeMoodDistribution(cards, results, COLS, DEFAULT_SENTIMENT_CONFIG);
        expect(dist.total).toBe(1);
        expect(dist.positive).toBe(1);
    });

    it('counts an overridden card at its override value (FR-012)', () => {
        const cards = [makeCard({ id: 'a', content: 'blocker', column: 'not_went_well' })];
        const override: SentimentResult = {
            cardId: 'a', sentiment: 'positive', confidence: 1, timestamp: new Date(), isOverride: true,
        };
        const dist = computeMoodDistribution(cards, new Map([['a', override]]), COLS, DEFAULT_SENTIMENT_CONFIG);
        // override sentiment (positive) is what's counted, not reclassified by the negative role
        expect(dist.positive).toBe(1);
        expect(dist.neutral).toBe(0);
        expect(dist.negative).toBe(0);
    });
});
