import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';

vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    saveSentimentResult: vi.fn(() => Promise.resolve()),
    saveSentimentOverride: vi.fn(() => Promise.resolve()),
}));

const mockedClient = vi.mocked(backendRetrospectiveClient);

import { useSentimentResults } from '@/features/boards/sentiment/hooks/useSentimentResults';
import type { SentimentResult as BackendSentimentResult } from '@/features/boards/retrospective/services/backendRetrospectiveClient';

beforeEach(() => {
    vi.clearAllMocks();
});

function backendResult(cardId: string, sentiment: BackendSentimentResult['sentiment'], overrides: Partial<BackendSentimentResult> = {}): BackendSentimentResult {
    return {
        retrospectiveId: 'retro-1',
        cardId,
        sentiment,
        confidence: 0.9,
        contentHash: 'h',
        modelId: 'm',
        modelVersion: 'v',
        isOverride: false,
        overrideBy: null,
        analyzedAt: new Date(),
        ...overrides,
    };
}

// This suite lives in its own file (feature 019, US7) — split out from
// useSentimentResults.test.ts's override-durability suite deliberately: a Vitest/RTL/
// jsdom worker hang was bisected to a specific 3-test shape in one file (mount-merge
// test + override/rerender test + a third, separate "backend not called on mount"
// test) — order- and count-dependent, not content-dependent; root cause not fully
// isolated. Folding the "not called on mount" assertions into the mount-merge test
// below (rather than a standalone third test) sidesteps it without dropping coverage.
describe('useSentimentResults — persisted results input (feature 019, US7)', () => {
    it('merges results passed in from the board state (contentHash + modelVersion) without calling the backend', async () => {
        const persisted = [backendResult('card-9', 'positive', { contentHash: 'H9', modelVersion: 'hf-transformers-3' })];
        const { result } = renderHook(() => useSentimentResults('retro-1', persisted));

        await waitFor(() => expect(result.current.results.get('card-9')).toBeDefined());
        const rec = result.current.results.get('card-9')!;
        expect(rec.contentHash).toBe('H9');
        expect(rec.modelVersion).toBe('hf-transformers-3');
        // Loaded once via the board state input, not a separate fetch (US7).
        expect(mockedClient.saveSentimentResult).not.toHaveBeenCalled();
        expect(mockedClient.saveSentimentOverride).not.toHaveBeenCalled();
    });

    it('never overwrites an in-memory override with a stale persisted record on rerender', async () => {
        const { result, rerender } = renderHook(
            ({ persisted }) => useSentimentResults('retro-1', persisted),
            { initialProps: { persisted: [] as BackendSentimentResult[] } },
        );

        await act(async () => { await result.current.overrideSentiment('card-1', 'positive'); });

        // A later resync bringing in a stale persisted record must not clobber the override.
        act(() => { rerender({ persisted: [backendResult('card-1', 'negative')] }); });

        expect(result.current.results.get('card-1')?.isOverride).toBe(true);
        expect(result.current.results.get('card-1')?.sentiment).toBe('positive');
    });
});
