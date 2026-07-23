import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock the inference library (no real model download) ───────────────────────
const fakePipe = vi.fn(async (_text: string) => [{ label: 'positive', score: 0.87 }]);
const pipeline = vi.fn(async () => fakePipe);
vi.mock('@huggingface/transformers', () => ({
    pipeline: (...a: unknown[]) => pipeline(...a),
    env: {},
}));

import { SENTIMENT_MODELS } from '@/features/boards/types/sentiment';

const MODEL = SENTIMENT_MODELS[0].id;
const MULTI_MODEL = SENTIMENT_MODELS.find(m => m.language === 'multilingual')!.id;
const EN_MODEL = SENTIMENT_MODELS.find(m => m.language === 'en')!.id;
const ES_MODEL = SENTIMENT_MODELS.find(m => m.language === 'es')!.id;

interface Posted { type: string; data: Record<string, unknown> }
let posted: Posted[];
let onmessage: ((e: { data: unknown }) => Promise<void> | void) | null;

async function send(message: unknown) {
    await onmessage!({ data: message });
}

beforeEach(async () => {
    posted = [];
    // The worker calls the bare global postMessage with a single argument.
    (globalThis as unknown as { postMessage: (m: Posted) => void }).postMessage = (m: Posted) => { posted.push(m); };
    pipeline.mockClear();
    pipeline.mockImplementation(async () => fakePipe);
    fakePipe.mockClear();
    fakePipe.mockImplementation(async () => [{ label: 'positive', score: 0.87 }]);
    vi.resetModules();
    await import('@/features/boards/sentiment/workers/sentimentWorker');
    onmessage = (globalThis as unknown as { onmessage: typeof onmessage }).onmessage;
});

afterEach(() => {
    onmessage = null;
});

describe('sentiment worker message protocol (F8)', () => {
    it('init → loading then ready', async () => {
        await send({ type: 'init', data: { modelId: MODEL } });
        const types = posted.map(p => p.type);
        expect(types).toContain('loading');
        expect(types).toContain('ready');
        expect(posted.find(p => p.type === 'ready')!.data.modelId).toBe(MODEL);
    });

    it('analyze → result with mapped sentiment', async () => {
        await send({ type: 'init', data: { modelId: MODEL } });
        posted = [];
        await send({ type: 'analyze', data: { cardId: 'c1', content: 'the team did great work' } });
        const result = posted.find(p => p.type === 'result')!;
        expect(result.data.cardId).toBe('c1');
        expect(result.data.sentiment).toBe('positive');
        expect(result.data.confidence).toBeCloseTo(0.87, 2);
    });

    it('analyze with sub-minimum content → neutral/0 without calling the model', async () => {
        await send({ type: 'init', data: { modelId: MODEL } });
        posted = [];
        fakePipe.mockClear();
        await send({ type: 'analyze', data: { cardId: 'c2', content: 'ok' } });
        const result = posted.find(p => p.type === 'result')!;
        expect(result.data.sentiment).toBe('neutral');
        expect(result.data.confidence).toBe(0);
        expect(fakePipe).not.toHaveBeenCalled();
    });

    it('batch_analyze → single batch_result; a per-item failure yields neutral/0 without aborting', async () => {
        await send({ type: 'init', data: { modelId: MODEL } });
        posted = [];
        fakePipe.mockImplementationOnce(async () => { throw new Error('boom'); });
        await send({
            type: 'batch_analyze',
            data: { requests: [
                { cardId: 'a', content: 'this one fails first' },
                { cardId: 'b', content: 'this one succeeds fine' },
            ] },
        });
        const batch = posted.filter(p => p.type === 'batch_result');
        expect(batch).toHaveLength(1);
        const results = batch[0].data.results as { cardId: string; sentiment: string; confidence: number }[];
        expect(results.map(r => r.cardId)).toEqual(['a', 'b']);
        expect(results[0]).toMatchObject({ sentiment: 'neutral', confidence: 0 });
        expect(results[1]).toMatchObject({ sentiment: 'positive' });
    });

    it('analyze before init → error', async () => {
        await send({ type: 'analyze', data: { cardId: 'x', content: 'some content here' } });
        expect(posted.find(p => p.type === 'error')).toBeDefined();
    });

    it('result carries the model id that classified the card', async () => {
        await send({ type: 'init', data: { modelId: MODEL } });
        posted = [];
        await send({ type: 'analyze', data: { cardId: 'c1', content: 'the team did great work' } });
        expect(posted.find(p => p.type === 'result')!.data.modelId).toBe(MODEL);
    });
});

describe('language-aware routing (FR-008/FR-009/FR-010, SC-004)', () => {
    const SET = [MULTI_MODEL, EN_MODEL, ES_MODEL];

    it('init with a model set → ready reports every loaded id', async () => {
        await send({ type: 'init', data: { modelIds: SET } });
        const ready = posted.find(p => p.type === 'ready')!;
        expect(ready.data.modelIds).toEqual(SET);
    });

    it('routes ES→ES model, EN→EN model, undetectable→multilingual (no cross-contamination)', async () => {
        await send({ type: 'init', data: { modelIds: SET } });
        posted = [];
        await send({ type: 'analyze', data: { cardId: 'es', content: 'faltó tiempo y hubo muchos bloqueos' } });
        await send({ type: 'analyze', data: { cardId: 'en', content: 'the team did great work this sprint' } });
        await send({ type: 'analyze', data: { cardId: 'x', content: 'kubernetes docker pipeline' } });
        const byId = Object.fromEntries(
            posted.filter(p => p.type === 'result').map(p => [p.data.cardId, p.data.modelId])
        );
        expect(byId['es']).toBe(ES_MODEL);
        expect(byId['en']).toBe(EN_MODEL);
        expect(byId['x']).toBe(MULTI_MODEL);
    });

    it('a single route failing to load does not abort the others (FR-015)', async () => {
        pipeline.mockImplementation(async (...a: unknown[]) => {
            if (a[1] === EN_MODEL) throw new Error('load failed');
            return fakePipe;
        });
        await send({ type: 'init', data: { modelIds: SET } });
        const ready = posted.find(p => p.type === 'ready')!;
        expect(ready.data.modelIds).toEqual([MULTI_MODEL, ES_MODEL]);
    });
});
