import { useRef, useCallback, useEffect } from 'react';
import { SentimentResult } from '../types/sentiment';

export interface WorkerState {
    ready: boolean;
    loading: boolean;
    error: string | undefined;
}

export interface AnalysisRequest {
    cardId: string;
    content: string;
}

export interface UseWorkerManagerReturn {
    postAnalyze: (cardId: string, content: string) => void;
    postBatch: (requests: AnalysisRequest[]) => void;
    initialize: (modelId: string) => void;
    terminate: () => void;
    setHandlers: (
        onResult: (result: SentimentResult) => void,
        onBatchResult: (results: SentimentResult[]) => void,
        onStateChange: (state: Partial<WorkerState>) => void
    ) => void;
}

const MAX_RETRIES = 3;

export function useWorkerManager(): UseWorkerManagerReturn {
    const workerRef = useRef<Worker | null>(null);
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentModelIdRef = useRef<string>('');

    // Use refs for callbacks so the worker message handler always calls
    // the latest version without needing to re-create the worker.
    const onResultRef = useRef<(result: SentimentResult) => void>(() => {});
    const onBatchResultRef = useRef<(results: SentimentResult[]) => void>(() => {});
    const onStateChangeRef = useRef<(state: Partial<WorkerState>) => void>(() => {});

    const setHandlers = useCallback((
        onResult: (result: SentimentResult) => void,
        onBatchResult: (results: SentimentResult[]) => void,
        onStateChange: (state: Partial<WorkerState>) => void
    ) => {
        onResultRef.current = onResult;
        onBatchResultRef.current = onBatchResult;
        onStateChangeRef.current = onStateChange;
    }, []);

    const terminate = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        workerRef.current?.terminate();
        workerRef.current = null;
        retryCountRef.current = 0;
    }, []);

    const initialize = useCallback((modelId: string) => {
        // Skip if same model already loaded
        if (workerRef.current && currentModelIdRef.current === modelId) return;

        terminate();
        currentModelIdRef.current = modelId;

        try {
            const worker = new Worker(
                new URL('../workers/sentimentWorker.ts', import.meta.url),
                { type: 'module' }
            );

            worker.onmessage = (event) => {
                const { type, data } = event.data;
                switch (type) {
                    case 'loading':
                        onStateChangeRef.current({ ready: false, loading: true, error: undefined });
                        break;
                    case 'ready':
                        retryCountRef.current = 0;
                        onStateChangeRef.current({ ready: true, loading: false, error: undefined });
                        break;
                    case 'result':
                        if (data?.cardId) {
                            onResultRef.current({ ...data, timestamp: new Date(data.timestamp) });
                        }
                        break;
                    case 'batch_result':
                        if (data?.results) {
                            onBatchResultRef.current(
                                data.results.map((r: SentimentResult & { timestamp: string }) => ({
                                    ...r,
                                    timestamp: new Date(r.timestamp)
                                }))
                            );
                        }
                        break;
                    case 'error':
                        onStateChangeRef.current({ loading: false, error: data?.error, ready: false });
                        // Auto-retry model load failures with exponential backoff
                        if (!data?.cardId && retryCountRef.current < MAX_RETRIES) {
                            const delay = 1000 * Math.pow(2, retryCountRef.current);
                            retryCountRef.current++;
                            retryTimerRef.current = setTimeout(() => {
                                initialize(modelId);
                            }, delay);
                        }
                        break;
                }
            };

            worker.onerror = () => {
                onStateChangeRef.current({
                    loading: false,
                    error: 'Worker failed to initialize',
                    ready: false
                });
            };

            workerRef.current = worker;
            onStateChangeRef.current({ loading: true, ready: false, error: undefined });
            worker.postMessage({ id: 'init', type: 'init', data: { modelId } });
        } catch (err) {
            onStateChangeRef.current({
                loading: false,
                error: err instanceof Error ? err.message : String(err),
                ready: false
            });
        }
    }, [terminate]);

    const postAnalyze = useCallback((cardId: string, content: string) => {
        workerRef.current?.postMessage({
            id: cardId,
            type: 'analyze',
            data: { cardId, content }
        });
    }, []);

    const postBatch = useCallback((requests: AnalysisRequest[]) => {
        workerRef.current?.postMessage({
            id: 'batch',
            type: 'batch_analyze',
            data: { requests }
        });
    }, []);

    useEffect(() => () => terminate(), [terminate]);

    return { postAnalyze, postBatch, initialize, terminate, setHandlers };
}
