import { backendApiClient } from '@/lib/services/backendApiClient';
import { SentimentResult, SentimentType } from '@/features/boards/types/sentiment';

interface RawSentimentResult {
    cardId: string;
    sentiment: SentimentType;
    confidence: number;
    modelId?: string;
    modelVersion?: string;
    contentHash?: string;
    isOverride: boolean;
    timestamp: string;
}

function parseResult(raw: RawSentimentResult): SentimentResult {
    return {
        cardId: raw.cardId,
        sentiment: raw.sentiment,
        confidence: raw.confidence,
        modelId: raw.modelId,
        modelVersion: raw.modelVersion,
        contentHash: raw.contentHash,
        isOverride: raw.isOverride,
        timestamp: new Date(raw.timestamp),
    };
}

/**
 * Replaces sentimentResultsService.ts's direct Firestore access (feature 017 US3). The
 * on-device inference itself is unchanged/client-side (FR-007) — this only persists it.
 */
export async function saveResultWithHash(retrospectiveId: string, result: SentimentResult, contentHash: string): Promise<SentimentResult> {
    const raw = await backendApiClient.put<RawSentimentResult>(`/api/boards/${retrospectiveId}/cards/${result.cardId}/sentiment`, {
        sentiment: result.sentiment,
        confidence: result.confidence,
        contentHash,
        modelId: result.modelId,
        modelVersion: result.modelVersion,
    });
    return parseResult(raw);
}

export async function saveOverride(retrospectiveId: string, cardId: string, sentiment: SentimentType): Promise<SentimentResult> {
    const raw = await backendApiClient.put<RawSentimentResult>(`/api/boards/${retrospectiveId}/cards/${cardId}/sentiment/override`, { sentiment });
    return parseResult(raw);
}

export async function deleteResult(retrospectiveId: string, cardId: string): Promise<void> {
    await backendApiClient.delete(`/api/boards/${retrospectiveId}/cards/${cardId}/sentiment`);
}

/** Parses the `sentiment` SSE snapshot/event payload into a Map keyed by cardId. */
export function parseSentimentSnapshot(raw: RawSentimentResult[]): Map<string, SentimentResult> {
    const map = new Map<string, SentimentResult>();
    raw.forEach((r) => map.set(r.cardId, parseResult(r)));
    return map;
}
