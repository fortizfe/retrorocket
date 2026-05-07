import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '../types/card';
import {
    SentimentResult,
    SentimentConfiguration,
    DEFAULT_SENTIMENT_CONFIG,
    SentimentType,
    shouldShowSentimentBadge
} from '../types/sentiment';
import { useSentimentCache } from './useSentimentCache';
import { useWorkerManager, WorkerState } from './useWorkerManager';
import { useSentimentResults, isAnalyzableCard } from './useSentimentResults';

function dispatchInChunks(
    cards: Card[],
    batchSize: number,
    postBatch: (requests: { cardId: string; content: string }[]) => void
): void {
    for (let i = 0; i < cards.length; i += batchSize) {
        const chunk = cards.slice(i, i + batchSize);
        setTimeout(
            () => postBatch(chunk.map(c => ({ cardId: c.id, content: c.content }))),
            Math.floor(i / batchSize) * 100
        );
    }
}

export function useSentiment(cards: Card[], _retrospectiveId: string) {
    const [isEnabled, setIsEnabled] = useState(DEFAULT_SENTIMENT_CONFIG.enabled);
    const [workerState, setWorkerState] = useState<WorkerState>({ ready: false, loading: false, error: undefined });
    const [config, setConfig] = useState<SentimentConfiguration>(DEFAULT_SENTIMENT_CONFIG);

    const { hasChanged, markAnalyzed, scheduleAnalysis, clearAll: clearCache } = useSentimentCache();
    const { setHandlers, initialize, terminate, postAnalyze, postBatch } = useWorkerManager();
    const {
        applyResult,
        applyBatch,
        clearResults,
        results,
        processingQueue,
        getSentiment: getCardSentiment,
        getSentimentCounts: computeSentimentCounts,
        isProcessing: isCardProcessing,
        overrideSentiment,
    } = useSentimentResults(_retrospectiveId);

    const cardsRef = useRef(cards);
    useEffect(() => { cardsRef.current = cards; }, [cards]);

    // Wire worker callbacks via refs — no worker recreation when callbacks change identity
    useEffect(() => {
        setHandlers(
            applyResult,
            applyBatch,
            (partial) => setWorkerState(prev => ({ ...prev, ...partial }))
        );
    }, [setHandlers, applyResult, applyBatch]);

    // Manage worker lifecycle: initialize when enabled, terminate when disabled
    useEffect(() => {
        if (isEnabled) {
            initialize(config.modelId);
        } else {
            terminate();
            clearResults();
            clearCache();
        }
    }, [isEnabled, config.modelId, initialize, terminate, clearResults, clearCache]);

    // Batch-analyze cards that haven't been analyzed yet when worker is ready or cards change
    useEffect(() => {
        if (!workerState.ready || !isEnabled) return;
        const unanalyzed = cards.filter(c =>
            isAnalyzableCard(c) &&
            !processingQueue.current.has(c.id) &&
            !results.get(c.id)?.isOverride &&
            (hasChanged(c.id, c.content) || !results.has(c.id))
        );
        if (unanalyzed.length === 0) return;
        const id = setTimeout(() => {
            unanalyzed.forEach(c => {
                processingQueue.current.add(c.id);
                markAnalyzed(c.id, c.content);
            });
            dispatchInChunks(unanalyzed, config.batchSize, postBatch);
        }, 50);
        return () => clearTimeout(id);
    // Intentionally omit config.batchSize, hasChanged, markAnalyzed, postBatch, processingQueue
    // — they are stable refs/callbacks; including them would cause spurious re-analysis loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, workerState.ready, isEnabled, results]);

    const analyzeCard = useCallback((card: Card) => {
        if (!workerState.ready || !isAnalyzableCard(card)) return;
        if (processingQueue.current.has(card.id)) return;
        if (results.get(card.id)?.isOverride) return;
        if (!hasChanged(card.id, card.content) && results.has(card.id)) return;
        scheduleAnalysis(card.id, () => {
            processingQueue.current.add(card.id);
            markAnalyzed(card.id, card.content);
            postAnalyze(card.id, card.content);
        });
    }, [workerState.ready, processingQueue, hasChanged, results, scheduleAnalysis, markAnalyzed, postAnalyze]);

    const analyzeBatch = useCallback((cardsToAnalyze: Card[]) => {
        if (!workerState.ready) return;
        const valid = cardsToAnalyze
            .filter(isAnalyzableCard)
            .filter(c => !processingQueue.current.has(c.id) &&
                !results.get(c.id)?.isOverride &&
                (hasChanged(c.id, c.content) || !results.has(c.id)));
        if (valid.length === 0) return;
        valid.forEach(c => { processingQueue.current.add(c.id); markAnalyzed(c.id, c.content); });
        dispatchInChunks(valid, config.batchSize, postBatch);
    }, [workerState.ready, config.batchSize, processingQueue, hasChanged, results, markAnalyzed, postBatch]);

    const setEnabled = useCallback((enable: boolean) => {
        setIsEnabled(enable);
        setConfig(prev => ({ ...prev, enabled: enable }));
    }, []);

    const updateConfig = useCallback((updates: Partial<SentimentConfiguration>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    }, []);

    const getSentiment = useCallback((cardId: string) =>
        getCardSentiment(cardId), [getCardSentiment]);

    const getSentimentCounts = useCallback(() =>
        computeSentimentCounts(cardsRef.current, config),
        [computeSentimentCounts, config.threshold, config.thresholds]);

    const shouldShowBadge = useCallback((result: SentimentResult) =>
        shouldShowSentimentBadge(result, config),
        [config.threshold, config.thresholds]);

    const filterCardsBySentiment = useCallback((
        cardsToFilter: Card[], sentimentFilter: SentimentType | 'all'
    ): Card[] => {
        if (sentimentFilter === 'all') return cardsToFilter;
        return cardsToFilter.filter(c => {
            if (!isAnalyzableCard(c)) return false;
            const r = results.get(c.id);
            return r !== undefined && r.confidence >= config.threshold && r.sentiment === sentimentFilter;
        });
    }, [results, config.threshold]);

    const isProcessing = useCallback((cardId: string) =>
        isCardProcessing(cardId), [isCardProcessing]);

    return useMemo(() => ({
        enabled: isEnabled,
        ready: workerState.ready,
        loading: workerState.loading,
        error: workerState.error,
        config,
        results,
        getSentiment,
        getSentimentCounts,
        shouldShowBadge,
        setEnabled,
        updateConfig,
        analyzeCard,
        analyzeBatch,
        filterCardsBySentiment,
        isProcessing,
        overrideSentiment,
        shouldAnalyze: isAnalyzableCard,
    }), [
        isEnabled,
        workerState.ready,
        workerState.loading,
        workerState.error,
        config,
        results,
        getSentiment,
        getSentimentCounts,
        shouldShowBadge,
        setEnabled,
        updateConfig,
        analyzeCard,
        analyzeBatch,
        filterCardsBySentiment,
        isProcessing,
        overrideSentiment,
    ]);
}
