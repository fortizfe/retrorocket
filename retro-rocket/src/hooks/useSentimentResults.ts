import { useState, useCallback, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { SentimentResult, SentimentConfiguration, SentimentType, shouldShowSentimentBadge } from '../types/sentiment';
import { Card } from '../types/card';
import { SentimentResultsService } from '../services/sentimentResultsService';
import { hashContent } from './useSentimentCache';

export interface SentimentCounts {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
}

export interface AnalysisProgress {
    queued: number;
    processed: number;
    total: number;
    percentage: number;
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
        if (!merged.has(cardId)) merged.set(cardId, result);
    });
    return merged;
}

function persistBatch(retroId: string, results: SentimentResult[]): void {
    results.forEach(r =>
        SentimentResultsService.saveResultWithHash(retroId, r, hashContent(r.cardId)).catch(() => {})
    );
}

export interface SentimentResultsReturn {
    results: ReadonlyMap<string, SentimentResult>;
    processingQueue: React.MutableRefObject<Set<string>>;
    applyResult: (result: SentimentResult, contentHash?: string) => void;
    applyBatch: (results: SentimentResult[]) => void;
    clearResults: () => void;
    getSentiment: (cardId: string) => SentimentResult | undefined;
    getSentimentCounts: (cards: Card[], config: SentimentConfiguration) => SentimentCounts;
    isProcessing: (cardId: string) => boolean;
    getProgress: (cards: Card[]) => AnalysisProgress;
    overrideSentiment: (cardId: string, sentiment: SentimentType) => Promise<void>;
}

export function useSentimentResults(retrospectiveId?: string): SentimentResultsReturn {
    const [results, setResults] = useState<Map<string, SentimentResult>>(new Map());
    const processingQueue = useRef<Set<string>>(new Set());
    const retroIdRef = useRef(retrospectiveId);
    useEffect(() => { retroIdRef.current = retrospectiveId; }, [retrospectiveId]);

    // Load persisted results on mount (or when retrospectiveId changes).
    useEffect(() => {
        if (!retrospectiveId) return;
        SentimentResultsService.loadResults(retrospectiveId)
            .then(persisted => {
                if (persisted.size > 0) {
                    setResults(prev => mergePersistedResults(prev, persisted));
                }
            })
            .catch(() => { /* non-critical — fall back to in-memory only */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retrospectiveId]);

    const applyResult = useCallback((result: SentimentResult, contentHash?: string) => {
        setResults(prev => {
            const existing = prev.get(result.cardId);
            processingQueue.current.delete(result.cardId);
            // Never overwrite a manual override with a new analysis result
            if (existing?.isOverride && !result.isOverride) return prev;
            if (
                existing &&
                existing.sentiment === result.sentiment &&
                Math.abs(existing.confidence - result.confidence) < 0.01
            ) {
                return prev;
            }
            const updated = new Map(prev);
            updated.set(result.cardId, result);
            // Fire-and-forget persistence
            const retroId = retroIdRef.current;
            if (retroId) {
                const hash = contentHash ?? hashContent(result.cardId);
                SentimentResultsService.saveResultWithHash(retroId, result, hash).catch(() => {});
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
                    Math.abs(existing.confidence - result.confidence) >= 0.01
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

    const getProgress = useCallback((cards: Card[]): AnalysisProgress => {
        const analyzable = cards.filter(isAnalyzableCard);
        const total = analyzable.length;
        const processed = analyzable.filter(c => results.has(c.id)).length;
        const queued = processingQueue.current.size;
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
        return { queued, processed, total, percentage };
    }, [results]);

    const overrideSentiment = useCallback(async (cardId: string, sentiment: SentimentType): Promise<void> => {
        const retroId = retroIdRef.current;
        const facilitatorId = getAuth().currentUser?.uid ?? '';
        // Optimistic update — bypass applyResult to avoid triggering saveResultWithHash,
        // which would race against saveOverride and clobber isOverride: true.
        const overrideResult: SentimentResult = { cardId, sentiment, confidence: 1, timestamp: new Date(), isOverride: true };
        setResults(prev => {
            const updated = new Map(prev);
            updated.set(cardId, overrideResult);
            return updated;
        });
        if (retroId) {
            await SentimentResultsService.saveOverride(retroId, cardId, sentiment, facilitatorId);
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
        getProgress,
        overrideSentiment,
    };
}
