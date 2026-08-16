import { describe, it, expect, vi } from 'vitest';
import { findSemanticCardGroups, cosineSimilarity, type EmbeddingFetcher } from '@/features/boards/clustering/services/semanticGroupingService';
import { Card } from '@/features/boards/types/card';

function makeCard(overrides: Partial<Card> & { id: string }): Card {
    return {
        content: 'content',
        column: 'helped',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'retro-1',
        order: 0,
        votes: 0,
        color: 'pastelBlue',
        likes: [],
        reactions: [],
        ...overrides,
    };
}

/** A fetcher that returns hand-picked vectors per cardId, so similarity is fully
 * deterministic and under test control — no real model, no real worker. */
function fakeFetcher(vectors: Record<string, number[]>): EmbeddingFetcher {
    return async (requests) => requests.map(r => ({ cardId: r.cardId, vector: vectors[r.cardId] ?? [0, 0] }));
}

describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
        expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });

    it('clamps a negative raw cosine similarity to 0 (data-model.md)', () => {
        expect(cosineSimilarity([1, 0], [-1, 0])).toBe(0);
    });

    it('returns 0 for a zero vector rather than dividing by zero', () => {
        expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
});

describe('findSemanticCardGroups (ai-grouping-service-contract.md)', () => {
    it('groups cards whose embeddings are similar (at/above threshold)', async () => {
        const cards = [
            makeCard({ id: 'a', content: 'necesitamos mejorar la comunicación' }),
            makeCard({ id: 'b', content: 'deberíamos comunicarnos mejor' }),
            makeCard({ id: 'c', content: 'añadir más pruebas automatizadas' }),
        ];
        const fetcher = fakeFetcher({
            a: [1, 0, 0],
            b: [0.95, 0.05, 0],   // near-identical to a → similar
            c: [0, 1, 0],          // orthogonal to a/b → unrelated
        });

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.8, minGroupSize: 2, maxGroupSize: 8 });

        expect(suggestions).toHaveLength(1);
        expect(new Set(suggestions[0].cardIds)).toEqual(new Set(['a', 'b']));
    });

    it('populates a non-empty, <=35-char suggestedTitle on every returned suggestion (spec 047 FR-001)', async () => {
        const cards = [
            makeCard({ id: 'a', content: 'necesitamos mejorar la comunicación del equipo' }),
            makeCard({ id: 'b', content: 'deberíamos comunicarnos mejor como equipo' }),
        ];
        const fetcher = fakeFetcher({ a: [1, 0], b: [0.99, 0.01] });

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.8, minGroupSize: 2 });

        expect(suggestions).toHaveLength(1);
        expect(typeof suggestions[0].suggestedTitle).toBe('string');
        expect(suggestions[0].suggestedTitle.length).toBeGreaterThan(0);
        expect(suggestions[0].suggestedTitle.length).toBeLessThanOrEqual(35);
    });

    it('does not group cards on clearly unrelated topics', async () => {
        const cards = [
            makeCard({ id: 'a', content: 'topic one' }),
            makeCard({ id: 'b', content: 'topic two' }),
        ];
        const fetcher = fakeFetcher({ a: [1, 0], b: [0, 1] });

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.6 });
        expect(suggestions).toHaveLength(0);
    });

    it('only groups cards within the same column (FR-006)', async () => {
        const cards = [
            makeCard({ id: 'a', content: 'x', column: 'helped' }),
            makeCard({ id: 'b', content: 'x', column: 'hindered' }),
        ];
        const fetcher = fakeFetcher({ a: [1, 0], b: [1, 0] }); // identical vectors, different columns

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.5 });
        expect(suggestions).toHaveLength(0);
    });

    it('caps a group at maxGroupSize (FR-005a)', async () => {
        // 4 mutually similar cards with maxGroupSize=3: the first 3 fill the capped
        // group; the 4th is left alone and excluded (a lone card can't meet
        // minGroupSize=2), so this must produce exactly one 3-card group — not a
        // second, smaller group from the leftover card.
        const cards = Array.from({ length: 4 }, (_, i) => makeCard({ id: `c${i}`, content: 'similar' }));
        const vectors = Object.fromEntries(cards.map(c => [c.id, [1, 0]]));
        const fetcher = fakeFetcher(vectors);

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.5, minGroupSize: 2, maxGroupSize: 3 });
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].cardIds).toHaveLength(3);
    });

    it('does not propose a group smaller than minGroupSize', async () => {
        const cards = [
            makeCard({ id: 'a', content: 'x' }),
            makeCard({ id: 'b', content: 'y' }),
        ];
        const fetcher = fakeFetcher({ a: [1, 0], b: [0, 1] }); // dissimilar → no group of 2

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.9, minGroupSize: 2 });
        expect(suggestions).toHaveLength(0);
    });

    it('excludes cards that already belong to a group', async () => {
        const cards = [
            makeCard({ id: 'a', content: 'x', groupId: 'existing-group' }),
            makeCard({ id: 'b', content: 'x' }),
            makeCard({ id: 'c', content: 'x' }),
        ];
        const fetcher = fakeFetcher({ a: [1, 0], b: [1, 0], c: [1, 0] });

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.5 });
        // Only b+c are eligible; a (already grouped) must never appear.
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].cardIds).not.toContain('a');
        expect(new Set(suggestions[0].cardIds)).toEqual(new Set(['b', 'c']));
    });

    it('resolves to an empty array when there are too few eligible cards, without calling the embedding fetcher', async () => {
        const cards = [makeCard({ id: 'a', content: 'lonely card' })];
        const fetcher = vi.fn(fakeFetcher({ a: [1, 0] }));

        const suggestions = await findSemanticCardGroups(cards, fetcher, { minGroupSize: 2 });
        expect(suggestions).toEqual([]);
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('rejects (does not silently resolve to []) when the embedding fetcher errors, so callers can distinguish "unavailable" from "nothing similar"', async () => {
        const cards = [
            makeCard({ id: 'a', content: 'x' }),
            makeCard({ id: 'b', content: 'y' }),
        ];
        const failingFetcher: EmbeddingFetcher = async () => { throw new Error('embedding worker unavailable'); };

        await expect(findSemanticCardGroups(cards, failingFetcher)).rejects.toThrow('embedding worker unavailable');
    });

    it('same-language grouping quality: Spanish-only and English-only fixtures each cluster correctly within their own language (FR-006a)', async () => {
        const cards = [
            makeCard({ id: 'es1', content: 'necesitamos mejorar la comunicación del equipo' }),
            makeCard({ id: 'es2', content: 'deberíamos comunicarnos mejor como equipo' }),
            makeCard({ id: 'en1', content: 'we should improve team communication' }),
            makeCard({ id: 'en2', content: 'better communication across the team is needed' }),
        ];
        // No claim is made about cross-language similarity here — only that each
        // same-language pair clusters correctly (spec.md's clarification: cross-language
        // matching is explicitly not required).
        const fetcher = fakeFetcher({
            es1: [1, 0, 0, 0],
            es2: [0.97, 0.03, 0, 0],
            en1: [0, 0, 1, 0],
            en2: [0, 0, 0.96, 0.04],
        });

        const suggestions = await findSemanticCardGroups(cards, fetcher, { threshold: 0.8, minGroupSize: 2 });

        expect(suggestions).toHaveLength(2);
        const groups = suggestions.map(s => new Set(s.cardIds));
        expect(groups).toContainEqual(new Set(['es1', 'es2']));
        expect(groups).toContainEqual(new Set(['en1', 'en2']));
    });
});
