import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '../types/card';
import {
    SentimentAnalysisState,
    SentimentResult,
    SentimentConfiguration,
    DEFAULT_SENTIMENT_CONFIG,
    SentimentType
} from '../types/sentiment';

// Cache for analyzed content to avoid reprocessing
const contentHashCache = new Map<string, string>();
const debounceTimers = new Map<string, NodeJS.Timeout>();

// Generate simple hash for content to detect changes
function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

// Check if card should be analyzed (exclude action items)
function shouldAnalyzeCard(card: Card): boolean {
    return card.column !== 'actions' &&
        card.content.trim().length >= 3;
}

export function useSentiment(cards: Card[], retrospectiveId: string) {
    const [state, setState] = useState<SentimentAnalysisState>({
        enabled: DEFAULT_SENTIMENT_CONFIG.enabled,
        loading: false,
        ready: false,
        results: new Map(),
        error: undefined
    });

    const [config, setConfig] = useState<SentimentConfiguration>(DEFAULT_SENTIMENT_CONFIG);
    const workerRef = useRef<Worker | null>(null);
    const processingQueue = useRef<Set<string>>(new Set());

    // Initialize worker
    const initializeWorker = useCallback(async () => {
        // Prevent multiple initializations
        if (workerRef.current || !state.enabled) {
            return;
        }

        try {
            setState(prev => ({ ...prev, loading: true, ready: false, error: undefined }));

            // Create worker from the TypeScript file
            workerRef.current = new Worker(
                new URL('../workers/sentimentWorker.ts', import.meta.url),
                { type: 'module' }
            );

            workerRef.current.onmessage = (event) => {
                const { type, data } = event.data;

                switch (type) {
                    case 'loading':
                        setState(prev => ({
                            ...prev,
                            loading: true,
                            ready: false,
                            error: undefined
                        }));
                        break;

                    case 'ready':
                        setState(prev => ({
                            ...prev,
                            ready: true,
                            loading: false,
                            error: undefined
                        }));
                        break;

                    case 'result':
                        if (data.cardId) {
                            setState(prev => {
                                const newResults = new Map(prev.results);
                                newResults.set(data.cardId, {
                                    ...data,
                                    timestamp: new Date(data.timestamp)
                                });
                                processingQueue.current.delete(data.cardId);
                                return {
                                    ...prev,
                                    results: newResults
                                };
                            });
                        }
                        break;

                    case 'batch_result':
                        if (data.results) {
                            const newResults = new Map(state.results);
                            for (const result of data.results) {
                                newResults.set(result.cardId, {
                                    ...result,
                                    timestamp: new Date(result.timestamp)
                                });
                                processingQueue.current.delete(result.cardId);
                            }
                            setState(prev => ({
                                ...prev,
                                results: newResults
                            }));
                        }
                        break;

                    case 'error':
                        setState(prev => ({
                            ...prev,
                            loading: false,
                            error: data.error,
                            ready: false
                        }));
                        if (data.cardId) {
                            processingQueue.current.delete(data.cardId);
                        }
                        break;
                }
            };

            workerRef.current.onerror = (error) => {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Worker failed to initialize',
                    ready: false
                }));
            };

            // Initialize with primary model
            setState(prev => ({ ...prev, loading: true }));
            workerRef.current.postMessage({
                id: 'init',
                type: 'init',
                data: { modelId: config.modelId }
            });

        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : String(error),
                ready: false
            }));
        }
    }, [state.enabled, config.modelId]);

    // Cleanup worker
    const cleanupWorker = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        processingQueue.current.clear();
        // Clear debounce timers
        debounceTimers.forEach(timer => clearTimeout(timer));
        debounceTimers.clear();
    }, []);

    // Analyze single card with debouncing
    const analyzeCard = useCallback((card: Card) => {
        if (!state.ready || !shouldAnalyzeCard(card) || processingQueue.current.has(card.id)) {
            return;
        }

        // Check if content has changed
        const contentHash = hashContent(card.content);
        const cachedHash = contentHashCache.get(card.id);

        if (cachedHash === contentHash && state.results.has(card.id)) {
            return; // Already analyzed and content hasn't changed
        }

        // Clear existing debounce timer
        const existingTimer = debounceTimers.get(card.id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Debounce analysis to avoid excessive processing
        const timer = setTimeout(() => {
            if (!workerRef.current || !state.ready) return;

            processingQueue.current.add(card.id);
            contentHashCache.set(card.id, contentHash);

            workerRef.current.postMessage({
                id: card.id,
                type: 'analyze',
                data: {
                    cardId: card.id,
                    content: card.content
                }
            });

            debounceTimers.delete(card.id);
        }, 300);

        debounceTimers.set(card.id, timer);
    }, [state.ready, state.results]);

    // Analyze multiple cards in batch
    const analyzeBatch = useCallback((cardsToAnalyze: Card[]) => {
        if (!state.ready || !workerRef.current) {
            return;
        }

        const validCards = cardsToAnalyze
            .filter(shouldAnalyzeCard)
            .filter(card => {
                // Skip if already processing or recently analyzed
                if (processingQueue.current.has(card.id)) return false;

                const contentHash = hashContent(card.content);
                const cachedHash = contentHashCache.get(card.id);
                return cachedHash !== contentHash || !state.results.has(card.id);
            });

        if (validCards.length === 0) return;

        // Mark cards as processing
        validCards.forEach(card => {
            processingQueue.current.add(card.id);
            contentHashCache.set(card.id, hashContent(card.content));
        });

        // Process in chunks
        const chunks = [];
        for (let i = 0; i < validCards.length; i += config.batchSize) {
            chunks.push(validCards.slice(i, i + config.batchSize));
        }

        const createRequests = (cards: Card[]) => cards.map(card => ({
            cardId: card.id,
            content: card.content
        }));

        chunks.forEach((chunk, index) => {
            setTimeout(() => {
                if (!workerRef.current) return;

                workerRef.current.postMessage({
                    id: `batch-${index}`,
                    type: 'batch_analyze',
                    data: {
                        requests: createRequests(chunk)
                    }
                });
            }, index * 100); // Small delay between chunks
        });
    }, [state.ready, state.results, config.batchSize]);

    // Get sentiment result for a card
    const getSentiment = useCallback((cardId: string): SentimentResult | undefined => {
        return state.results.get(cardId);
    }, [state.results]);

    // Get sentiment counts for filtering
    const getSentimentCounts = useCallback(() => {
        const counts = { positive: 0, negative: 0, neutral: 0, total: 0 };

        cards.forEach(card => {
            if (!shouldAnalyzeCard(card)) return;

            const result = state.results.get(card.id);
            if (result && result.confidence >= config.threshold) {
                counts[result.sentiment]++;
            }
            counts.total++;
        });

        return counts;
    }, [cards, state.results, config.threshold]);

    // Filter cards by sentiment
    const filterCardsBySentiment = useCallback((
        cardsToFilter: Card[],
        sentimentFilter: SentimentType | 'all'
    ): Card[] => {
        if (sentimentFilter === 'all') return cardsToFilter;

        return cardsToFilter.filter(card => {
            if (!shouldAnalyzeCard(card)) return false;

            const result = state.results.get(card.id);
            return result &&
                result.confidence >= config.threshold &&
                result.sentiment === sentimentFilter;
        });
    }, [state.results, config.threshold]);

    // Enable/disable sentiment analysis
    const setEnabled = useCallback((enable: boolean) => {
        setState(prev => ({ ...prev, enabled: enable }));
        setConfig(prev => ({ ...prev, enabled: enable }));

        if (!enable) {
            cleanupWorker();
        }
    }, [cleanupWorker]);

    // Update configuration
    const updateConfig = useCallback((updates: Partial<SentimentConfiguration>) => {
        setConfig(prev => ({ ...prev, ...updates }));

        // Reinitialize worker if model changed
        if (updates.modelId && updates.modelId !== config.modelId) {
            cleanupWorker();
            if (state.enabled) {
                setTimeout(initializeWorker, 100);
            }
        }
    }, [config.modelId, state.enabled, cleanupWorker, initializeWorker]);

    // Initialize worker when enabled
    useEffect(() => {
        if (state.enabled && config.enabled && !workerRef.current) {
            initializeWorker();
        }
        return () => {
            if (!state.enabled || !config.enabled) {
                cleanupWorker();
            }
        };
    }, [state.enabled, config.enabled, initializeWorker, cleanupWorker]);    // Auto-analyze new cards - only when truly ready
    useEffect(() => {
        // Wait a bit after ready to ensure everything is settled
        if (!state.ready || !state.enabled) {
            return;
        }

        const timeoutId = setTimeout(() => {
            // Double check we're still ready and enabled
            if (!state.ready || !state.enabled) return;

            // Batch analyze all unanalyzed cards on startup
            const unanalyzedCards = cards.filter(card =>
                shouldAnalyzeCard(card) && !state.results.has(card.id)
            );

            if (unanalyzedCards.length > 0) {
                analyzeBatch(unanalyzedCards);
            }
        }, 500); // Wait 500ms after ready to ensure worker is fully initialized

        return () => clearTimeout(timeoutId);
    }, [cards, state.ready, state.enabled, analyzeBatch, state.results]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanupWorker;
    }, [cleanupWorker]);

    // Memoize utility functions to prevent recreations
    const isProcessing = useCallback((cardId: string) => processingQueue.current.has(cardId), []);

    // Memoize the return object to prevent unnecessary re-renders
    // Only recreate when absolutely essential properties change
    return useMemo(() => ({
        // State
        enabled: state.enabled,
        ready: state.ready,
        loading: state.loading,
        error: state.error,
        config,

        // Results
        results: state.results,
        getSentiment,
        getSentimentCounts,

        // Actions  
        setEnabled,
        updateConfig,
        analyzeCard,
        analyzeBatch,
        filterCardsBySentiment,

        // Utilities
        isProcessing,
        shouldAnalyze: shouldAnalyzeCard
    }), [
        state.enabled, // Critical - controls badge visibility  
        state.ready,   // Critical - controls when badges appear
        // Note: Deliberately minimal dependencies to prevent constant recreations
        // All functions use useCallback with stable dependencies
    ]);
}
