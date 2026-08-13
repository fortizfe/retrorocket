import {
    pipeline,
    env,
    type FeatureExtractionPipelineType,
} from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;

/** Small multilingual (ES/EN) sentence-embedding model — research.md §3. Reuses the
 * same `@huggingface/transformers` runtime the sentiment feature already downloads
 * and caches, via a second, independent pipeline task (`feature-extraction`). */
export const EMBEDDING_MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

const DEBUG = false;
const log = (msg: string) => { if (DEBUG) console.log(`[EmbeddingWorker] ${msg}`); };

// ── Inbound message types ────────────────────────────────────────────────────

interface InitMessage {
    type: 'init';
    data: { modelId?: string };
}

interface EmbedMessage {
    type: 'embed';
    data: { requests: { cardId: string; content: string }[] };
}

type WorkerInbound = InitMessage | EmbedMessage;

// ── Outbound message types ───────────────────────────────────────────────────

interface ReadyResponse { type: 'ready'; data: { modelId: string } }
interface LoadingResponse { type: 'loading'; data: { modelId: string; status: string } }
interface EmbedResultResponse {
    type: 'embed_result';
    data: { results: { cardId: string; vector: number[] }[] };
}
interface ErrorResponse { type: 'error'; data: { error: string; modelId?: string } }

type WorkerOutbound = ReadyResponse | LoadingResponse | EmbedResultResponse | ErrorResponse;

function send(msg: WorkerOutbound): void { postMessage(msg); }

// `pipeline<T>` resolves a union across every task type that TS reports as "too
// complex to represent" when instantiated — mirrors sentimentWorker.ts's narrowing.
type CreateFeatureExtractionPipeline = (
    task: 'feature-extraction',
    model: string
) => Promise<FeatureExtractionPipelineType>;
const createFeatureExtractionPipeline = pipeline as unknown as CreateFeatureExtractionPipeline;

let extractor: FeatureExtractionPipelineType | null = null;
let loadedModelId: string | null = null;

async function initializePipeline(data: InitMessage['data']): Promise<void> {
    const modelId = data.modelId ?? EMBEDDING_MODEL_ID;

    if (extractor && loadedModelId === modelId) {
        send({ type: 'ready', data: { modelId } });
        return;
    }

    extractor = null;
    loadedModelId = null;
    log(`Loading model: ${modelId}`);
    send({ type: 'loading', data: { modelId, status: 'Descargando modelo...' } });

    try {
        extractor = await createFeatureExtractionPipeline('feature-extraction', modelId);
        loadedModelId = modelId;
        log(`Model ready: ${modelId}`);
        send({ type: 'ready', data: { modelId } });
    } catch (error) {
        send({ type: 'error', data: { error: error instanceof Error ? error.message : String(error), modelId } });
    }
}

async function embedBatch(requests: { cardId: string; content: string }[]): Promise<void> {
    if (!extractor) {
        send({ type: 'error', data: { error: 'Pipeline not initialized' } });
        return;
    }

    try {
        const results: EmbedResultResponse['data']['results'] = [];
        for (const req of requests) {
            const output = await extractor(req.content, { pooling: 'mean', normalize: true });
            results.push({ cardId: req.cardId, vector: Array.from(output.data as ArrayLike<number>) });
        }
        // Guarantees the contract's "exactly one vector per input card, no silent
        // drops" — a total success (this line) or a total, explicit `error` above/below,
        // never a partial result set.
        send({ type: 'embed_result', data: { results } });
    } catch (error) {
        send({ type: 'error', data: { error: error instanceof Error ? error.message : String(error), modelId: loadedModelId ?? undefined } });
    }
}

// ── Message handler ──────────────────────────────────────────────────────────

globalThis.onmessage = async (event: MessageEvent<WorkerInbound>) => {
    const msg = event.data;
    switch (msg.type) {
        case 'init':
            await initializePipeline(msg.data);
            break;
        case 'embed':
            await embedBatch(msg.data.requests);
            break;
    }
};
