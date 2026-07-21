import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

const DISABLED_CONTEXT: SentimentContextValue = {
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
type SentimentSetter = (value: SentimentContextValue | null) => void;
const SentimentSetterContext = createContext<SentimentSetter>(() => {});

/**
 * Place this Provider above both the Header (which contains RetrospectiveTopbar) and the page
 * content (which contains RetrospectiveBoard). RetrospectiveBoard writes via useSentimentSetter;
 * any descendant reads via useSentimentContext.
 */
export function SentimentStoreProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [value, setValue] = useState<SentimentContextValue | null>(null);
    // valueOf null means no board is active — fall back to the disabled default.
    const contextValue = value ?? DISABLED_CONTEXT;
    // useState setter is stable; no need to wrap it.
    const setter = useCallback((v: SentimentContextValue | null) => setValue(v), []);
    return (
        <SentimentSetterContext.Provider value={setter}>
            <SentimentContext.Provider value={contextValue}>
                {children}
            </SentimentContext.Provider>
        </SentimentSetterContext.Provider>
    );
}

/** Read the active sentiment context. Returns the disabled default when no board is mounted. */
export function useSentimentContext(): SentimentContextValue {
    return useContext(SentimentContext);
}

/** Used by RetrospectiveBoard to register/unregister the live sentiment analysis value. */
export function useSentimentSetter(): SentimentSetter {
    return useContext(SentimentSetterContext);
}
