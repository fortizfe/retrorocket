import { Card, GroupSuggestion, SimilarityAlgorithm } from '../types/card';

/**
 * Configuration for similarity detection
 */
export interface SimilarityConfig {
    algorithm: SimilarityAlgorithm;
    threshold: number;          // Minimum similarity score (0-1)
    minGroupSize: number;       // Minimum cards per group
    maxGroupSize: number;       // Maximum cards per group
    excludeKeywords?: string[]; // Keywords to ignore
}

const DEFAULT_CONFIG: SimilarityConfig = {
    algorithm: 'combined',
    threshold: 0.6,
    minGroupSize: 2,
    maxGroupSize: 8,
    excludeKeywords: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
        matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
        matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + substitutionCost // substitution
            );
        }
    }

    return matrix[str2.length][str1.length];
};

/**
 * Calculate normalized Levenshtein similarity (0-1)
 */
const levenshteinSimilarity = (str1: string, str2: string): number => {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return (maxLength - distance) / maxLength;
};

/**
 * Extract meaningful keywords from text
 */
const extractKeywords = (text: string, excludeWords: string[] = []): string[] => {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length >= 3) // Minimum word length
        .filter(word => !excludeWords.includes(word))
        .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
};

/**
 * Calculate Jaccard similarity between two sets of keywords
 */
const jaccardSimilarity = (keywords1: string[], keywords2: string[]): number => {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
};

/**
 * Find common keywords between two cards
 */
const findCommonKeywords = (card1: Card, card2: Card, excludeWords: string[] = []): string[] => {
    const keywords1 = extractKeywords(card1.content, excludeWords);
    const keywords2 = extractKeywords(card2.content, excludeWords);

    return keywords1.filter(keyword => keywords2.includes(keyword));
};

/**
 * Calculate keyword-based similarity
 */
const keywordSimilarity = (card1: Card, card2: Card, excludeWords: string[] = []): number => {
    const keywords1 = extractKeywords(card1.content, excludeWords);
    const keywords2 = extractKeywords(card2.content, excludeWords);

    return jaccardSimilarity(keywords1, keywords2);
};

/**
 * Calculate combined similarity using multiple algorithms
 */
const combinedSimilarity = (card1: Card, card2: Card, excludeWords: string[] = []): number => {
    const levenshtein = levenshteinSimilarity(card1.content, card2.content);
    const keyword = keywordSimilarity(card1, card2, excludeWords);

    // Weighted combination: 40% Levenshtein, 60% keyword similarity
    return (levenshtein * 0.4) + (keyword * 0.6);
};

/**
 * Calculate similarity between two cards using specified algorithm
 */
export const calculateSimilarity = (
    card1: Card,
    card2: Card,
    algorithm: SimilarityAlgorithm = 'combined',
    excludeWords: string[] = []
): number => {
    switch (algorithm) {
        case 'levenshtein':
            return levenshteinSimilarity(card1.content, card2.content);
        case 'jaccard':
            return keywordSimilarity(card1, card2, excludeWords);
        case 'keyword':
            return keywordSimilarity(card1, card2, excludeWords);
        case 'combined':
            return combinedSimilarity(card1, card2, excludeWords);
        default:
            return combinedSimilarity(card1, card2, excludeWords);
    }
};

/**
 * Find potential card groups using similarity detection
 */
export const findSimilarCardGroups = (
    cards: Card[],
    config: Partial<SimilarityConfig> = {}
): GroupSuggestion[] => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const suggestions: GroupSuggestion[] = [];
    const processedCards = new Set<string>();

    // Sort cards by creation date for consistent processing
    const sortedCards = [...cards].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (let i = 0; i < sortedCards.length; i++) {
        const card1 = sortedCards[i];

        // Skip if card is already processed or in a group
        if (processedCards.has(card1.id) || card1.groupId) {
            continue;
        }

        const similarCards: Card[] = [card1];

        for (let j = i + 1; j < sortedCards.length; j++) {
            const card2 = sortedCards[j];

            // Skip if card is already processed, in a group, or in different column
            if (processedCards.has(card2.id) || card2.groupId || card2.column !== card1.column) {
                continue;
            }

            const similarity = calculateSimilarity(
                card1,
                card2,
                finalConfig.algorithm,
                finalConfig.excludeKeywords
            );

            if (similarity >= finalConfig.threshold) {
                similarCards.push(card2);

                // Limit group size
                if (similarCards.length >= finalConfig.maxGroupSize) {
                    break;
                }
            }
        }

        // Create suggestion if we have enough similar cards
        if (similarCards.length >= finalConfig.minGroupSize) {
            const cardIds = similarCards.map(card => card.id);
            const commonKeywords = findCommonKeywords(
                similarCards[0],
                similarCards[1],
                finalConfig.excludeKeywords
            );

            // Calculate average similarity within the group
            let totalSimilarity = 0;
            let comparisons = 0;

            for (let x = 0; x < similarCards.length; x++) {
                for (let y = x + 1; y < similarCards.length; y++) {
                    totalSimilarity += calculateSimilarity(
                        similarCards[x],
                        similarCards[y],
                        finalConfig.algorithm,
                        finalConfig.excludeKeywords
                    );
                    comparisons++;
                }
            }

            const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

            // Generate reason based on common keywords or similarity
            let reason = `Similar content detected`;
            if (commonKeywords.length > 0) {
                reason = `Common themes: ${commonKeywords.slice(0, 3).join(', ')}`;
            }

            suggestions.push({
                id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                cardIds,
                similarity: avgSimilarity,
                reason,
                algorithm: finalConfig.algorithm,
                keywords: commonKeywords.length > 0 ? commonKeywords : undefined
            });

            // Mark cards as processed
            similarCards.forEach(card => processedCards.add(card.id));
        }
    }

    // Sort suggestions by similarity score (descending)
    return suggestions.sort((a, b) => b.similarity - a.similarity);
};

/**
 * Get similarity analysis between specific cards
 */
export const analyzeSimilarity = (
    card1: Card,
    card2: Card,
    config: Partial<SimilarityConfig> = {}
): {
    similarity: number;
    algorithm: SimilarityAlgorithm;
    commonKeywords: string[];
    recommendation: 'high' | 'medium' | 'low';
} => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    const similarity = calculateSimilarity(
        card1,
        card2,
        finalConfig.algorithm,
        finalConfig.excludeKeywords
    );

    const commonKeywords = findCommonKeywords(
        card1,
        card2,
        finalConfig.excludeKeywords
    );

    let recommendation: 'high' | 'medium' | 'low';
    if (similarity >= 0.8) {
        recommendation = 'high';
    } else if (similarity >= 0.6) {
        recommendation = 'medium';
    } else {
        recommendation = 'low';
    }

    return {
        similarity,
        algorithm: finalConfig.algorithm,
        commonKeywords,
        recommendation
    };
};
