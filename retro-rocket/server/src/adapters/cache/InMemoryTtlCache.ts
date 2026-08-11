/**
 * Generic per-instance, in-memory TTL cache (feature 040). Backs
 * FirestoreProfileAdapter's ensureProfile() to eliminate redundant Firestore reads
 * within a short window (FR-002/FR-003) without requiring cross-instance consistency
 * (research.md §2) — each backend instance simply caches independently.
 */
export class InMemoryTtlCache<K, V> {
    private readonly entries = new Map<K, { value: V; expiresAt: number }>();
    private readonly now: () => number;

    constructor(options: { now?: () => number } = {}) {
        this.now = options.now ?? Date.now;
    }

    get(key: K): V | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (this.now() >= entry.expiresAt) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key: K, value: V, ttlMs: number): void {
        this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    }

    delete(key: K): void {
        this.entries.delete(key);
    }
}
