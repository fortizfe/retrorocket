import { Card, GroupSuggestion } from '@/features/boards/types/card';
import { suggestGroupTitle } from '@/features/boards/clustering/services/groupTitleService';

/**
 * Requests a batch of embedding vectors, one per input card, paired by `cardId` — the
 * injected boundary this service depends on instead of a concrete worker, so it stays
 * unit-testable without a real model (`useEmbeddingWorkerManager.embed` satisfies this
 * shape in production). Must reject (not silently resolve to []) on failure, per
 * ai-grouping-service-contract.md.
 */
export type EmbeddingFetcher = (
    requests: { cardId: string; content: string }[]
) => Promise<{ cardId: string; vector: number[] }[]>;

export interface GroupingConfig {
    /** Minimum cosine similarity for two cards to be considered part of the same group. */
    threshold: number;
    /** Minimum cards for a cluster to become a suggestion. */
    minGroupSize: number;
    /** Maximum cards per suggested group (FR-005a). */
    maxGroupSize: number;
}

const DEFAULT_CONFIG: GroupingConfig = {
    threshold: 0.55,
    minGroupSize: 2,
    maxGroupSize: 8,
};

/**
 * Cosine similarity between two embedding vectors, clamped to `[0, 1]` (data-model.md).
 * Normalized sentence embeddings for related text are virtually always non-negative;
 * clamping defensively keeps the UI's 0-1 similarity badge meaningful either way.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    const raw = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, raw));
}

/**
 * Finds groups of semantically similar ungrouped cards within the same column, using
 * on-device AI embeddings instead of the removed text-similarity algorithm
 * (ai-grouping-service-contract.md). Reuses the same greedy-clustering shape the
 * removed `similarityService.ts` used (research.md §5) — only the pairwise similarity
 * function changed, from blended Levenshtein/Jaccard text scoring to embedding cosine
 * similarity.
 */
export async function findSemanticCardGroups(
    cards: Card[],
    embeddingFetcher: EmbeddingFetcher,
    config: Partial<GroupingConfig> = {}
): Promise<GroupSuggestion[]> {
    const finalConfig: GroupingConfig = { ...DEFAULT_CONFIG, ...config };

    const eligibleCards = cards.filter(card => !card.groupId);
    if (eligibleCards.length < finalConfig.minGroupSize) return [];

    const embeddings = await embeddingFetcher(
        eligibleCards.map(card => ({ cardId: card.id, content: card.content }))
    );
    const vectorByCardId = new Map(embeddings.map(e => [e.cardId, e.vector]));

    const suggestions: GroupSuggestion[] = [];
    const processedCards = new Set<string>();

    // Sort for consistent, deterministic processing order (mirrors similarityService.ts).
    const sortedCards = [...eligibleCards].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (let i = 0; i < sortedCards.length; i++) {
        const card1 = sortedCards[i];
        if (processedCards.has(card1.id)) continue;
        const vector1 = vectorByCardId.get(card1.id);
        if (!vector1) continue;

        const similarCards: Card[] = [card1];

        for (let j = i + 1; j < sortedCards.length; j++) {
            const card2 = sortedCards[j];
            if (processedCards.has(card2.id) || card2.column !== card1.column) continue;
            const vector2 = vectorByCardId.get(card2.id);
            if (!vector2) continue;

            if (cosineSimilarity(vector1, vector2) >= finalConfig.threshold) {
                similarCards.push(card2);
                if (similarCards.length >= finalConfig.maxGroupSize) break;
            }
        }

        if (similarCards.length >= finalConfig.minGroupSize) {
            let totalSimilarity = 0;
            let comparisons = 0;
            for (let x = 0; x < similarCards.length; x++) {
                for (let y = x + 1; y < similarCards.length; y++) {
                    const vx = vectorByCardId.get(similarCards[x].id)!;
                    const vy = vectorByCardId.get(similarCards[y].id)!;
                    totalSimilarity += cosineSimilarity(vx, vy);
                    comparisons++;
                }
            }

            suggestions.push({
                id: `suggestion_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                cardIds: similarCards.map(card => card.id),
                similarity: comparisons > 0 ? totalSimilarity / comparisons : 0,
                // spec 047 FR-001/FR-001a: derived synchronously, in-process — ready
                // together with the group itself, no extra async round-trip.
                suggestedTitle: suggestGroupTitle(similarCards),
            });

            similarCards.forEach(card => processedCards.add(card.id));
        }
    }

    return suggestions.sort((a, b) => b.similarity - a.similarity);
}
