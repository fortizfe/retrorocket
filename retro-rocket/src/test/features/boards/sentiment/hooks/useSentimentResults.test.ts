import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const saveResultWithHash = vi.fn(() => Promise.resolve());
const saveOverride = vi.fn(() => Promise.resolve());

let mockSnapshot: { sentiment: unknown[] } | null = null;

vi.mock('@/features/boards/retrospective/contexts/BoardEventsProvider', () => ({
    useBoardEventsContext: () => ({ snapshot: mockSnapshot, connectionState: 'connected' }),
}));

vi.mock('@/features/boards/sentiment/services/sentimentResultsApiClient', () => ({
    saveResultWithHash: (...a: unknown[]) => saveResultWithHash(...a),
    saveOverride: (...a: unknown[]) => saveOverride(...a),
    parseSentimentSnapshot: (raw: Array<Record<string, unknown>>) => {
        const map = new Map();
        raw.forEach((r) => map.set(r.cardId, { ...r, timestamp: new Date(r.timestamp as string) }));
        return map;
    },
}));

import { useSentimentResults } from '@/features/boards/sentiment/hooks/useSentimentResults';
import { isFresh } from '@/features/boards/sentiment/domain/staleness';
import type { SentimentResult } from '@/features/boards/types/sentiment';

beforeEach(() => {
    saveResultWithHash.mockClear();
    saveOverride.mockClear();
    mockSnapshot = null;
});

function autoResult(cardId: string, sentiment: SentimentResult['sentiment']): SentimentResult {
    return { cardId, sentiment, confidence: 0.9, timestamp: new Date(), contentHash: 'h', modelId: 'm', modelVersion: 'v' };
}

function rawResult(cardId: string, sentiment: SentimentResult['sentiment'], overrides: Partial<Record<string, unknown>> = {}) {
    return { cardId, sentiment, confidence: 0.9, timestamp: new Date().toISOString(), contentHash: 'h', modelId: 'm', modelVersion: 'v', isOverride: false, ...overrides };
}

describe('useSentimentResults — override durability (US3)', () => {
    it('does not let applyBatch overwrite a manual override', async () => {
        const { result } = renderHook(() => useSentimentResults('retro-1'));

        await act(async () => { await result.current.overrideSentiment('card-1', 'positive'); });
        expect(result.current.results.get('card-1')?.isOverride).toBe(true);

        act(() => { result.current.applyBatch([autoResult('card-1', 'negative')]); });

        const stored = result.current.results.get('card-1')!;
        expect(stored.isOverride).toBe(true);
        expect(stored.sentiment).toBe('positive');
    });

    it('does not let applyResult overwrite a manual override', async () => {
        const { result } = renderHook(() => useSentimentResults('retro-1'));
        await act(async () => { await result.current.overrideSentiment('card-1', 'neutral'); });

        act(() => { result.current.applyResult(autoResult('card-1', 'negative')); });

        expect(result.current.results.get('card-1')?.sentiment).toBe('neutral');
        expect(result.current.results.get('card-1')?.isOverride).toBe(true);
    });

    it('an override is exempt from isFresh invalidation on model/version change', async () => {
        const { result } = renderHook(() => useSentimentResults('retro-1'));
        await act(async () => { await result.current.overrideSentiment('card-1', 'positive'); });

        const override = result.current.results.get('card-1')!;
        // Different text AND model AND version — still fresh because it is an override.
        expect(isFresh(override, 'brand new text', 'different-model', 'different-version')).toBe(true);
    });
});

describe('useSentimentResults — SSE snapshot merge', () => {
    it('merges persisted results carrying contentHash + modelVersion into the map', async () => {
        mockSnapshot = { sentiment: [rawResult('card-9', 'positive', { contentHash: 'H9', modelVersion: 'hf-transformers-3' })] };
        const { result } = renderHook(() => useSentimentResults('retro-1'));
        await waitFor(() => expect(result.current.results.get('card-9')).toBeDefined());
        const rec = result.current.results.get('card-9')!;
        expect(rec.contentHash).toBe('H9');
        expect(rec.modelVersion).toBe('hf-transformers-3');
    });

    it('never overwrites an in-memory override with a stale persisted record from a later snapshot', async () => {
        const { result, rerender } = renderHook(() => useSentimentResults('retro-1'));
        await act(async () => { await result.current.overrideSentiment('card-1', 'positive'); });

        mockSnapshot = { sentiment: [rawResult('card-1', 'negative')] };
        rerender();

        // merge only fills absent keys — the in-memory override wins
        await waitFor(() => expect(result.current.results.get('card-1')?.isOverride).toBe(true));
        expect(result.current.results.get('card-1')?.sentiment).toBe('positive');
    });
});
