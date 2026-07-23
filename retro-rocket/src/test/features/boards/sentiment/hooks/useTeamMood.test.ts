import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTeamMood } from '@/features/boards/sentiment/hooks/useTeamMood';
import type { SentimentResult } from '@/features/boards/types/sentiment';
import type { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { makeCard } from '@/test/features/boards/sentiment/fixtures/cards';
import { ALL_NEUTRAL_BOARD, HEAVY_EXPECTED_NEGATIVITY_BOARD } from '@/test/features/boards/sentiment/fixtures/boards';

function col(id: string, role: DynamicColumnConfig['role'], title: string): DynamicColumnConfig {
    return { id, title, description: '', color: '#fff', icon: '📝', role };
}

describe('useTeamMood', () => {
    it('scores an all-neutral board at ≈4.6 (Preocupante band)', () => {
        const { cards, results, columnConfigs } = ALL_NEUTRAL_BOARD;
        const { result } = renderHook(() => useTeamMood({ cards, sentimentResults: results, columnConfigs }));
        expect(result.current.report.moodScore).toBe(4.6);
    });

    it('does not raise a critical alert or depress the score for expected negativity', () => {
        const { cards, results, columnConfigs } = HEAVY_EXPECTED_NEGATIVITY_BOARD;
        const { result } = renderHook(() => useTeamMood({ cards, sentimentResults: results, columnConfigs }));
        expect(result.current.report.metrics.negativePercentage).toBe(0);
        const hasCritical = result.current.report.insights.some(i => i.type === 'critical');
        expect(hasCritical).toBe(false);
        expect(result.current.report.moodScore).toBeGreaterThan(5);
    });

    it('recomputes the report when a column role changes (F6/FR-008)', () => {
        const cards = [
            makeCard({ id: 'a', content: 'a blocker', column: 'custom' }),
            makeCard({ id: 'b', content: 'another blocker', column: 'custom' }),
            makeCard({ id: 'c', content: 'yet another', column: 'custom' }),
        ];
        const results = new Map<string, SentimentResult>(cards.map(c =>
            [c.id, { cardId: c.id, sentiment: 'negative', confidence: 0.9, timestamp: new Date() }]));

        const neutralRole = { custom: col('custom', 'neutral', 'Custom') };
        const negativeRole = { custom: col('custom', 'negative', 'Custom') };

        const { result, rerender } = renderHook(
            ({ columnConfigs }) => useTeamMood({ cards, sentimentResults: results, columnConfigs }),
            { initialProps: { columnConfigs: neutralRole } }
        );
        // neutral role → negatives count as negative
        expect(result.current.report.metrics.negativePercentage).toBe(100);

        rerender({ columnConfigs: negativeRole });
        // negative role → negatives reclassified as expected/neutral
        expect(result.current.report.metrics.negativePercentage).toBe(0);
        expect(result.current.report.metrics.neutralPercentage).toBe(100);
    });

    it('counts only confident cards (F7/FR-009)', () => {
        const cards = [
            makeCard({ id: 'a', content: 'meh one', column: 'improve' }),
            makeCard({ id: 'b', content: 'meh two', column: 'improve' }),
            makeCard({ id: 'c', content: 'great', column: 'went_well' }),
        ];
        const results = new Map<string, SentimentResult>([
            ['a', { cardId: 'a', sentiment: 'positive', confidence: 0.1, timestamp: new Date() }],
            ['b', { cardId: 'b', sentiment: 'positive', confidence: 0.2, timestamp: new Date() }],
            ['c', { cardId: 'c', sentiment: 'positive', confidence: 0.95, timestamp: new Date() }],
        ]);
        const columnConfigs = { improve: col('improve', 'neutral', 'Improve'), went_well: col('went_well', 'positive', 'Went well') };
        const { result } = renderHook(() => useTeamMood({ cards, sentimentResults: results, columnConfigs }));
        expect(result.current.report.metrics.analyzedCards).toBe(1);
    });

    it('surfaces an insufficient-data insight for fewer than 3 analysable cards (FR-010)', () => {
        const cards = [
            makeCard({ id: 'a', content: 'one', column: 'went_well' }),
            makeCard({ id: 'b', content: 'two', column: 'went_well' }),
        ];
        const columnConfigs = { went_well: col('went_well', 'positive', 'Went well') };
        const { result } = renderHook(() => useTeamMood({ cards, sentimentResults: new Map(), columnConfigs }));
        expect(result.current.hasEnoughData).toBe(false);
        expect(result.current.report.insights[0].title)
            .toContain('insufficientData');
    });
});
