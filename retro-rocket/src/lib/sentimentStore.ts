// Lightweight in-memory store with simple pub/sub to share sentimentAnalysis
// between components that are not direct parents/children (e.g. Board -> Topbar).

const store = new Map<string, any | null>();
const listeners: Set<(retrospectiveId: string) => void> = new Set();

export function setSentimentFor(retrospectiveId: string, payload: any | null) {
    store.set(retrospectiveId, payload);
    // notify listeners
    listeners.forEach((l) => l(retrospectiveId));
}

export function getSentimentFor(retrospectiveId: string) {
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
