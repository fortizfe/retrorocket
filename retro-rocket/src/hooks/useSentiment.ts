import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '../types/card';
import {
    SentimentAnalysisState,
    SentimentResult,
    SentimentConfiguration,
    DEFAULT_SENTIMENT_CONFIG,
    SentimentType,
    shouldShowSentimentBadge
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

    // Stable reference to cards to prevent hook recreation
    const cardsMapRef = useRef<Map<string, Card>>(new Map());
    const [updateTrigger, setUpdateTrigger] = useState(0);

    // Update cards map when cards change, but don't recreate hook
    useEffect(() => {
        const newCardsMap = new Map(cards.map(card => [card.id, card]));
        cardsMapRef.current = newCardsMap;
        setUpdateTrigger(prev => prev + 1); // Force update for getSentimentCounts
    }, [cards]);

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
                                // Check if the result is actually different to avoid unnecessary updates
                                const existingResult = prev.results.get(data.cardId);
                                const newResult = {
                                    ...data,
                                    timestamp: new Date(data.timestamp)
                                };

                                if (existingResult &&
                                    existingResult.sentiment === newResult.sentiment &&
                                    Math.abs(existingResult.confidence - newResult.confidence) < 0.01) {
                                    // Result hasn't changed meaningfully, just clean up processing queue
                                    processingQueue.current.delete(data.cardId);
                                    return prev;
                                }

                                const newResults = new Map(prev.results);
                                newResults.set(data.cardId, newResult);
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
                            setState(prev => {
                                const newResults = new Map(prev.results);
                                let hasChanges = false;

                                for (const result of data.results) {
                                    const existingResult = newResults.get(result.cardId);
                                    const newResult = {
                                        ...result,
                                        timestamp: new Date(result.timestamp)
                                    };

                                    // Only update if result is meaningfully different
                                    if (!existingResult ||
                                        existingResult.sentiment !== newResult.sentiment ||
                                        Math.abs(existingResult.confidence - newResult.confidence) >= 0.01) {
                                        newResults.set(result.cardId, newResult);
                                        hasChanges = true;
                                    }

                                    processingQueue.current.delete(result.cardId);
                                }

                                return hasChanges ? {
                                    ...prev,
                                    results: newResults
                                } : prev;
                            });
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
            // Clear results when disabled
            setState(prev => ({ ...prev, results: new Map() }));
            cleanupWorker();
        } else {
            // When enabling, trigger initialization after a short delay
            setTimeout(() => {
                if (workerRef.current === null) {
                    initializeWorker();
                }
            }, 100);
        }
    }, [cleanupWorker, initializeWorker]);

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
    }, [state.enabled, config.enabled, initializeWorker, cleanupWorker]);    // Auto-analyze new cards - using stable references to prevent flicker
    useEffect(() => {
        if (!state.ready || !state.enabled) {
            return;
        }

        // Get current cards from stable reference
        const currentCards = Array.from(cardsMapRef.current.values());

        // Only analyze when there are actually new cards
        const needsAnalysis = currentCards.some(card =>
            shouldAnalyzeCard(card) && !state.results.has(card.id)
        );

        if (needsAnalysis) {
            // Use a shorter delay to minimize flicker
            const timeoutId = setTimeout(() => {
                const cardsToAnalyze = Array.from(cardsMapRef.current.values());
                const unanalyzedCards = cardsToAnalyze.filter(card =>
                    shouldAnalyzeCard(card) && !state.results.has(card.id)
                );

                if (unanalyzedCards.length > 0) {
                    analyzeBatch(unanalyzedCards);
                }
            }, 50);

            return () => clearTimeout(timeoutId);
        }
    }, [updateTrigger, state.ready, state.enabled, state.results.size]); // Stable dependencies

    // Cleanup on unmount
    useEffect(() => {
        return cleanupWorker;
    }, [cleanupWorker]);

    // Memoize utility functions to prevent recreations
    const isProcessing = useCallback((cardId: string) => processingQueue.current.has(cardId), []);

    // Memoize shouldShowBadge function
    const shouldShowBadge = useCallback((result: SentimentResult): boolean => {
        return shouldShowSentimentBadge(result, config);
    }, [config.threshold, config.thresholds]);

    // Memoize getSentiment function with results.size for stable reference
    const getSentiment = useCallback((cardId: string): SentimentResult | undefined =>
        state.results.get(cardId), [state.results.size]);

    // Memoize getSentimentCounts function with results.size instead of the Map
    const getSentimentCounts = useCallback(() => {
        const counts = { positive: 0, negative: 0, neutral: 0, total: 0 };
        Array.from(cardsMapRef.current.values()).forEach(card => {
            if (!shouldAnalyzeCard(card)) return;
            const result = state.results.get(card.id);
            if (result && shouldShowSentimentBadge(result, config)) {
                counts[result.sentiment]++;
            }
            counts.total++;
        });
        return counts;
    }, [state.results.size, config.threshold, config.thresholds]);    // Memoize the return object with minimal dependencies to prevent recreations
    const hookResult = useMemo(() => {
        const result = {
            // State
            enabled: state.enabled,
            ready: state.ready,
            loading: state.loading,
            error: state.error,
            config,

            // Results - use memoized functions
            results: state.results,
            getSentiment,
            getSentimentCounts,
            shouldShowBadge,

            // Actions and utilities - these are stable
            setEnabled,
            updateConfig,
            analyzeCard,
            analyzeBatch,
            filterCardsBySentiment,
            isProcessing,
            shouldAnalyze: shouldAnalyzeCard
        };

        return result;
    }, [
        state.enabled,
        state.ready,
        state.loading,
        state.error,
        state.results.size, // Use size instead of the Map itself to reduce re-renders
        config.threshold,
        config.enabled,
        config.modelId,
        config.thresholds,
        getSentiment,
        getSentimentCounts,
        shouldShowBadge,
        setEnabled,
        updateConfig,
        analyzeCard,
        analyzeBatch,
        filterCardsBySentiment,
        isProcessing,
        updateTrigger // Include to trigger updates when cards change
    ]);

    return hookResult;
}
