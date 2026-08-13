import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock the inference library (no real model download) ───────────────────────
const fakeExtractor = vi.fn(async (text: string) => ({
    // A tiny deterministic "embedding": derived from text length so different
    // inputs produce different (but stable) vectors without a real model.
    data: Float32Array.from([text.length % 7, (text.length * 2) % 11, (text.length * 3) % 13]),
}));
const pipeline = vi.fn(async () => fakeExtractor);
vi.mock('@huggingface/transformers', () => ({
    pipeline: (...a: unknown[]) => pipeline(...a),
    env: {},
}));

import { EMBEDDING_MODEL_ID } from '@/features/boards/clustering/workers/embeddingWorker';

interface Posted { type: string; data: Record<string, unknown> }
let posted: Posted[];
let onmessage: ((e: { data: unknown }) => Promise<void> | void) | null;

async function send(message: unknown) {
    await onmessage!({ data: message });
}

beforeEach(async () => {
    posted = [];
    (globalThis as unknown as { postMessage: (m: Posted) => void }).postMessage = (m: Posted) => { posted.push(m); };
    pipeline.mockClear();
    pipeline.mockImplementation(async () => fakeExtractor);
    fakeExtractor.mockClear();
    vi.resetModules();
    await import('@/features/boards/clustering/workers/embeddingWorker');
    onmessage = (globalThis as unknown as { onmessage: typeof onmessage }).onmessage;
});

afterEach(() => {
    onmessage = null;
});

describe('embedding worker message protocol (spec 044, ai-grouping-service-contract.md)', () => {
    it('init → loading then ready, using the configured multilingual model by default', async () => {
        await send({ type: 'init', data: {} });
        const types = posted.map(p => p.type);
        expect(types).toContain('loading');
        expect(types).toContain('ready');
        expect(posted.find(p => p.type === 'ready')!.data.modelId).toBe(EMBEDDING_MODEL_ID);
    });

    it('init with an explicit modelId loads that model instead of the default', async () => {
        await send({ type: 'init', data: { modelId: 'Xenova/some-other-model' } });
        expect(posted.find(p => p.type === 'ready')!.data.modelId).toBe('Xenova/some-other-model');
    });

    it('re-init with the same model skips reloading (ready without a loading step)', async () => {
        await send({ type: 'init', data: {} });
        posted = [];
        pipeline.mockClear();
        await send({ type: 'init', data: {} });
        expect(pipeline).not.toHaveBeenCalled();
        expect(posted.map(p => p.type)).toEqual(['ready']);
    });

    it('embed → exactly one vector per input card, paired by cardId (no silent drops)', async () => {
        await send({ type: 'init', data: {} });
        posted = [];
        await send({
            type: 'embed',
            data: {
                requests: [
                    { cardId: 'a', content: 'necesitamos mejorar la comunicación' },
                    { cardId: 'b', content: 'we should improve communication' },
                    { cardId: 'c', content: 'añadir más pruebas automatizadas' },
                ],
            },
        });
        const result = posted.find(p => p.type === 'embed_result')!;
        expect(result).toBeDefined();
        const results = result.data.results as { cardId: string; vector: number[] }[];
        expect(results).toHaveLength(3);
        expect(results.map(r => r.cardId)).toEqual(['a', 'b', 'c']);
        results.forEach(r => expect(Array.isArray(r.vector)).toBe(true));
    });

    it('embed before init → error, no embed_result', async () => {
        await send({ type: 'embed', data: { requests: [{ cardId: 'x', content: 'anything' }] } });
        expect(posted.find(p => p.type === 'error')).toBeDefined();
        expect(posted.find(p => p.type === 'embed_result')).toBeUndefined();
    });

    it('a failed model load surfaces a distinguishable error message', async () => {
        pipeline.mockImplementation(async () => { throw new Error('model host unreachable'); });
        await send({ type: 'init', data: {} });
        const error = posted.find(p => p.type === 'error');
        expect(error).toBeDefined();
        expect(error!.data.error).toContain('model host unreachable');
    });

    it('a failure during embedding fails the whole batch explicitly, rather than silently dropping items', async () => {
        await send({ type: 'init', data: {} });
        posted = [];
        fakeExtractor.mockImplementationOnce(async () => { throw new Error('inference failed'); });
        await send({
            type: 'embed',
            data: { requests: [{ cardId: 'a', content: 'first' }, { cardId: 'b', content: 'second' }] },
        });
        expect(posted.find(p => p.type === 'embed_result')).toBeUndefined();
        expect(posted.find(p => p.type === 'error')).toBeDefined();
    });
});
