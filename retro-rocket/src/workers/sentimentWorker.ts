import { pipeline, env } from '@xenova/transformers';
import { SENTIMENT_MODELS } from '../types/sentiment';
import { mapSentiment, prepareContent } from './sentimentMapper';

env.allowLocalModels = false;
env.allowRemoteModels = true;

const DEBUG = false;
const log = (msg: string) => { if (DEBUG) console.log(`[SentimentWorker] ${msg}`); };

// ── Inbound message types ────────────────────────────────────────────────────

interface InitMessage {
    type: 'init';
    data: { modelId: string };
}

interface AnalyzeMessage {
    type: 'analyze';
    data: { cardId: string; content: string };
}

interface BatchAnalyzeMessage {
    type: 'batch_analyze';
    data: { requests: { cardId: string; content: string }[] };
}

type WorkerInbound = InitMessage | AnalyzeMessage | BatchAnalyzeMessage;

// ── Outbound message types ───────────────────────────────────────────────────

interface ReadyResponse { type: 'ready'; data: { modelId: string } }
interface LoadingResponse { type: 'loading'; data: { modelId: string; status: string } }
interface ResultResponse {
    type: 'result';
    data: { cardId: string; sentiment: string; confidence: number; timestamp: string };
}
interface BatchResultResponse {
    type: 'batch_result';
    data: { results: { cardId: string; sentiment: string; confidence: number; timestamp: string }[] };
}
interface ErrorResponse { type: 'error'; data: { error: string; modelId?: string; cardId?: string } }

type WorkerOutbound = ReadyResponse | LoadingResponse | ResultResponse | BatchResultResponse | ErrorResponse;

function send(msg: WorkerOutbound): void { postMessage(msg); }

// ── Pipeline state ───────────────────────────────────────────────────────────

let sentimentPipeline: Awaited<ReturnType<typeof pipeline>> | null = null;
let currentModelId: string | null = null;

// ── Core functions ────────────────────────────────────────────────────────────

async function initializePipeline(modelId: string): Promise<void> {
    if (sentimentPipeline && currentModelId === modelId) {
        send({ type: 'ready', data: { modelId } });
        return;
    }

    log(`Loading model: ${modelId}`);
    send({ type: 'loading', data: { modelId, status: 'Descargando modelo...' } });

    try {
        sentimentPipeline = await pipeline('text-classification', modelId, { revision: 'main' });
        currentModelId = modelId;
        log(`Model ready: ${modelId}`);
        send({ type: 'ready', data: { modelId } });
    } catch (error) {
        const primaryModel = SENTIMENT_MODELS.find(m => m.id === modelId);
        if (primaryModel?.primary) {
            const fallback = SENTIMENT_MODELS.find(m => !m.primary);
            if (fallback) {
                log(`Falling back to: ${fallback.id}`);
                send({ type: 'loading', data: { modelId: fallback.id, status: 'Probando modelo alternativo...' } });
                return initializePipeline(fallback.id);
            }
        }
        send({ type: 'error', data: { error: error instanceof Error ? error.message : String(error), modelId } });
    }
}

async function analyzeText(cardId: string, content: string): Promise<void> {
    if (!sentimentPipeline || !currentModelId) {
        send({ type: 'error', data: { error: 'Pipeline not initialized', cardId } });
        return;
    }

    const clean = prepareContent(content);
    if (!clean) {
        send({ type: 'result', data: { cardId, sentiment: 'neutral', confidence: 0, timestamp: new Date().toISOString() } });
        return;
    }

    try {
        const output = await (sentimentPipeline as any)(clean);
        const { sentiment, confidence } = mapSentiment(output, currentModelId);
        send({ type: 'result', data: { cardId, sentiment, confidence, timestamp: new Date().toISOString() } });
    } catch (error) {
        send({ type: 'error', data: { error: error instanceof Error ? error.message : String(error), cardId } });
    }
}

async function analyzeBatch(requests: { cardId: string; content: string }[]): Promise<void> {
    if (!sentimentPipeline || !currentModelId) {
        send({ type: 'error', data: { error: 'Pipeline not initialized' } });
        return;
    }

    const modelId = currentModelId;
    const results: BatchResultResponse['data']['results'] = [];

    for (const req of requests) {
        const clean = prepareContent(req.content);
        if (!clean) {
            results.push({ cardId: req.cardId, sentiment: 'neutral', confidence: 0, timestamp: new Date().toISOString() });
            continue;
        }
        try {
            const output = await (sentimentPipeline as any)(clean);
            const { sentiment, confidence } = mapSentiment(output, modelId);
            results.push({ cardId: req.cardId, sentiment, confidence, timestamp: new Date().toISOString() });
        } catch (error) {
            results.push({ cardId: req.cardId, sentiment: 'neutral', confidence: 0, timestamp: new Date().toISOString() });
        }
    }

    send({ type: 'batch_result', data: { results } });
}

// ── Message handler ──────────────────────────────────────────────────────────

globalThis.onmessage = async (event: MessageEvent<WorkerInbound>) => {
    const msg = event.data;
    switch (msg.type) {
        case 'init':
            await initializePipeline(msg.data.modelId);
            break;
        case 'analyze':
            await analyzeText(msg.data.cardId, msg.data.content);
            break;
        case 'batch_analyze':
            await analyzeBatch(msg.data.requests);
            break;
    }
};
