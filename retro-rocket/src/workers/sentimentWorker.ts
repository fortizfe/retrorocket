// Web Worker for sentiment analysis using Transformers.js
// This runs in a separate thread to avoid blocking the UI

import { pipeline, env } from '@xenova/transformers';
import { SentimentType, SENTIMENT_MODELS } from '../types/sentiment';

// Configure transformers.js for web worker environment
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Global pipeline instance
let sentimentPipeline: any = null;
let currentModelId: string | null = null;

interface WorkerMessage {
    id: string;
    type: 'init' | 'analyze' | 'batch_analyze';
    data?: any;
}

interface AnalysisRequest {
    cardId: string;
    content: string;
}

interface WorkerResponse {
    id: string;
    type: 'ready' | 'result' | 'batch_result' | 'error' | 'loading';
    data?: any;
}

// Initialize the sentiment analysis pipeline
async function initializePipeline(modelId: string): Promise<void> {
    try {
        // Only reinitialize if model changed
        if (sentimentPipeline && currentModelId === modelId) {
            postMessage({
                id: 'init',
                type: 'ready',
                data: { modelId }
            } as WorkerResponse);
            return;
        }

        console.log(`🤖 Loading sentiment model: ${modelId}`);

        // Send loading status
        postMessage({
            id: 'init',
            type: 'loading',
            data: { modelId, status: 'Descargando modelo...' }
        } as WorkerResponse);

        sentimentPipeline = await pipeline('text-classification', modelId, {
            revision: 'main',
        });

        currentModelId = modelId;
        console.log(`✅ Model loaded successfully: ${modelId}`);

        postMessage({
            id: 'init',
            type: 'ready',
            data: { modelId }
        } as WorkerResponse);
    } catch (error) {
        console.error(`❌ Failed to load model ${modelId}:`, error);

        // Try fallback model if primary model fails
        const currentModel = SENTIMENT_MODELS.find(m => m.id === modelId);
        if (currentModel?.primary) {
            const fallbackModel = SENTIMENT_MODELS.find(m => !m.primary);
            if (fallbackModel) {
                console.log(`🔄 Trying fallback model: ${fallbackModel.id}`);
                postMessage({
                    id: 'init',
                    type: 'loading',
                    data: { modelId: fallbackModel.id, status: 'Probando modelo alternativo...' }
                } as WorkerResponse);
                return initializePipeline(fallbackModel.id);
            }
        }

        postMessage({
            id: 'init',
            type: 'error',
            data: { error: error instanceof Error ? error.message : String(error), modelId }
        } as WorkerResponse);
    }
}

// Map model output to our sentiment types
function mapSentiment(output: any[], modelId: string): { sentiment: SentimentType; confidence: number } {
    if (!output || output.length === 0) {
        return { sentiment: 'neutral', confidence: 0 };
    }

    const result = output[0];
    const modelConfig = SENTIMENT_MODELS.find(m => m.id === modelId);

    // Use custom mapping if available
    if (modelConfig?.mapLabels) {
        const sentiment = modelConfig.mapLabels(output);
        return { sentiment, confidence: result.score || 0 };
    }

    // Default mapping for primary model
    const label = result.label?.toLowerCase() || '';

    if (label.includes('positive') || label.includes('pos')) {
        return { sentiment: 'positive', confidence: result.score || 0 };
    } else if (label.includes('negative') || label.includes('neg')) {
        return { sentiment: 'negative', confidence: result.score || 0 };
    }

    return { sentiment: 'neutral', confidence: result.score || 0 };
}

// Analyze single card content
async function analyzeText(cardId: string, content: string): Promise<void> {
    try {
        if (!sentimentPipeline) {
            throw new Error('Pipeline not initialized');
        }

        // Skip empty or very short content
        if (!content || content.trim().length < 3) {
            postMessage({
                id: cardId,
                type: 'result',
                data: {
                    cardId,
                    sentiment: 'neutral',
                    confidence: 0,
                    timestamp: new Date().toISOString()
                }
            } as WorkerResponse);
            return;
        }

        // Clean and prepare text
        const cleanContent = content.trim().replace(/\s+/g, ' ');

        // Run inference
        const output = await sentimentPipeline(cleanContent);
        const { sentiment, confidence } = mapSentiment(output, currentModelId!);

        postMessage({
            id: cardId,
            type: 'result',
            data: {
                cardId,
                sentiment,
                confidence,
                timestamp: new Date().toISOString()
            }
        } as WorkerResponse);

    } catch (error) {
        console.error(`❌ Analysis failed for card ${cardId}:`, error);

        postMessage({
            id: cardId,
            type: 'error',
            data: {
                cardId,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            }
        } as WorkerResponse);
    }
}

// Analyze multiple cards in batch
async function analyzeBatch(requests: AnalysisRequest[]): Promise<void> {
    const results = [];

    for (const request of requests) {
        try {
            if (!sentimentPipeline) {
                throw new Error('Pipeline not initialized');
            }

            // Skip action items and empty content
            if (!request.content || request.content.trim().length < 3) {
                results.push({
                    cardId: request.cardId,
                    sentiment: 'neutral',
                    confidence: 0,
                    timestamp: new Date().toISOString()
                });
                continue;
            }

            const cleanContent = request.content.trim().replace(/\s+/g, ' ');
            const output = await sentimentPipeline(cleanContent);
            const { sentiment, confidence } = mapSentiment(output, currentModelId!);

            results.push({
                cardId: request.cardId,
                sentiment,
                confidence,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`❌ Batch analysis failed for card ${request.cardId}:`, error);
            results.push({
                cardId: request.cardId,
                sentiment: 'neutral',
                confidence: 0,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
        }
    }

    postMessage({
        id: 'batch',
        type: 'batch_result',
        data: { results }
    } as WorkerResponse);
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { id, type, data } = event.data;

    try {
        switch (type) {
            case 'init':
                await initializePipeline(data.modelId);
                break;

            case 'analyze':
                await analyzeText(data.cardId, data.content);
                break;

            case 'batch_analyze':
                await analyzeBatch(data.requests);
                break;

            default:
                console.warn(`Unknown message type: ${type}`);
        }
    } catch (error) {
        console.error(`Worker error for ${type}:`, error);
        postMessage({
            id,
            type: 'error',
            data: { error: error instanceof Error ? error.message : String(error) }
        } as WorkerResponse);
    }
};
