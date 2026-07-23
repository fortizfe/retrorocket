import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Controllable worker-manager mock ─────────────────────────────────────────
interface Handlers {
    onResult: (r: unknown) => void;
    onBatch: (r: unknown[]) => void;
    onState: (s: { ready?: boolean; loading?: boolean; error?: string }) => void;
}
let handlers: Handlers;
const postBatch = vi.fn();
const postAnalyze = vi.fn();
const terminate = vi.fn();
// Model load is slow in reality (weights download) — far slower than the Firestore
// read of persisted results — so the worker does NOT become ready synchronously.
// Tests drive `ready` explicitly, after persisted results have loaded.
const initialize = vi.fn(() => { handlers.onState({ loading: true, ready: false, error: undefined }); });
function becomeReady() { act(() => handlers.onState({ ready: true, loading: false, error: undefined })); }

vi.mock('@/features/boards/sentiment/hooks/useWorkerManager', () => ({
    WorkerState: undefined,
    useWorkerManager: () => ({
        setHandlers: (onResult: Handlers['onResult'], onBatch: Handlers['onBatch'], onState: Handlers['onState']) => {
            handlers = { onResult, onBatch, onState };
        },
        initialize,
        terminate,
        postAnalyze,
        postBatch,
    }),
}));

// ── Service mock (load/save persisted results) ───────────────────────────────
const loadResults = vi.fn(() => Promise.resolve(new Map()));
vi.mock('@/features/boards/sentiment/services/sentimentResultsService', () => ({
    SentimentResultsService: {
        loadResults: (...a: unknown[]) => loadResults(...a),
        saveResultWithHash: vi.fn(() => Promise.resolve()),
        saveOverride: vi.fn(() => Promise.resolve()),
    },
}));

import { useSentiment } from '@/features/boards/sentiment/hooks/useSentiment';
import { DEFAULT_SENTIMENT_CONFIG, MODEL_VERSION, type SentimentResult } from '@/features/boards/types/sentiment';
import { hashContent } from '@/features/boards/sentiment/domain/contentHash';
import { makeCard } from '@/test/features/boards/sentiment/fixtures/cards';

const MODEL = DEFAULT_SENTIMENT_CONFIG.modelId;

function freshPersisted(cardId: string, content: string, sentiment: SentimentResult['sentiment'] = 'positive'): SentimentResult {
    return {
        cardId, sentiment, confidence: 0.9, timestamp: new Date(),
        contentHash: hashContent(content), modelId: MODEL, modelVersion: MODEL_VERSION,
    };
}

beforeEach(() => {
    postBatch.mockClear();
    postAnalyze.mockClear();
    terminate.mockClear();
    initialize.mockClear();
    loadResults.mockReset();
    loadResults.mockResolvedValue(new Map());
    vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('useSentiment — reuse on reload (SC-002)', () => {
    it('dispatches no analysis when every card has a fresh persisted result', async () => {
        const cards = [
            makeCard({ id: 'c1', content: 'went really well', column: 'went_well' }),
            makeCard({ id: 'c2', content: 'a real blocker', column: 'not_went_well' }),
        ];
        loadResults.mockResolvedValue(new Map([
            ['c1', freshPersisted('c1', 'went really well')],
            ['c2', freshPersisted('c2', 'a real blocker', 'negative')],
        ]));

        renderHook(() => useSentiment(cards, 'retro-1'));
        await act(async () => { await vi.advanceTimersByTimeAsync(0); }); // flush persisted-results load
        becomeReady();
        await act(async () => { await vi.advanceTimersByTimeAsync(300); });

        expect(postBatch).not.toHaveBeenCalled();
        expect(postAnalyze).not.toHaveBeenCalled();
    });

    it('dispatches analysis for a card with no persisted result', async () => {
        const cards = [makeCard({ id: 'c1', content: 'went really well', column: 'went_well' })];
        renderHook(() => useSentiment(cards, 'retro-1'));
        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
        becomeReady();
        await act(async () => { await vi.advanceTimersByTimeAsync(300); });
        expect(postBatch).toHaveBeenCalled();
        const dispatched = postBatch.mock.calls.flatMap(call => call[0] as { cardId: string }[]);
        expect(dispatched.map(d => d.cardId)).toContain('c1');
    });

    it('re-dispatches only the edited card when its text changes', async () => {
        const cards = [
            makeCard({ id: 'c1', content: 'first text', column: 'went_well' }),
            makeCard({ id: 'c2', content: 'second text', column: 'went_well' }),
        ];
        loadResults.mockResolvedValue(new Map([
            ['c1', freshPersisted('c1', 'first text')],
            ['c2', freshPersisted('c2', 'second text')],
        ]));

        const { rerender } = renderHook(({ cs }) => useSentiment(cs, 'retro-1'), { initialProps: { cs: cards } });
        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
        becomeReady();
        await act(async () => { await vi.advanceTimersByTimeAsync(300); });
        expect(postBatch).not.toHaveBeenCalled();

        const edited = [{ ...cards[0], content: 'first text EDITED' }, cards[1]];
        rerender({ cs: edited });
        await act(async () => { await vi.advanceTimersByTimeAsync(300); });

        const dispatched = postBatch.mock.calls.flatMap(call => call[0] as { cardId: string }[]);
        expect(dispatched.map(d => d.cardId)).toEqual(['c1']);
    });
});

describe('useSentiment — resilience (FR-013)', () => {
    it('surfaces a non-silent error state on worker/model-load failure without losing results', async () => {
        const cards = [makeCard({ id: 'c1', content: 'went really well', column: 'went_well' })];
        loadResults.mockResolvedValue(new Map([['c1', freshPersisted('c1', 'went really well')]]));
        const { result } = renderHook(() => useSentiment(cards, 'retro-1'));
        await act(async () => { await vi.advanceTimersByTimeAsync(0); });

        act(() => { handlers.onState({ ready: false, loading: false, error: 'model load failed' }); });

        expect(result.current.error).toBe('model load failed');
        // board stays usable: the persisted result is still available
        expect(result.current.getSentiment('c1')?.sentiment).toBe('positive');
    });
});

describe('useSentiment — disable clears everything (FR-014)', () => {
    it('setEnabled(false) clears results and terminates the worker', async () => {
        const cards = [makeCard({ id: 'c1', content: 'went really well', column: 'went_well' })];
        loadResults.mockResolvedValue(new Map([['c1', freshPersisted('c1', 'went really well')]]));
        const { result } = renderHook(() => useSentiment(cards, 'retro-1'));
        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
        expect(result.current.getSentiment('c1')).toBeDefined();

        act(() => { result.current.setEnabled(false); });
        await act(async () => { await vi.advanceTimersByTimeAsync(50); });

        expect(result.current.enabled).toBe(false);
        expect(result.current.results.size).toBe(0);
        // no confident results remain (total counts analysable cards, which is unchanged)
        const counts = result.current.getSentimentCounts();
        expect(counts.positive + counts.negative + counts.neutral).toBe(0);
        expect(terminate).toHaveBeenCalled();
    });
});
