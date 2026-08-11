import { describe, it, expect, vi, afterEach } from 'vitest';
import { InMemoryTtlCache } from '../../../src/adapters/cache/InMemoryTtlCache';

// Generic per-instance TTL cache (feature 040) fronting FirestoreProfileAdapter's
// ensureProfile() to eliminate redundant reads within a 60s window (FR-003) and,
// trivially, within a single request cycle (FR-002). Pure in-memory logic — no
// Firestore/external dependency — so it is fully unit-tested here, unlike the
// adapters that wire it in (exercised by the Playwright E2E suite instead).

afterEach(() => {
    vi.useRealTimers();
});

describe('InMemoryTtlCache', () => {
    it('returns undefined for a never-set key', () => {
        const cache = new InMemoryTtlCache<string, string>();
        expect(cache.get('missing')).toBeUndefined();
    });

    it('returns the cached value while now < expiresAt', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const cache = new InMemoryTtlCache<string, string>();
        cache.set('u1', 'Alice', 60_000);

        vi.setSystemTime(59_999);
        expect(cache.get('u1')).toBe('Alice');
    });

    it('returns undefined once the TTL has elapsed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const cache = new InMemoryTtlCache<string, string>();
        cache.set('u1', 'Alice', 60_000);

        vi.setSystemTime(60_000);
        expect(cache.get('u1')).toBeUndefined();
    });

    it('set() overwrites an existing entry\'s value and TTL', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const cache = new InMemoryTtlCache<string, string>();
        cache.set('u1', 'Alice', 60_000);
        cache.set('u1', 'Alice Renamed', 60_000);

        vi.setSystemTime(1_000);
        expect(cache.get('u1')).toBe('Alice Renamed');

        // The TTL window is measured from the *second* set(), not the first.
        vi.setSystemTime(60_500);
        expect(cache.get('u1')).toBeUndefined();
    });

    it('delete() removes an entry immediately regardless of remaining TTL', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const cache = new InMemoryTtlCache<string, string>();
        cache.set('u1', 'Alice', 60_000);

        cache.delete('u1');

        expect(cache.get('u1')).toBeUndefined();
    });

    it('delete() on a never-set key is a safe no-op', () => {
        const cache = new InMemoryTtlCache<string, string>();
        expect(() => cache.delete('missing')).not.toThrow();
    });

    it('tracks multiple keys independently', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const cache = new InMemoryTtlCache<string, string>();
        cache.set('u1', 'Alice', 60_000);
        cache.set('u2', 'Bob', 60_000);

        cache.delete('u1');

        expect(cache.get('u1')).toBeUndefined();
        expect(cache.get('u2')).toBe('Bob');
    });

    it('uses an injected clock instead of Date.now when provided', () => {
        let now = 0;
        const cache = new InMemoryTtlCache<string, string>({ now: () => now });
        cache.set('u1', 'Alice', 60_000);

        now = 59_999;
        expect(cache.get('u1')).toBe('Alice');

        now = 60_000;
        expect(cache.get('u1')).toBeUndefined();
    });
});
