import { createContext, useContext } from 'react';
import { SentimentResult, SentimentConfiguration, SentimentType, DEFAULT_SENTIMENT_CONFIG } from '@/features/boards/types/sentiment';
import { Card } from '@/features/boards/types/card';
import { SentimentCounts } from '@/features/boards/sentiment/hooks/useSentimentResults';

export interface SentimentContextValue {
    // Worker state
    enabled: boolean;
    ready: boolean;
    loading: boolean;
    error: string | undefined;
    config: SentimentConfiguration;
    // Results
    results: ReadonlyMap<string, SentimentResult>;
    getSentiment: (cardId: string) => SentimentResult | undefined;
    getSentimentCounts: () => SentimentCounts;
    shouldShowBadge: (result: SentimentResult) => boolean;
    isProcessing: (cardId: string) => boolean;
    // Analysis triggers
    analyzeCard: (card: Card) => void;
    analyzeBatch: (cards: Card[]) => void;
    filterCardsBySentiment: (cards: Card[], filter: SentimentType | 'all') => Card[];
    shouldAnalyze: (card: Card) => boolean;
    // Configuration (facilitator only)
    setEnabled: (enable: boolean) => void;
    updateConfig: (updates: Partial<SentimentConfiguration>) => void;
    overrideSentiment: (cardId: string, sentiment: SentimentType) => Promise<void>;
}

export const DISABLED_CONTEXT: SentimentContextValue = {
    enabled: false,
    ready: false,
    loading: false,
    error: undefined,
    config: DEFAULT_SENTIMENT_CONFIG,
    results: new Map(),
    getSentiment: () => undefined,
    getSentimentCounts: () => ({ positive: 0, negative: 0, neutral: 0, total: 0 }),
    shouldShowBadge: () => false,
    isProcessing: () => false,
    analyzeCard: () => {},
    analyzeBatch: () => {},
    filterCardsBySentiment: (cards) => cards,
    shouldAnalyze: () => false,
    setEnabled: () => {},
    updateConfig: () => {},
    overrideSentiment: () => Promise.resolve(),
};

// Read context — defaults to disabled state so callers outside a Provider still work.
export const SentimentContext = createContext<SentimentContextValue>(DISABLED_CONTEXT);

// Write context — used by RetrospectiveBoard to push its useSentiment value into the store.
export type SentimentSetter = (value: SentimentContextValue | null) => void;
export const SentimentSetterContext = createContext<SentimentSetter>(() => {});

/** Read the active sentiment context. Returns the disabled default when no board is mounted. */
export function useSentimentContext(): SentimentContextValue {
    return useContext(SentimentContext);
}

/** Used by RetrospectiveBoard to register/unregister the live sentiment analysis value. */
export function useSentimentSetter(): SentimentSetter {
    return useContext(SentimentSetterContext);
}
