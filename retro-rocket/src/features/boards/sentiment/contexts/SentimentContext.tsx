import { useState, useCallback, ReactNode } from 'react';
import {
    SentimentContextValue,
    SentimentContext,
    SentimentSetter,
    SentimentSetterContext,
    DISABLED_CONTEXT,
} from '@/features/boards/sentiment/contexts/useSentimentContext';

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
    const setter = useCallback<SentimentSetter>((v) => setValue(v), []);
    return (
        <SentimentSetterContext.Provider value={setter}>
            <SentimentContext.Provider value={contextValue}>
                {children}
            </SentimentContext.Provider>
        </SentimentSetterContext.Provider>
    );
}
