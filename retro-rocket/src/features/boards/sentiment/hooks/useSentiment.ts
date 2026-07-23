import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '@/features/boards/types/card';
import {
    SentimentResult,
    SentimentConfiguration,
    DEFAULT_SENTIMENT_CONFIG,
    SentimentType,
    MODEL_VERSION,
    shouldShowSentimentBadge
} from '@/features/boards/types/sentiment';
import { useSentimentCache } from '@/features/boards/sentiment/hooks/useSentimentCache';
import { useWorkerManager, WorkerState } from '@/features/boards/sentiment/hooks/useWorkerManager';
import { useSentimentResults, isAnalyzableCard } from '@/features/boards/sentiment/hooks/useSentimentResults';
import { hashContent } from '@/features/boards/sentiment/domain/contentHash';
import { isFresh } from '@/features/boards/sentiment/domain/staleness';
import { isConfident } from '@/features/boards/sentiment/domain/confidence';

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

    const { scheduleAnalysis, clearAll: clearCache } = useSentimentCache();
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

    const configRef = useRef(config);
    useEffect(() => { configRef.current = config; }, [config]);

    // Tag each worker result with the card-text hash + active model identity so
    // staleness (F1) can be evaluated on the next load without re-inference.
    const enrich = useCallback((r: SentimentResult): SentimentResult => {
        const content = cardsRef.current.find(c => c.id === r.cardId)?.content ?? '';
        return {
            ...r,
            contentHash: hashContent(content),
            modelId: configRef.current.modelId,
            modelVersion: MODEL_VERSION,
        };
    }, []);

    const handleResult = useCallback((r: SentimentResult) => applyResult(enrich(r)), [applyResult, enrich]);
    const handleBatch = useCallback((rs: SentimentResult[]) => applyBatch(rs.map(enrich)), [applyBatch, enrich]);

    // Wire worker callbacks via refs — no worker recreation when callbacks change identity
    useEffect(() => {
        setHandlers(
            handleResult,
            handleBatch,
            (partial) => setWorkerState(prev => ({ ...prev, ...partial }))
        );
    }, [setHandlers, handleResult, handleBatch]);

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

    // A card needs (re)analysis unless a fresh (text + model) result or an override
    // already exists — this is what makes a warm reload perform zero re-inference (SC-002).
    const needsAnalysis = useCallback((card: Card): boolean => {
        if (!isAnalyzableCard(card)) return false;
        const existing = results.get(card.id);
        if (existing?.isOverride) return false;
        if (existing && isFresh(existing, card.content, config.modelId, MODEL_VERSION)) return false;
        return true;
    }, [results, config.modelId]);

    // Batch-analyze cards that need analysis when worker is ready or cards change
    useEffect(() => {
        if (!workerState.ready || !isEnabled) return;
        const unanalyzed = cards.filter(c =>
            !processingQueue.current.has(c.id) && needsAnalysis(c)
        );
        if (unanalyzed.length === 0) return;
        const id = setTimeout(() => {
            unanalyzed.forEach(c => processingQueue.current.add(c.id));
            dispatchInChunks(unanalyzed, config.batchSize, postBatch);
        }, 50);
        return () => clearTimeout(id);
    // Intentionally omit config.batchSize, postBatch, processingQueue — stable refs/callbacks;
    // including them would cause spurious re-analysis loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, workerState.ready, isEnabled, needsAnalysis]);

    const analyzeCard = useCallback((card: Card) => {
        if (!workerState.ready) return;
        if (processingQueue.current.has(card.id)) return;
        if (!needsAnalysis(card)) return;
        scheduleAnalysis(card.id, () => {
            processingQueue.current.add(card.id);
            postAnalyze(card.id, card.content);
        });
    }, [workerState.ready, processingQueue, needsAnalysis, scheduleAnalysis, postAnalyze]);

    const analyzeBatch = useCallback((cardsToAnalyze: Card[]) => {
        if (!workerState.ready) return;
        const valid = cardsToAnalyze.filter(c =>
            !processingQueue.current.has(c.id) && needsAnalysis(c)
        );
        if (valid.length === 0) return;
        valid.forEach(c => processingQueue.current.add(c.id));
        dispatchInChunks(valid, config.batchSize, postBatch);
    }, [workerState.ready, config.batchSize, processingQueue, needsAnalysis, postBatch]);

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
        [computeSentimentCounts, config]);

    const shouldShowBadge = useCallback((result: SentimentResult) =>
        shouldShowSentimentBadge(result, config),
        [config]);

    const filterCardsBySentiment = useCallback((
        cardsToFilter: Card[], sentimentFilter: SentimentType | 'all'
    ): Card[] => {
        if (sentimentFilter === 'all') return cardsToFilter;
        return cardsToFilter.filter(c => {
            if (!isAnalyzableCard(c)) return false;
            const r = results.get(c.id);
            return r !== undefined && isConfident(r, config) && r.sentiment === sentimentFilter;
        });
    }, [results, config]);

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
