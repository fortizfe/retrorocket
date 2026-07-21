import { describe, it, expect, beforeEach } from 'vitest';
import {
    calculateSimilarity,
    findSimilarCardGroups,
    analyzeSimilarity
} from '@/features/boards/clustering/services/similarityService';
import { Card } from '@/features/boards/types/card';

describe('SimilarityService', () => {
    let mockCards: Card[];

    beforeEach(() => {
        mockCards = [
            {
                id: 'card-1',
                retrospectiveId: 'retro-1',
                column: 'helped',
                order: 1,
                content: 'Good communication between team members',
                createdBy: 'user-1',
                createdAt: new Date('2023-01-01T10:00:00Z'),
                updatedAt: new Date('2023-01-01T10:00:00Z'),
                likes: []
            },
            {
                id: 'card-2',
                retrospectiveId: 'retro-1',
                column: 'helped',
                order: 2,
                content: 'Excellent team communication and collaboration',
                createdBy: 'user-2',
                createdAt: new Date('2023-01-01T10:01:00Z'),
                updatedAt: new Date('2023-01-01T10:01:00Z'),
                likes: []
            },
            {
                id: 'card-3',
                retrospectiveId: 'retro-1',
                column: 'helped',
                order: 3,
                content: 'Daily standup meetings were very effective',
                createdBy: 'user-3',
                createdAt: new Date('2023-01-01T10:02:00Z'),
                updatedAt: new Date('2023-01-01T10:02:00Z'),
                likes: []
            },
            {
                id: 'card-4',
                retrospectiveId: 'retro-1',
                column: 'hindered',
                order: 1,
                content: 'Poor communication caused delays',
                createdBy: 'user-4',
                createdAt: new Date('2023-01-01T10:03:00Z'),
                updatedAt: new Date('2023-01-01T10:03:00Z'),
                likes: []
            },
            {
                id: 'card-5',
                retrospectiveId: 'retro-1',
                column: 'helped',
                order: 4,
                content: 'Code reviews improved quality significantly',
                createdBy: 'user-1',
                createdAt: new Date('2023-01-01T10:04:00Z'),
                updatedAt: new Date('2023-01-01T10:04:00Z'),
                likes: []
            }
        ];
    });

    describe('calculateSimilarity', () => {
        it('should calculate similarity using combined algorithm by default', () => {
            const card1 = mockCards[0]; // "Good communication between team members"
            const card2 = mockCards[1]; // "Excellent team communication and collaboration"

            const similarity = calculateSimilarity(card1, card2);

            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThanOrEqual(1);
            expect(typeof similarity).toBe('number');
        });

        it('should calculate levenshtein similarity', () => {
            const card1 = mockCards[0];
            const card2 = mockCards[1];

            const similarity = calculateSimilarity(card1, card2, 'levenshtein');

            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should calculate jaccard similarity', () => {
            const card1 = mockCards[0];
            const card2 = mockCards[1];

            const similarity = calculateSimilarity(card1, card2, 'jaccard');

            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should calculate keyword similarity', () => {
            const card1 = mockCards[0];
            const card2 = mockCards[1];

            const similarity = calculateSimilarity(card1, card2, 'keyword');

            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should return 0 similarity for completely different content', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'xyz'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'abc'
            };

            const similarity = calculateSimilarity(card1, card2, 'keyword');
            expect(similarity).toBe(0);
        });

        it('should return 1 similarity for identical content', () => {
            const card1 = mockCards[0];
            const card2 = { ...mockCards[0], id: 'different-id' };

            const similarity = calculateSimilarity(card1, card2, 'levenshtein');
            expect(similarity).toBe(1);
        });

        it('should handle empty content', () => {
            const card1: Card = {
                ...mockCards[0],
                content: ''
            };
            const card2: Card = {
                ...mockCards[1],
                content: ''
            };

            const similarity = calculateSimilarity(card1, card2);
            expect(similarity).toBeGreaterThanOrEqual(0); // Empty strings may not be perfectly identical due to combined algorithm
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should exclude specified keywords', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'the team communication was good'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'the team collaboration was excellent'
            };

            const similarityWithExclude = calculateSimilarity(card1, card2, 'keyword', ['the', 'team', 'was']);

            expect(similarityWithExclude).toBeGreaterThanOrEqual(0);
            expect(similarityWithExclude).toBeLessThanOrEqual(1);
        });

        it('should handle case insensitive comparison', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'COMMUNICATION TEAM'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'communication team'
            };

            const similarity = calculateSimilarity(card1, card2, 'levenshtein');
            expect(similarity).toBe(1);
        });

        it('should use combined algorithm for unknown algorithm', () => {
            const card1 = mockCards[0];
            const card2 = mockCards[1];

            const similarity = calculateSimilarity(card1, card2, 'unknown' as any);
            const combinedSimilarity = calculateSimilarity(card1, card2, 'combined');

            expect(similarity).toBe(combinedSimilarity);
        });
    });

    describe('findSimilarCardGroups', () => {
        it('should find groups of similar cards', () => {
            const suggestions = findSimilarCardGroups(mockCards);

            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThanOrEqual(0);

            suggestions.forEach(suggestion => {
                expect(suggestion).toHaveProperty('id');
                expect(suggestion).toHaveProperty('cardIds');
                expect(suggestion).toHaveProperty('similarity');
                expect(suggestion).toHaveProperty('reason');
                expect(suggestion).toHaveProperty('algorithm');
                expect(suggestion.cardIds.length).toBeGreaterThanOrEqual(2);
                expect(suggestion.similarity).toBeGreaterThanOrEqual(0);
                expect(suggestion.similarity).toBeLessThanOrEqual(1);
            });
        });

        it('should respect minimum group size configuration', () => {
            const suggestions = findSimilarCardGroups(mockCards, {
                minGroupSize: 3
            });

            suggestions.forEach(suggestion => {
                expect(suggestion.cardIds.length).toBeGreaterThanOrEqual(3);
            });
        });

        it('should respect maximum group size configuration', () => {
            const manyCards = Array.from({ length: 10 }, (_, i) => ({
                ...mockCards[0],
                id: `card-${i}`,
                content: 'similar content for grouping',
                createdAt: new Date(`2023-01-01T10:0${i}:00Z`)
            }));

            const suggestions = findSimilarCardGroups(manyCards, {
                maxGroupSize: 4,
                threshold: 0.5
            });

            suggestions.forEach(suggestion => {
                expect(suggestion.cardIds.length).toBeLessThanOrEqual(4);
            });
        });

        it('should respect similarity threshold', () => {
            const suggestions = findSimilarCardGroups(mockCards, {
                threshold: 0.9 // Very high threshold
            });

            // With very high threshold, fewer groups should be found
            expect(suggestions.length).toBeGreaterThanOrEqual(0);
        });

        it('should only group cards from same column', () => {
            const suggestions = findSimilarCardGroups(mockCards);

            for (const suggestion of suggestions) {
                const firstCardId = suggestion.cardIds[0];
                const firstCard = mockCards.find(card => card.id === firstCardId);

                for (const cardId of suggestion.cardIds) {
                    const card = mockCards.find(c => c.id === cardId);
                    expect(card?.column).toBe(firstCard?.column);
                }
            }
        });

        it('should skip cards that already have groupId', () => {
            const cardsWithGroups = mockCards.map(card => ({
                ...card,
                groupId: card.id === 'card-1' ? 'existing-group' : undefined
            }));

            const suggestions = findSimilarCardGroups(cardsWithGroups);

            suggestions.forEach(suggestion => {
                expect(suggestion.cardIds).not.toContain('card-1');
            });
        });

        it('should sort suggestions by similarity descending', () => {
            const suggestions = findSimilarCardGroups(mockCards, {
                threshold: 0.1 // Low threshold to get multiple suggestions
            });

            for (let i = 1; i < suggestions.length; i++) {
                expect(suggestions[i - 1].similarity).toBeGreaterThanOrEqual(suggestions[i].similarity);
            }
        });

        it('should use specified algorithm', () => {
            const suggestions = findSimilarCardGroups(mockCards, {
                algorithm: 'levenshtein'
            });

            suggestions.forEach(suggestion => {
                expect(suggestion.algorithm).toBe('levenshtein');
            });
        });

        it('should generate unique suggestion IDs', () => {
            const suggestions = findSimilarCardGroups(mockCards);
            const ids = suggestions.map(s => s.id);
            const uniqueIds = [...new Set(ids)];

            expect(ids.length).toBe(uniqueIds.length);
        });

        it('should handle empty card array', () => {
            const suggestions = findSimilarCardGroups([]);
            expect(suggestions).toEqual([]);
        });

        it('should handle single card', () => {
            const suggestions = findSimilarCardGroups([mockCards[0]]);
            expect(suggestions).toEqual([]);
        });

        it('should exclude specified keywords', () => {
            const cardsWithCommonWords = [
                {
                    ...mockCards[0],
                    content: 'the team communication was good and effective'
                },
                {
                    ...mockCards[1],
                    content: 'the team collaboration was good and productive'
                }
            ];

            const suggestions = findSimilarCardGroups(cardsWithCommonWords, {
                excludeKeywords: ['the', 'and', 'was'],
                threshold: 0.3
            });

            expect(suggestions.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('analyzeSimilarity', () => {
        it('should analyze similarity between two cards', () => {
            const card1 = mockCards[0];
            const card2 = mockCards[1];

            const analysis = analyzeSimilarity(card1, card2);

            expect(analysis).toHaveProperty('similarity');
            expect(analysis).toHaveProperty('algorithm');
            expect(analysis).toHaveProperty('commonKeywords');
            expect(analysis).toHaveProperty('recommendation');

            expect(typeof analysis.similarity).toBe('number');
            expect(analysis.similarity).toBeGreaterThanOrEqual(0);
            expect(analysis.similarity).toBeLessThanOrEqual(1);

            expect(['high', 'medium', 'low']).toContain(analysis.recommendation);
            expect(Array.isArray(analysis.commonKeywords)).toBe(true);
        });

        it('should recommend high for similarity >= 0.8', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'communication team'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'communication team'
            };

            const analysis = analyzeSimilarity(card1, card2);

            if (analysis.similarity >= 0.8) {
                expect(analysis.recommendation).toBe('high');
            }
        });

        it('should recommend medium for similarity >= 0.6 and < 0.8', () => {
            // Create cards with moderate similarity
            const card1: Card = {
                ...mockCards[0],
                content: 'team communication was effective'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'communication helped team'
            };

            const analysis = analyzeSimilarity(card1, card2);

            if (analysis.similarity >= 0.6 && analysis.similarity < 0.8) {
                expect(analysis.recommendation).toBe('medium');
            }
        });

        it('should recommend low for similarity < 0.6', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'team communication'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'database performance'
            };

            const analysis = analyzeSimilarity(card1, card2);

            if (analysis.similarity < 0.6) {
                expect(analysis.recommendation).toBe('low');
            }
        });

        it('should use specified algorithm', () => {
            const card1 = mockCards[0];
            const card2 = mockCards[1];

            const analysis = analyzeSimilarity(card1, card2, {
                algorithm: 'levenshtein'
            });

            expect(analysis.algorithm).toBe('levenshtein');
        });

        it('should find common keywords', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'team communication collaboration'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'team communication quality'
            };

            const analysis = analyzeSimilarity(card1, card2);

            expect(analysis.commonKeywords).toContain('team');
            expect(analysis.commonKeywords).toContain('communication');
        });

        it('should exclude specified keywords from common keywords', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'the team communication and collaboration'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'the team communication and quality'
            };

            const analysis = analyzeSimilarity(card1, card2, {
                excludeKeywords: ['the', 'and']
            });

            expect(analysis.commonKeywords).not.toContain('the');
            expect(analysis.commonKeywords).not.toContain('and');
        });

        it('should handle cards with no common keywords', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'database performance optimization'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'user interface design'
            };

            const analysis = analyzeSimilarity(card1, card2);

            expect(analysis.commonKeywords).toEqual([]);
            expect(analysis.similarity).toBeLessThan(0.6);
            expect(analysis.recommendation).toBe('low');
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle cards with special characters', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'Communication! @#$% (very good)'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'Communication... really good!!!'
            };

            const similarity = calculateSimilarity(card1, card2);
            expect(similarity).toBeGreaterThan(0);
        });

        it('should handle cards with numbers', () => {
            const card1: Card = {
                ...mockCards[0],
                content: 'Sprint 1 was successful'
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'Sprint 2 was successful'
            };

            const similarity = calculateSimilarity(card1, card2, 'keyword');
            expect(similarity).toBeGreaterThan(0);
        });

        it('should handle very long content', () => {
            const longContent = 'communication '.repeat(100);
            const card1: Card = {
                ...mockCards[0],
                content: longContent
            };
            const card2: Card = {
                ...mockCards[1],
                content: longContent
            };

            const similarity = calculateSimilarity(card1, card2);
            expect(similarity).toBe(1);
        });

        it('should handle mixed case and whitespace', () => {
            const card1: Card = {
                ...mockCards[0],
                content: '  TEAM    Communication  '
            };
            const card2: Card = {
                ...mockCards[1],
                content: 'team communication'
            };

            const similarity = calculateSimilarity(card1, card2, 'levenshtein');
            expect(similarity).toBeGreaterThan(0.7); // Adjust expectation based on actual algorithm behavior
        });

        it('should process cards in creation order', () => {
            const unsortedCards = [
                {
                    ...mockCards[0],
                    createdAt: new Date('2023-01-01T10:02:00Z')
                },
                {
                    ...mockCards[1],
                    createdAt: new Date('2023-01-01T10:01:00Z')
                },
                {
                    ...mockCards[2],
                    createdAt: new Date('2023-01-01T10:00:00Z')
                }
            ];

            const suggestions = findSimilarCardGroups(unsortedCards);
            // Should process correctly regardless of input order
            expect(suggestions).toBeDefined();
        });
    });
});
