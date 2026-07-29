import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';

vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    saveSentimentResult: vi.fn(() => Promise.resolve()),
    saveSentimentOverride: vi.fn(() => Promise.resolve()),
}));

const mockedClient = vi.mocked(backendRetrospectiveClient);

import { useSentimentResults } from '@/features/boards/sentiment/hooks/useSentimentResults';
import { isFresh } from '@/features/boards/sentiment/domain/staleness';
import type { SentimentResult } from '@/features/boards/types/sentiment';

beforeEach(() => {
    vi.clearAllMocks();
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

    it('calls backendRetrospectiveClient.saveSentimentOverride, not saveSentimentResult', async () => {
        const { result } = renderHook(() => useSentimentResults('retro-1'));
        await act(async () => { await result.current.overrideSentiment('card-1', 'positive'); });

        expect(mockedClient.saveSentimentOverride).toHaveBeenCalledWith('card-1', 'positive');
        expect(mockedClient.saveSentimentResult).not.toHaveBeenCalled();
    });
});
