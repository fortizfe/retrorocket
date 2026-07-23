import type { Card } from '@/features/boards/types/card';
import type { SentimentResult, SentimentConfiguration } from '@/features/boards/types/sentiment';
import type { ColumnMoodMetrics } from '@/features/boards/types/teamMood';
import { isConfident } from '@/features/boards/sentiment/domain/confidence';
import {
    getColumnRole,
    type ColumnRole,
    type DynamicColumnConfig,
} from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';

/**
 * One column-role-adjusted sentiment distribution (F4/FR-006). The score,
 * percentages, AND insight/alert thresholds are all derived from this single
 * object, so they can never contradict each other. Negative cards sitting in a
 * `negative`-role column (e.g. "what hindered") are *expected* and reclassified
 * once here as neutral, rather than counted as team negativity.
 */
export interface AdjustedDistribution {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    averageConfidence: number;
    perColumn: ColumnMoodMetrics[];
}

function roleFor(
    columnId: string,
    columnConfigs: Record<string, DynamicColumnConfig>
): ColumnRole {
    return columnConfigs[columnId]?.role ?? getColumnRole(columnId);
}

/** Negative sentiment expected in a negative-role column is reclassified as neutral. */
function adjustedSentiment(
    sentiment: SentimentResult['sentiment'],
    role: ColumnRole
): 'positive' | 'neutral' | 'negative' {
    if (sentiment === 'negative' && role === 'negative') return 'neutral';
    return sentiment;
}

function pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function computeMoodDistribution(
    cards: Card[],
    results: ReadonlyMap<string, SentimentResult>,
    columnConfigs: Record<string, DynamicColumnConfig>,
    config: SentimentConfiguration
): AdjustedDistribution {
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    const confidences: number[] = [];

    const columnAcc = new Map<string, {
        columnTitle: string;
        total: number;
        positive: number;
        neutral: number;
        negative: number;
        confidences: number[];
    }>();

    for (const card of cards) {
        const role = roleFor(card.column, columnConfigs);
        // Action columns are excluded from analysis and from the report entirely.
        if (role === 'action') continue;

        const result = results.get(card.id);
        if (!result || !isConfident(result, config)) continue;

        const adjusted = adjustedSentiment(result.sentiment, role);

        let col = columnAcc.get(card.column);
        if (!col) {
            col = {
                columnTitle: columnConfigs[card.column]?.title ?? card.column,
                total: 0,
                positive: 0,
                neutral: 0,
                negative: 0,
                confidences: [],
            };
            columnAcc.set(card.column, col);
        }

        col.total++;
        col[adjusted]++;
        col.confidences.push(result.confidence);

        if (adjusted === 'positive') positive++;
        else if (adjusted === 'neutral') neutral++;
        else negative++;
        confidences.push(result.confidence);
    }

    const total = positive + neutral + negative;
    const averageConfidence = confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        : 0;

    const perColumn: ColumnMoodMetrics[] = Array.from(columnAcc.entries())
        .map(([column, acc]) => ({
            column,
            columnTitle: acc.columnTitle,
            total: acc.total,
            positive: acc.positive,
            negative: acc.negative,
            neutral: acc.neutral,
            positivePercentage: pct(acc.positive, acc.total),
            negativePercentage: pct(acc.negative, acc.total),
            neutralPercentage: pct(acc.neutral, acc.total),
            averageConfidence: acc.confidences.length > 0
                ? acc.confidences.reduce((sum, c) => sum + c, 0) / acc.confidences.length
                : 0,
        }))
        .sort((a, b) => b.total - a.total);

    return {
        positive,
        neutral,
        negative,
        total,
        positivePct: pct(positive, total),
        neutralPct: pct(neutral, total),
        negativePct: pct(negative, total),
        averageConfidence,
        perColumn,
    };
}
