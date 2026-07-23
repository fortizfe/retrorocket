import {
    pipeline,
    env,
    type TextClassificationPipelineType,
    type TextClassificationPipelineOptions,
    type TextClassificationOutput,
} from '@huggingface/transformers';
import { SENTIMENT_MODELS, type ModelConfig } from '@/features/boards/types/sentiment';
import { mapSentiment, normalizeForInference } from '@/features/boards/sentiment/workers/sentimentMapper';
import { detectLanguage } from '@/features/boards/sentiment/domain/languageDetection';
import { routeModel, routingEnabled } from '@/features/boards/sentiment/domain/modelRouting';

env.allowLocalModels = false;
env.allowRemoteModels = true;

const DEBUG = false;
const log = (msg: string) => { if (DEBUG) console.log(`[SentimentWorker] ${msg}`); };

// ── Inbound message types ────────────────────────────────────────────────────

interface InitMessage {
    type: 'init';
    // Accepts a single `modelId` (legacy) or a `modelIds` set (language-aware routing).
    data: { modelId?: string; modelIds?: string[] };
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

interface ReadyResponse { type: 'ready'; data: { modelId: string; modelIds: string[] } }
interface LoadingResponse { type: 'loading'; data: { modelId: string; status: string } }
interface ResultResponse {
    type: 'result';
    data: { cardId: string; sentiment: string; confidence: number; modelId: string; timestamp: string };
}
interface BatchResultResponse {
    type: 'batch_result';
    data: { results: { cardId: string; sentiment: string; confidence: number; modelId: string; timestamp: string }[] };
}
interface ErrorResponse { type: 'error'; data: { error: string; modelId?: string; cardId?: string } }

type WorkerOutbound = ReadyResponse | LoadingResponse | ResultResponse | BatchResultResponse | ErrorResponse;

function send(msg: WorkerOutbound): void { postMessage(msg); }

// `pipeline<T>` resolves a union across every task type that TS reports as "too
// complex to represent" when instantiated. We only ever create a text-classification
// pipeline, so narrow the factory to exactly that signature.
type CreateTextClassificationPipeline = (
    task: 'text-classification',
    model: string,
    options?: { revision?: string }
) => Promise<TextClassificationPipelineType>;
const createTextClassificationPipeline = pipeline as unknown as CreateTextClassificationPipeline;

// ── Pipeline registry ────────────────────────────────────────────────────────

/** modelId → loaded pipeline. Holds one entry (default) or several (routing). */
const pipelines = new Map<string, TextClassificationPipelineType>();
/** Configs for the successfully-loaded models, used for routing + label mapping. */
let loadedConfigs: ModelConfig[] = [];

function configFor(modelId: string): ModelConfig {
    return (
        SENTIMENT_MODELS.find(m => m.id === modelId) ??
        // Unknown id: treat as a multilingual default so mapping/routing still work.
        { id: modelId, name: modelId, description: '', language: 'multilingual', primary: false }
    );
}

/** Picks the model id that should classify `cleanText` given the loaded set. */
function pickModelId(cleanText: string): string {
    if (routingEnabled(loadedConfigs)) {
        return routeModel(detectLanguage(cleanText), loadedConfigs);
    }
    return loadedConfigs[0]?.id ?? '';
}

/**
 * Runs the (already-normalized) text through the routed pipeline and returns the
 * mapped sentiment plus the model id that produced it. `{ truncation: true }` is a
 * defensive backstop on top of `normalizeForInference`'s 512-char cap.
 */
async function classify(cleanText: string): Promise<{ sentiment: string; confidence: number; modelId: string }> {
    const modelId = pickModelId(cleanText);
    const pipe = pipelines.get(modelId) ?? pipelines.values().next().value;
    const resolvedId = pipelines.has(modelId) ? modelId : (loadedConfigs[0]?.id ?? modelId);
    // The pipeline's typed options only surface `top_k`; the tokenizer's `truncation`
    // flag is a valid runtime option the published types omit. One narrow cast, justified.
    const options = { truncation: true } as unknown as TextClassificationPipelineOptions;
    const output = (await pipe!(cleanText, options)) as TextClassificationOutput;
    const mapped = mapSentiment(output, resolvedId);
    return { sentiment: mapped.sentiment, confidence: mapped.confidence, modelId: resolvedId };
}

// ── Core functions ────────────────────────────────────────────────────────────

async function loadOne(modelId: string): Promise<boolean> {
    try {
        const pipe = await createTextClassificationPipeline('text-classification', modelId, { revision: 'main' });
        pipelines.set(modelId, pipe);
        log(`Model ready: ${modelId}`);
        return true;
    } catch (error) {
        log(`Failed to load ${modelId}: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

function requestedIds(data: InitMessage['data']): string[] {
    if (data.modelIds && data.modelIds.length > 0) return data.modelIds;
    if (data.modelId) return [data.modelId];
    return [SENTIMENT_MODELS[0].id];
}

async function initializePipeline(data: InitMessage['data']): Promise<void> {
    const ids = requestedIds(data);

    // Already loaded exactly this set → ready without reloading.
    if (pipelines.size > 0 && ids.length === pipelines.size && ids.every(id => pipelines.has(id))) {
        send({ type: 'ready', data: { modelId: ids[0], modelIds: ids } });
        return;
    }

    pipelines.clear();
    loadedConfigs = [];
    log(`Loading models: ${ids.join(', ')}`);
    send({ type: 'loading', data: { modelId: ids[0], status: 'Descargando modelo...' } });

    for (const id of ids) {
        await loadOne(id);
    }

    // Emergency fallback: if nothing loaded, try a different multilingual model.
    if (pipelines.size === 0) {
        const fallback = SENTIMENT_MODELS.find(m => m.language === 'multilingual' && !ids.includes(m.id));
        if (fallback) {
            send({ type: 'loading', data: { modelId: fallback.id, status: 'Probando modelo alternativo...' } });
            await loadOne(fallback.id);
        }
    }

    if (pipelines.size === 0) {
        send({ type: 'error', data: { error: 'No sentiment model could be loaded', modelId: ids[0] } });
        return;
    }

    loadedConfigs = [...pipelines.keys()].map(configFor);
    const loadedIds = [...pipelines.keys()];
    log(`Ready with: ${loadedIds.join(', ')}`);
    send({ type: 'ready', data: { modelId: loadedIds[0], modelIds: loadedIds } });
}

async function analyzeText(cardId: string, content: string): Promise<void> {
    if (pipelines.size === 0) {
        send({ type: 'error', data: { error: 'Pipeline not initialized', cardId } });
        return;
    }

    const clean = normalizeForInference(content);
    if (!clean) {
        send({ type: 'result', data: { cardId, sentiment: 'neutral', confidence: 0, modelId: loadedConfigs[0].id, timestamp: new Date().toISOString() } });
        return;
    }

    try {
        const { sentiment, confidence, modelId } = await classify(clean);
        send({ type: 'result', data: { cardId, sentiment, confidence, modelId, timestamp: new Date().toISOString() } });
    } catch (error) {
        send({ type: 'error', data: { error: error instanceof Error ? error.message : String(error), cardId } });
    }
}

async function analyzeBatch(requests: { cardId: string; content: string }[]): Promise<void> {
    if (pipelines.size === 0) {
        send({ type: 'error', data: { error: 'Pipeline not initialized' } });
        return;
    }

    const defaultId = loadedConfigs[0].id;
    const results: BatchResultResponse['data']['results'] = [];

    for (const req of requests) {
        const clean = normalizeForInference(req.content);
        if (!clean) {
            results.push({ cardId: req.cardId, sentiment: 'neutral', confidence: 0, modelId: defaultId, timestamp: new Date().toISOString() });
            continue;
        }
        try {
            const { sentiment, confidence, modelId } = await classify(clean);
            results.push({ cardId: req.cardId, sentiment, confidence, modelId, timestamp: new Date().toISOString() });
        } catch {
            // Per-item failure ⇒ neutral/0 fallback; never aborts the batch (FR-015).
            results.push({ cardId: req.cardId, sentiment: 'neutral', confidence: 0, modelId: defaultId, timestamp: new Date().toISOString() });
        }
    }

    send({ type: 'batch_result', data: { results } });
}

// ── Message handler ──────────────────────────────────────────────────────────

globalThis.onmessage = async (event: MessageEvent<WorkerInbound>) => {
    const msg = event.data;
    switch (msg.type) {
        case 'init':
            await initializePipeline(msg.data);
            break;
        case 'analyze':
            await analyzeText(msg.data.cardId, msg.data.content);
            break;
        case 'batch_analyze':
            await analyzeBatch(msg.data.requests);
            break;
    }
};
