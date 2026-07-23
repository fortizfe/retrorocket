/**
 * Deterministic, framework-free content hash used by both the in-memory sentiment
 * cache and the Firestore persistence layer as the single source of truth for
 * detecting whether a card's text has changed (F1 / staleness).
 */
export function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}
