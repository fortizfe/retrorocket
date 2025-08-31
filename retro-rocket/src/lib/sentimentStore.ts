// Typed lightweight in-memory store with pub/sub to share sentimentAnalysis
// between components that are not direct parents/children (e.g. Board -> Topbar).

export interface SentimentStorePayload {
    // from useSentiment hook
    enabled?: boolean;
    ready?: boolean;
    loading?: boolean;
    error?: string | null;
    config?: any;
    results?: Map<string, any>;

    // Additional context published by the board
    columnConfigs?: Record<string, any>;
    cards?: any[];
    groups?: any[];
    actionItems?: any[];

    // Metadata to help consumers avoid partial reads
    version?: number; // monotonically increasing or timestamp
}

const store = new Map<string, SentimentStorePayload | null>();
const listeners: Set<(retrospectiveId: string) => void> = new Set();

export function setSentimentFor(retrospectiveId: string, payload: SentimentStorePayload | null) {
    // Normalize metadata: ensure version exists when setting a non-null payload
    const normalized = payload ? { ...payload, version: payload.version ?? Date.now() } : null;
    store.set(retrospectiveId, normalized);
    // notify listeners
    listeners.forEach((l) => l(retrospectiveId));
}

export function getSentimentFor(retrospectiveId: string): SentimentStorePayload | null {
    return store.get(retrospectiveId) ?? null;
}

export function subscribeSentimentUpdates(listener: (retrospectiveId: string) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export default {
    setSentimentFor,
    getSentimentFor,
    subscribeSentimentUpdates
};
