import { useRef, useEffect, useCallback } from 'react';

export function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

export interface SentimentCacheReturn {
    hasChanged: (cardId: string, content: string) => boolean;
    markAnalyzed: (cardId: string, content: string) => void;
    scheduleAnalysis: (cardId: string, analyze: () => void, delayMs?: number) => void;
    cancelPending: (cardId: string) => void;
    clearAll: () => void;
}

export function useSentimentCache(): SentimentCacheReturn {
    const contentHashCache = useRef<Map<string, string>>(new Map());
    const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        const timers = debounceTimers.current;
        return () => {
            timers.forEach(clearTimeout);
            timers.clear();
            contentHashCache.current.clear();
        };
    }, []);

    const hasChanged = useCallback((cardId: string, content: string): boolean => {
        return contentHashCache.current.get(cardId) !== hashContent(content);
    }, []);

    const markAnalyzed = useCallback((cardId: string, content: string): void => {
        contentHashCache.current.set(cardId, hashContent(content));
    }, []);

    const scheduleAnalysis = useCallback((cardId: string, analyze: () => void, delayMs = 300): void => {
        const existing = debounceTimers.current.get(cardId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
            debounceTimers.current.delete(cardId);
            analyze();
        }, delayMs);
        debounceTimers.current.set(cardId, timer);
    }, []);

    const cancelPending = useCallback((cardId: string): void => {
        const timer = debounceTimers.current.get(cardId);
        if (timer) {
            clearTimeout(timer);
            debounceTimers.current.delete(cardId);
        }
    }, []);

    const clearAll = useCallback((): void => {
        debounceTimers.current.forEach(clearTimeout);
        debounceTimers.current.clear();
        contentHashCache.current.clear();
    }, []);

    return { hasChanged, markAnalyzed, scheduleAnalysis, cancelPending, clearAll };
}
