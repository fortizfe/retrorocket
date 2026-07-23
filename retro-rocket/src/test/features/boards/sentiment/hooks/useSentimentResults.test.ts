import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const loadResults = vi.fn(() => Promise.resolve(new Map()));
const saveResultWithHash = vi.fn(() => Promise.resolve());
const saveOverride = vi.fn(() => Promise.resolve());

vi.mock('@/features/boards/sentiment/services/sentimentResultsService', () => ({
    SentimentResultsService: {
        loadResults: (...a: unknown[]) => loadResults(...a),
        saveResultWithHash: (...a: unknown[]) => saveResultWithHash(...a),
        saveOverride: (...a: unknown[]) => saveOverride(...a),
    },
}));

import { useSentimentResults } from '@/features/boards/sentiment/hooks/useSentimentResults';
import { isFresh } from '@/features/boards/sentiment/domain/staleness';
import type { SentimentResult } from '@/features/boards/types/sentiment';

beforeEach(() => {
    loadResults.mockClear();
    saveResultWithHash.mockClear();
    saveOverride.mockClear();
});

function autoResult(cardId: string, sentiment: SentimentResult['sentiment']): SentimentResult {
    return { cardId, sentiment, confidence: 0.9, timestamp: new Date(), contentHash: 'h', modelId: 'm', modelVersion: 'v' };
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

describe('useSentimentResults — load merge', () => {
    it('merges persisted results carrying contentHash + modelVersion into the map', async () => {
        loadResults.mockResolvedValueOnce(new Map([
            ['card-9', { ...autoResult('card-9', 'positive'), contentHash: 'H9', modelVersion: 'hf-transformers-3' }],
        ]));
        const { result } = renderHook(() => useSentimentResults('retro-1'));
        await waitFor(() => expect(result.current.results.get('card-9')).toBeDefined());
        const rec = result.current.results.get('card-9')!;
        expect(rec.contentHash).toBe('H9');
        expect(rec.modelVersion).toBe('hf-transformers-3');
    });

    it('never overwrites an in-memory override with a stale persisted record', async () => {
        loadResults.mockResolvedValueOnce(new Map([['card-1', autoResult('card-1', 'negative')]]));
        const { result } = renderHook(() => useSentimentResults('retro-1'));
        await act(async () => { await result.current.overrideSentiment('card-1', 'positive'); });
        // even if a later load merge runs, the override wins (merge only fills absent keys)
        await waitFor(() => expect(result.current.results.get('card-1')?.isOverride).toBe(true));
    });
});
