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
});
