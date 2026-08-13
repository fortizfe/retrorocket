import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmbeddingWorkerManager } from '@/features/boards/clustering/hooks/useEmbeddingWorkerManager';

// ── Minimal controllable Worker mock, mirroring useWorkerManager.test.ts's
// FakeWorker but supporting both the `onmessage` property and
// addEventListener('message', ...) — useEmbeddingWorkerManager relies on both. ──
class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    listeners: Array<(e: { data: unknown }) => void> = [];
    posted: unknown[] = [];
    terminated = false;
    constructor() { FakeWorker.instances.push(this); }
    postMessage(msg: unknown) { this.posted.push(msg); }
    terminate() { this.terminated = true; }
    addEventListener(_type: string, listener: (e: { data: unknown }) => void) { this.listeners.push(listener); }
    removeEventListener(_type: string, listener: (e: { data: unknown }) => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
    emit(data: unknown) {
        this.onmessage?.({ data });
        this.listeners.slice().forEach(l => l({ data }));
    }
}

beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('useEmbeddingWorkerManager', () => {
    it('lazily initializes the worker on first embed() call and resolves with the results', async () => {
        const { result } = renderHook(() => useEmbeddingWorkerManager());
        expect(FakeWorker.instances).toHaveLength(0);

        const requests = [{ cardId: 'a', content: 'hola' }];
        let promise: Promise<unknown>;
        act(() => { promise = result.current.embed(requests); });

        await waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
        const worker = FakeWorker.instances[0];
        expect(worker.posted).toContainEqual({ type: 'init', data: {} });

        act(() => { worker.emit({ type: 'ready', data: { modelId: 'test-model' } }); });
        await waitFor(() => expect(worker.posted).toContainEqual({ type: 'embed', data: { requests } }));

        act(() => { worker.emit({ type: 'embed_result', data: { results: [{ cardId: 'a', vector: [0.1, 0.2] }] } }); });

        await expect(promise!).resolves.toEqual([{ cardId: 'a', vector: [0.1, 0.2] }]);
    });

    it('reuses the already-ready worker for a second embed() call without re-initializing', async () => {
        const { result } = renderHook(() => useEmbeddingWorkerManager());

        let first: Promise<unknown>;
        act(() => { first = result.current.embed([{ cardId: 'a', content: 'hola' }]); });
        const worker = FakeWorker.instances[0];
        act(() => { worker.emit({ type: 'ready', data: { modelId: 'test-model' } }); });
        await waitFor(() => expect(worker.posted).toContainEqual({ type: 'embed', data: { requests: [{ cardId: 'a', content: 'hola' }] } }));
        act(() => { worker.emit({ type: 'embed_result', data: { results: [{ cardId: 'a', vector: [1] }] } }); });
        await first!;

        const initMessagesBefore = worker.posted.filter((m: any) => m.type === 'init').length;
        const embedMessagesBefore = worker.posted.filter((m: any) => m.type === 'embed').length;
        let second: Promise<unknown>;
        act(() => { second = result.current.embed([{ cardId: 'b', content: 'adios' }]); });
        await waitFor(() => expect(worker.posted.filter((m: any) => m.type === 'embed').length).toBe(embedMessagesBefore + 1));
        act(() => { worker.emit({ type: 'embed_result', data: { results: [{ cardId: 'b', vector: [2] }] } }); });
        await second!;

        expect(FakeWorker.instances).toHaveLength(1);
        expect(worker.posted.filter((m: any) => m.type === 'init').length).toBe(initMessagesBefore);
    });

    it('rejects the in-flight embed() call, without reinterpreting it as a model-load failure, when an error arrives after ready', async () => {
        const { result } = renderHook(() => useEmbeddingWorkerManager());

        let promise: Promise<unknown>;
        act(() => { promise = result.current.embed([{ cardId: 'a', content: 'hola' }]); });
        const worker = FakeWorker.instances[0];
        act(() => { worker.emit({ type: 'ready', data: { modelId: 'test-model' } }); });
        await waitFor(() => expect(worker.posted).toContainEqual({ type: 'embed', data: { requests: [{ cardId: 'a', content: 'hola' }] } }));
        act(() => { worker.emit({ type: 'error', data: { error: 'embedding failed for this batch' } }); });

        await expect(promise!).rejects.toThrow('embedding failed for this batch');
        // No retry/reload should have been triggered by an in-flight-request error.
        expect(worker.posted.filter((m: any) => m.type === 'init').length).toBe(1);
    });

    it('rejects embed() when the model repeatedly fails to load', async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useEmbeddingWorkerManager());

        let promise: Promise<unknown>;
        act(() => { promise = result.current.embed([{ cardId: 'a', content: 'hola' }]); });
        promise!.catch(() => {}); // attach a handler immediately to avoid a spurious unhandled-rejection warning while the loop below awaits timers before the final assertion attaches its own
        const worker = FakeWorker.instances[0];

        for (let i = 0; i < 4; i++) {
            act(() => { worker.emit({ type: 'error', data: { error: 'load failed' } }); });
            await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
        }

        await expect(promise!).rejects.toThrow('load failed');
        vi.useRealTimers();
    });

    it('terminates the worker on demand', async () => {
        const { result } = renderHook(() => useEmbeddingWorkerManager());
        act(() => { result.current.embed([{ cardId: 'a', content: 'hola' }]); });
        await waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
        const worker = FakeWorker.instances[0];

        act(() => { result.current.terminate(); });
        expect(worker.terminated).toBe(true);
    });

    it('embed([]) resolves to an empty array without touching the worker', async () => {
        const { result } = renderHook(() => useEmbeddingWorkerManager());
        await expect(result.current.embed([])).resolves.toEqual([]);
        expect(FakeWorker.instances).toHaveLength(0);
    });
});
