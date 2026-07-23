import type { Card } from '@/features/boards/types/card';
import type { SentimentResult } from '@/features/boards/types/sentiment';
import type { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { makeCard } from '@/test/features/boards/sentiment/fixtures/cards';

export interface BenchmarkBoard {
    name: string;
    cards: Card[];
    results: Map<string, SentimentResult>;
    columnConfigs: Record<string, DynamicColumnConfig>;
}

function col(id: string, role: DynamicColumnConfig['role'], title: string): DynamicColumnConfig {
    return { id, title, description: '', color: '#fff', icon: '📝', role };
}

const COLUMN_CONFIGS: Record<string, DynamicColumnConfig> = {
    went_well: col('went_well', 'positive', 'What went well'),
    not_went_well: col('not_went_well', 'negative', 'What did not go well'),
    improve: col('improve', 'neutral', 'To improve'),
    actions: col('actions', 'action', 'Action items'),
};

function result(cardId: string, sentiment: SentimentResult['sentiment'], confidence = 0.9): SentimentResult {
    return {
        cardId,
        sentiment,
        confidence,
        timestamp: new Date('2026-01-01'),
        modelId: 'test-model',
        modelVersion: 'hf-transformers-3',
        contentHash: 'hash',
    };
}

function board(
    name: string,
    spec: { column: string; sentiment: SentimentResult['sentiment']; confidence?: number }[]
): BenchmarkBoard {
    const cards: Card[] = [];
    const results = new Map<string, SentimentResult>();
    spec.forEach((s, i) => {
        const card = makeCard({ id: `${name}-${i}`, content: `card ${i} content`, column: s.column });
        cards.push(card);
        results.set(card.id, result(card.id, s.sentiment, s.confidence));
    });
    return { name, cards, results, columnConfigs: COLUMN_CONFIGS };
}

/** Every analysable card is neutral ⇒ score ≈ 4.6 "Preocupante". */
export const ALL_NEUTRAL_BOARD = board('all-neutral', [
    { column: 'went_well', sentiment: 'neutral' },
    { column: 'improve', sentiment: 'neutral' },
    { column: 'not_went_well', sentiment: 'neutral' },
    { column: 'improve', sentiment: 'neutral' },
]);

/** Mostly positive ⇒ high score, no critical alert. */
export const MOSTLY_POSITIVE_BOARD = board('mostly-positive', [
    { column: 'went_well', sentiment: 'positive' },
    { column: 'went_well', sentiment: 'positive' },
    { column: 'went_well', sentiment: 'positive' },
    { column: 'improve', sentiment: 'neutral' },
    { column: 'not_went_well', sentiment: 'negative' },
]);

/** Heavy negativity concentrated in a negative-role column ⇒ expected, no false alarm. */
export const HEAVY_EXPECTED_NEGATIVITY_BOARD = board('heavy-expected-negativity', [
    { column: 'not_went_well', sentiment: 'negative' },
    { column: 'not_went_well', sentiment: 'negative' },
    { column: 'not_went_well', sentiment: 'negative' },
    { column: 'went_well', sentiment: 'positive' },
    { column: 'went_well', sentiment: 'positive' },
]);

/** Balanced positive/negative in non-negative-role columns. */
export const BALANCED_BOARD = board('balanced', [
    { column: 'went_well', sentiment: 'positive' },
    { column: 'went_well', sentiment: 'positive' },
    { column: 'improve', sentiment: 'negative' },
    { column: 'improve', sentiment: 'negative' },
]);

export const BENCHMARK_BOARDS: BenchmarkBoard[] = [
    ALL_NEUTRAL_BOARD,
    MOSTLY_POSITIVE_BOARD,
    HEAVY_EXPECTED_NEGATIVITY_BOARD,
    BALANCED_BOARD,
];
