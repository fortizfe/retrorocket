import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkerManager, type WorkerState } from '@/features/boards/sentiment/hooks/useWorkerManager';
import type { SentimentResult } from '@/features/boards/types/sentiment';

// ── Minimal controllable Worker mock ─────────────────────────────────────────
class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    posted: unknown[] = [];
    terminated = false;
    constructor() { FakeWorker.instances.push(this); }
    postMessage(msg: unknown) { this.posted.push(msg); }
    terminate() { this.terminated = true; }
    emit(data: unknown) { this.onmessage?.({ data }); }
}

beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
});
afterEach(() => { vi.unstubAllGlobals(); });

function setup() {
    const onResult = vi.fn<(r: SentimentResult) => void>();
    const onBatch = vi.fn<(r: SentimentResult[]) => void>();
    const onState = vi.fn<(s: Partial<WorkerState>) => void>();
    const { result } = renderHook(() => useWorkerManager());
    act(() => { result.current.setHandlers(onResult, onBatch, onState); });
    return { hook: result, onResult, onBatch, onState };
}

describe('useWorkerManager', () => {
    it('maps ready/result/batch_result messages to the right callbacks', () => {
        const { hook, onResult, onBatch, onState } = setup();
        act(() => { hook.current.initialize('model-a'); });
        const worker = FakeWorker.instances.at(-1)!;

        act(() => { worker.emit({ type: 'ready', data: { modelId: 'model-a' } }); });
        expect(onState).toHaveBeenCalledWith(expect.objectContaining({ ready: true, loading: false }));

        act(() => { worker.emit({ type: 'result', data: { cardId: 'c1', sentiment: 'positive', confidence: 0.9, timestamp: new Date().toISOString() } }); });
        expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ cardId: 'c1', sentiment: 'positive' }));

        act(() => { worker.emit({ type: 'batch_result', data: { results: [{ cardId: 'c2', sentiment: 'neutral', confidence: 0.3, timestamp: new Date().toISOString() }] } }); });
        expect(onBatch).toHaveBeenCalledWith([expect.objectContaining({ cardId: 'c2', sentiment: 'neutral' })]);
    });

    it('surfaces a model-load error (no cardId) as a non-silent error state', () => {
        const { hook, onState } = setup();
        act(() => { hook.current.initialize('model-a'); });
        const worker = FakeWorker.instances.at(-1)!;
        act(() => { worker.emit({ type: 'error', data: { error: 'model load failed' } }); });
        expect(onState).toHaveBeenCalledWith(expect.objectContaining({ error: 'model load failed', ready: false }));
    });

    it('terminates the worker on demand', () => {
        const { hook } = setup();
        act(() => { hook.current.initialize('model-a'); });
        const worker = FakeWorker.instances.at(-1)!;
        act(() => { hook.current.terminate(); });
        expect(worker.terminated).toBe(true);
    });
});
