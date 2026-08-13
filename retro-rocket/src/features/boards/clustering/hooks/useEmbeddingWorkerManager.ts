import { useCallback, useEffect, useRef } from 'react';

export interface EmbeddingWorkerState {
    ready: boolean;
    loading: boolean;
    error: string | undefined;
}

export interface EmbedRequest {
    cardId: string;
    content: string;
}

export interface EmbedResult {
    cardId: string;
    vector: number[];
}

export interface UseEmbeddingWorkerManagerReturn {
    /** Lazily initializes the worker on first call, waits for the model to be ready
     * (retrying model-load failures with backoff, mirroring `useWorkerManager.ts`),
     * sends the batch, and resolves with exactly one result per request — or rejects
     * with a distinguishable error (never a silent partial result). */
    embed: (requests: EmbedRequest[]) => Promise<EmbedResult[]>;
    getState: () => EmbeddingWorkerState;
    terminate: () => void;
}

const MAX_RETRIES = 3;

export function useEmbeddingWorkerManager(): UseEmbeddingWorkerManagerReturn {
    const workerRef = useRef<Worker | null>(null);
    const stateRef = useRef<EmbeddingWorkerState>({ ready: false, loading: false, error: undefined });
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const readyWaitersRef = useRef<Array<{ resolve: () => void; reject: (err: Error) => void }>>([]);

    const terminate = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        workerRef.current?.terminate();
        workerRef.current = null;
        stateRef.current = { ready: false, loading: false, error: undefined };
        retryCountRef.current = 0;
        readyWaitersRef.current = [];
    }, []);

    const ensureInitialized = useCallback((): Promise<void> => {
        if (stateRef.current.ready && workerRef.current) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
            readyWaitersRef.current.push({ resolve, reject });
            if (workerRef.current) return; // init already in flight

            try {
                const worker = new Worker(
                    new URL('../workers/embeddingWorker.ts', import.meta.url),
                    { type: 'module' }
                );

                worker.onmessage = (event) => {
                    const { type, data } = event.data;
                    switch (type) {
                        case 'loading':
                            stateRef.current = { ready: false, loading: true, error: undefined };
                            break;
                        case 'ready':
                            retryCountRef.current = 0;
                            stateRef.current = { ready: true, loading: false, error: undefined };
                            readyWaitersRef.current.splice(0).forEach(w => w.resolve());
                            break;
                        case 'error':
                            // Model-load errors only ever arrive while we haven't reached
                            // `ready` yet; once ready, an 'error' message can only be a
                            // per-request embed failure (`embed()`'s own listener below
                            // handles that rejection) — never reinterpret it as a model-load
                            // failure and reload the model out from under an in-flight
                            // request. This is the only reliable way to tell the two apart,
                            // since both share the identical `{error, modelId?}` shape.
                            if (!stateRef.current.ready) {
                                // Auto-retry with exponential backoff, mirroring
                                // useWorkerManager.ts's sentiment worker retry behavior.
                                stateRef.current = { ready: false, loading: false, error: data?.error };
                                if (retryCountRef.current < MAX_RETRIES) {
                                    const delay = 1000 * Math.pow(2, retryCountRef.current);
                                    retryCountRef.current++;
                                    retryTimerRef.current = setTimeout(() => {
                                        worker.postMessage({ type: 'init', data: {} });
                                    }, delay);
                                } else {
                                    readyWaitersRef.current.splice(0).forEach(w => w.reject(new Error(data?.error ?? 'Embedding model failed to load')));
                                }
                            }
                            break;
                    }
                };

                worker.onerror = () => {
                    stateRef.current = { ready: false, loading: false, error: 'Worker failed to initialize' };
                    readyWaitersRef.current.splice(0).forEach(w => w.reject(new Error('Worker failed to initialize')));
                };

                workerRef.current = worker;
                stateRef.current = { ready: false, loading: true, error: undefined };
                worker.postMessage({ type: 'init', data: {} });
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                stateRef.current = { ready: false, loading: false, error: message };
                readyWaitersRef.current.splice(0).forEach(w => w.reject(new Error(message)));
            }
        });
    }, []);

    const embed = useCallback(async (requests: EmbedRequest[]): Promise<EmbedResult[]> => {
        if (requests.length === 0) return [];

        await ensureInitialized();
        const worker = workerRef.current;
        if (!worker) throw new Error('Embedding worker unavailable');

        return new Promise<EmbedResult[]>((resolve, reject) => {
            const handleMessage = (event: MessageEvent) => {
                const { type, data } = event.data;
                if (type === 'embed_result') {
                    worker.removeEventListener('message', handleMessage);
                    resolve(data.results as EmbedResult[]);
                } else if (type === 'error') {
                    // At this point `ensureInitialized()` has already resolved, so any
                    // 'error' message can only be this in-flight embed request failing.
                    worker.removeEventListener('message', handleMessage);
                    reject(new Error(data?.error ?? 'Embedding failed'));
                }
            };
            worker.addEventListener('message', handleMessage);
            worker.postMessage({ type: 'embed', data: { requests } });
        });
    }, [ensureInitialized]);

    const getState = useCallback(() => stateRef.current, []);

    useEffect(() => () => terminate(), [terminate]);

    return { embed, getState, terminate };
}
