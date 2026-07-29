import { useState, useCallback, useRef, useEffect } from 'react';
import { SentimentResult, SentimentConfiguration, SentimentType, shouldShowSentimentBadge } from '@/features/boards/types/sentiment';
import { Card } from '@/features/boards/types/card';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import type { SentimentResult as BackendSentimentResult } from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { hashContent } from '@/features/boards/sentiment/domain/contentHash';

function fromBackendResults(results: BackendSentimentResult[]): Map<string, SentimentResult> {
    const map = new Map<string, SentimentResult>();
    results.forEach((r) => {
        map.set(r.cardId, {
            cardId: r.cardId,
            sentiment: r.sentiment,
            confidence: r.confidence,
            modelId: r.modelId ?? '',
            modelVersion: r.modelVersion ?? '',
            isOverride: r.isOverride,
            timestamp: r.analyzedAt,
            contentHash: r.contentHash,
        });
    });
    return map;
}

export interface SentimentCounts {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
}

export function isAnalyzableCard(card: Card): boolean {
    return card.column !== 'actions' && card.content.trim().length >= 3;
}

function mergePersistedResults(
    prev: Map<string, SentimentResult>,
    persisted: Map<string, SentimentResult>
): Map<string, SentimentResult> {
    const merged = new Map(prev);
    persisted.forEach((result, cardId) => {
        // In-memory results (fresh this session, or overrides) always win over a
        // persisted record; staleness of loaded records is decided by the consumer
        // via `isFresh` against the current card text + active model.
        if (!merged.has(cardId)) merged.set(cardId, result);
    });
    return merged;
}

/** Persist path for auto results; each result already carries its card-text hash. */
function persistBatch(retroId: string, results: SentimentResult[]): void {
    void retroId;
    results.forEach(r =>
        backendRetrospectiveClient
            .saveSentimentResult(r.cardId, {
                sentiment: r.sentiment,
                confidence: r.confidence,
                modelId: r.modelId,
                modelVersion: r.modelVersion,
                contentHash: r.contentHash ?? hashContent(r.cardId),
            })
            .catch(() => {})
    );
}

export interface SentimentResultsReturn {
    results: ReadonlyMap<string, SentimentResult>;
    processingQueue: React.MutableRefObject<Set<string>>;
    applyResult: (result: SentimentResult) => void;
    applyBatch: (results: SentimentResult[]) => void;
    clearResults: () => void;
    getSentiment: (cardId: string) => SentimentResult | undefined;
    getSentimentCounts: (cards: Card[], config: SentimentConfiguration) => SentimentCounts;
    isProcessing: (cardId: string) => boolean;
    overrideSentiment: (cardId: string, sentiment: SentimentType) => Promise<void>;
}

/**
 * `persistedResults` is sourced from useRetrospectiveRealtimeSync's board state
 * (feature 019, US7) — loaded once via GetBoardState, not kept live (spec
 * Assumptions: sentiment results have no live-sync requirement) — replacing this
 * hook's own one-time Firestore fetch on mount.
 */
export function useSentimentResults(retrospectiveId?: string, persistedResults: BackendSentimentResult[] = []): SentimentResultsReturn {
    const [results, setResults] = useState<Map<string, SentimentResult>>(new Map());
    const processingQueue = useRef<Set<string>>(new Set());
    const retroIdRef = useRef(retrospectiveId);
    useEffect(() => { retroIdRef.current = retrospectiveId; }, [retrospectiveId]);

    // Merge the board's already-loaded results in — no separate fetch, and no live
    // re-merge on every unrelated board update, since `persistedResults` only changes
    // reference on an actual (re)load (sentiment results aren't part of the WS relay).
    useEffect(() => {
        if (persistedResults.length === 0) return;
        setResults(prev => mergePersistedResults(prev, fromBackendResults(persistedResults)));
    }, [persistedResults]);

    const applyResult = useCallback((result: SentimentResult) => {
        setResults(prev => {
            const existing = prev.get(result.cardId);
            processingQueue.current.delete(result.cardId);
            // Never overwrite a manual override with a new analysis result
            if (existing?.isOverride && !result.isOverride) return prev;
            if (
                existing &&
                existing.sentiment === result.sentiment &&
                Math.abs(existing.confidence - result.confidence) < 0.01 &&
                existing.contentHash === result.contentHash &&
                existing.modelVersion === result.modelVersion
            ) {
                return prev;
            }
            const updated = new Map(prev);
            updated.set(result.cardId, result);
            // Fire-and-forget persistence
            const retroId = retroIdRef.current;
            if (retroId) {
                backendRetrospectiveClient
                    .saveSentimentResult(result.cardId, {
                        sentiment: result.sentiment,
                        confidence: result.confidence,
                        modelId: result.modelId,
                        modelVersion: result.modelVersion,
                        contentHash: result.contentHash ?? hashContent(result.cardId),
                    })
                    .catch(() => {});
            }
            return updated;
        });
    }, []);

    const applyBatch = useCallback((incoming: SentimentResult[]) => {
        setResults(prev => {
            let hasChanges = false;
            const updated = new Map(prev);
            const toSave: SentimentResult[] = [];
            for (const result of incoming) {
                processingQueue.current.delete(result.cardId);
                const existing = updated.get(result.cardId);
                // Never overwrite a manual override with a new analysis result
                if (existing?.isOverride && !result.isOverride) continue;
                if (
                    !existing ||
                    existing.sentiment !== result.sentiment ||
                    Math.abs(existing.confidence - result.confidence) >= 0.01 ||
                    existing.contentHash !== result.contentHash ||
                    existing.modelVersion !== result.modelVersion
                ) {
                    updated.set(result.cardId, result);
                    toSave.push(result);
                    hasChanges = true;
                }
            }
            // Fire-and-forget persistence for changed results
            const retroId = retroIdRef.current;
            if (retroId && toSave.length > 0) persistBatch(retroId, toSave);
            return hasChanges ? updated : prev;
        });
    }, []);

    const clearResults = useCallback(() => {
        setResults(new Map());
        processingQueue.current.clear();
    }, []);

    const getSentiment = useCallback((cardId: string) => results.get(cardId), [results]);

    const getSentimentCounts = useCallback((
        cards: Card[],
        config: SentimentConfiguration
    ): SentimentCounts => {
        const counts = { positive: 0, negative: 0, neutral: 0, total: 0 };
        cards.forEach(card => {
            if (!isAnalyzableCard(card)) return;
            counts.total++;
            const result = results.get(card.id);
            if (result && shouldShowSentimentBadge(result, config)) {
                counts[result.sentiment]++;
            }
        });
        return counts;
    }, [results]);

    const isProcessing = useCallback((cardId: string) =>
        processingQueue.current.has(cardId), []);

    const overrideSentiment = useCallback(async (cardId: string, sentiment: SentimentType): Promise<void> => {
        const retroId = retroIdRef.current;
        // Optimistic update — bypass applyResult to avoid triggering saveSentimentResult,
        // which would race against saveSentimentOverride and clobber isOverride: true.
        const overrideResult: SentimentResult = { cardId, sentiment, confidence: 1, timestamp: new Date(), isOverride: true };
        setResults(prev => {
            const updated = new Map(prev);
            updated.set(cardId, overrideResult);
            return updated;
        });
        if (retroId) {
            await backendRetrospectiveClient.saveSentimentOverride(cardId, sentiment);
        }
    }, []);

    return {
        results,
        processingQueue,
        applyResult,
        applyBatch,
        clearResults,
        getSentiment,
        getSentimentCounts,
        isProcessing,
        overrideSentiment,
    };
}
