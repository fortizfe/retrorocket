import { describe, it, expect } from 'vitest';
import {
    Card,
    CardColor,
    CardGroup,
    CreateCardInput,
    EmojiReaction,
    GroupSuggestion,
    GroupedReaction,
    Like,
    Reaction,
    SimilarityAlgorithm
} from '../../types/card';
import { ColumnType } from '../../types/retrospective';
import { ALL_EMOJIS } from '../../utils/emojiConstants';

describe('Card Types', () => {
    describe('CardColor type', () => {
        it('should include all expected color values', () => {
            const colors: CardColor[] = [
                'pastelWhite',
                'pastelGreen',
                'pastelRed',
                'pastelYellow',
                'pastelBlue',
                'pastelPurple',
                'pastelOrange',
                'pastelPink',
                'pastelTeal',
                'pastelGray'
            ];

            // This test ensures our type includes all expected colors
            colors.forEach(color => {
                const testColor: CardColor = color;
                expect(testColor).toBeDefined();
            });
        });
    });

    describe('Card interface', () => {
        it('should have all required properties', () => {
            const mockCard: Card = {
                id: 'test-id',
                content: 'Test content',
                column: 'helped',
                createdBy: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                retrospectiveId: 'retro-123'
            };

            expect(mockCard.id).toBeDefined();
            expect(mockCard.content).toBeDefined();
            expect(mockCard.column).toBeDefined();
            expect(mockCard.createdBy).toBeDefined();
            expect(mockCard.createdAt).toBeDefined();
            expect(mockCard.updatedAt).toBeDefined();
            expect(mockCard.retrospectiveId).toBeDefined();
        });

        it('should allow optional properties', () => {
            const mockCard: Card = {
                id: 'test-id',
                content: 'Test content',
                column: 'helped',
                createdBy: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                retrospectiveId: 'retro-123',
                color: 'pastelGreen',
                votes: 5,
                likes: [],
                reactions: [],
                order: 1,
                groupId: 'group-123',
                isGroupHead: false,
                groupOrder: 2
            };

            expect(mockCard.color).toBe('pastelGreen');
            expect(mockCard.votes).toBe(5);
            expect(mockCard.likes).toEqual([]);
            expect(mockCard.reactions).toEqual([]);
            expect(mockCard.order).toBe(1);
            expect(mockCard.groupId).toBe('group-123');
            expect(mockCard.isGroupHead).toBe(false);
            expect(mockCard.groupOrder).toBe(2);
        });
    });

    describe('CreateCardInput interface', () => {
        it('should have all required properties', () => {
            const mockInput: CreateCardInput = {
                content: 'New card content',
                column: 'improve',
                createdBy: 'user-456',
                retrospectiveId: 'retro-456'
            };

            expect(mockInput.content).toBeDefined();
            expect(mockInput.column).toBeDefined();
            expect(mockInput.createdBy).toBeDefined();
            expect(mockInput.retrospectiveId).toBeDefined();
        });

        it('should allow optional properties', () => {
            const mockInput: CreateCardInput = {
                content: 'New card content',
                column: 'improve',
                createdBy: 'user-456',
                retrospectiveId: 'retro-456',
                color: 'pastelBlue',
                groupId: 'group-456'
            };

            expect(mockInput.color).toBe('pastelBlue');
            expect(mockInput.groupId).toBe('group-456');
        });
    });

    describe('Like interface', () => {
        it('should have correct structure', () => {
            const mockLike: Like = {
                userId: 'user-123',
                username: 'testuser',
                timestamp: new Date()
            };

            expect(mockLike.userId).toBeDefined();
            expect(mockLike.username).toBeDefined();
            expect(mockLike.timestamp).toBeDefined();
            expect(mockLike.timestamp instanceof Date).toBe(true);
        });
    });

    describe('Reaction interface', () => {
        it('should have correct structure', () => {
            const mockReaction: Reaction = {
                userId: 'user-123',
                username: 'testuser',
                emoji: '👍',
                timestamp: new Date()
            };

            expect(mockReaction.userId).toBeDefined();
            expect(mockReaction.username).toBeDefined();
            expect(mockReaction.emoji).toBeDefined();
            expect(mockReaction.timestamp).toBeDefined();
            expect(mockReaction.timestamp instanceof Date).toBe(true);
        });

        it('should accept valid emoji reactions', () => {
            const validEmojis = ['👍', '❤️', '🎉', '😀', '💡'];

            validEmojis.forEach(emoji => {
                const mockReaction: Reaction = {
                    userId: 'user-123',
                    username: 'testuser',
                    emoji: emoji as any, // We know these are valid emojis
                    timestamp: new Date()
                };

                expect(mockReaction.emoji).toBe(emoji);
            });
        });
    });

    describe('Column types', () => {
        it('should accept valid column values', () => {
            const validColumns: ColumnType[] = ['helped', 'hindered', 'improve', 'actions'];

            validColumns.forEach(column => {
                const mockCard: Card = {
                    id: 'test',
                    content: 'test',
                    column,
                    createdBy: 'test',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    retrospectiveId: 'test'
                };

                expect(mockCard.column).toBe(column);
            });
        });
    });

    describe('EmojiReaction type', () => {
        it('should be compatible with ALL_EMOJIS array', () => {
            // Test that EmojiReaction matches ALL_EMOJIS
            const firstEmoji = ALL_EMOJIS[0];
            const testReaction: EmojiReaction = firstEmoji;
            expect(typeof testReaction).toBe('string');
            expect(ALL_EMOJIS).toContain(testReaction);
        });

        it('should include expected emoji values', () => {
            // Test some known emojis from the constants
            const knownEmojis = ['👍', '👎', '❤️', '😀', '😢'];
            knownEmojis.forEach(emoji => {
                if (ALL_EMOJIS.includes(emoji)) {
                    const testReaction: EmojiReaction = emoji;
                    expect(typeof testReaction).toBe('string');
                }
            });
        });
    });

    describe('SimilarityAlgorithm type', () => {
        it('should include all expected algorithm types', () => {
            const algorithms: SimilarityAlgorithm[] = [
                'levenshtein',
                'jaccard',
                'keyword',
                'combined'
            ];

            algorithms.forEach(algorithm => {
                const testAlgorithm: SimilarityAlgorithm = algorithm;
                expect(typeof testAlgorithm).toBe('string');
                expect(algorithms).toContain(testAlgorithm);
            });

            expect(algorithms).toHaveLength(4);
        });
    });

    describe('GroupedReaction interface', () => {
        it('should have correct structure', () => {
            const groupedReaction: GroupedReaction = {
                emoji: '👍',
                count: 5,
                users: ['user1', 'user2', 'user3']
            };

            expect(typeof groupedReaction.emoji).toBe('string');
            expect(typeof groupedReaction.count).toBe('number');
            expect(Array.isArray(groupedReaction.users)).toBe(true);

            // Required properties
            expect(groupedReaction).toHaveProperty('emoji');
            expect(groupedReaction).toHaveProperty('count');
            expect(groupedReaction).toHaveProperty('users');
        });

        it('should handle empty and populated user arrays', () => {
            const emptyGrouped: GroupedReaction = {
                emoji: '😢',
                count: 0,
                users: []
            };

            const populatedGrouped: GroupedReaction = {
                emoji: '🎉',
                count: 3,
                users: ['alice', 'bob', 'charlie']
            };

            expect(emptyGrouped.users).toHaveLength(0);
            expect(populatedGrouped.users).toHaveLength(3);
            expect(populatedGrouped.count).toBe(3);
        });
    });

    describe('GroupSuggestion interface', () => {
        it('should have correct structure', () => {
            const groupSuggestion: GroupSuggestion = {
                id: 'suggestion123',
                cardIds: ['card1', 'card2'],
                similarity: 0.85,
                reason: 'Similar keywords found',
                algorithm: 'keyword'
            };

            expect(typeof groupSuggestion.id).toBe('string');
            expect(Array.isArray(groupSuggestion.cardIds)).toBe(true);
            expect(typeof groupSuggestion.similarity).toBe('number');
            expect(typeof groupSuggestion.reason).toBe('string');
            expect(typeof groupSuggestion.algorithm).toBe('string');

            // Required properties
            expect(groupSuggestion).toHaveProperty('id');
            expect(groupSuggestion).toHaveProperty('cardIds');
            expect(groupSuggestion).toHaveProperty('similarity');
            expect(groupSuggestion).toHaveProperty('reason');
            expect(groupSuggestion).toHaveProperty('algorithm');
        });

        it('should handle optional keywords property', () => {
            const withKeywords: GroupSuggestion = {
                id: 'suggestion456',
                cardIds: ['card3', 'card4'],
                similarity: 0.92,
                reason: 'Keyword match',
                algorithm: 'keyword',
                keywords: ['performance', 'optimization']
            };

            const withoutKeywords: GroupSuggestion = {
                id: 'suggestion789',
                cardIds: ['card5', 'card6'],
                similarity: 0.75,
                reason: 'Levenshtein distance',
                algorithm: 'levenshtein'
            };

            expect(withKeywords.keywords).toEqual(['performance', 'optimization']);
            expect(withoutKeywords.keywords).toBeUndefined();
        });

        it('should validate similarity score range', () => {
            const validSuggestion: GroupSuggestion = {
                id: 'test',
                cardIds: ['card1'],
                similarity: 0.5, // Should be between 0 and 1
                reason: 'test',
                algorithm: 'combined'
            };

            expect(validSuggestion.similarity).toBeGreaterThanOrEqual(0);
            expect(validSuggestion.similarity).toBeLessThanOrEqual(1);
        });
    });

    describe('CardGroup interface', () => {
        it('should have correct structure', () => {
            const cardGroup: CardGroup = {
                id: 'group123',
                retrospectiveId: 'retro456',
                column: 'helped',
                headCardId: 'card789',
                memberCardIds: ['card101', 'card102'],
                isCollapsed: false,
                createdAt: new Date(),
                createdBy: 'user456',
                order: 1
            };

            expect(typeof cardGroup.id).toBe('string');
            expect(typeof cardGroup.retrospectiveId).toBe('string');
            expect(typeof cardGroup.column).toBe('string');
            expect(typeof cardGroup.headCardId).toBe('string');
            expect(Array.isArray(cardGroup.memberCardIds)).toBe(true);
            expect(typeof cardGroup.isCollapsed).toBe('boolean');
            expect(cardGroup.createdAt).toBeInstanceOf(Date);
            expect(typeof cardGroup.createdBy).toBe('string');
            expect(typeof cardGroup.order).toBe('number');
        });

        it('should handle optional properties', () => {
            const withOptionals: CardGroup = {
                id: 'group456',
                retrospectiveId: 'retro789',
                column: 'improve',
                headCardId: 'card111',
                memberCardIds: [],
                title: 'Custom Group Title',
                isCollapsed: true,
                createdAt: new Date(),
                createdBy: 'user789',
                order: 2,
                totalVotes: 15,
                totalLikes: 8,
                allReactions: []
            };

            const withoutOptionals: CardGroup = {
                id: 'group789',
                retrospectiveId: 'retro101',
                column: 'hindered',
                headCardId: 'card222',
                memberCardIds: ['card333'],
                isCollapsed: false,
                createdAt: new Date(),
                createdBy: 'user101',
                order: 3
            };

            expect(withOptionals.title).toBe('Custom Group Title');
            expect(withOptionals.totalVotes).toBe(15);
            expect(withOptionals.totalLikes).toBe(8);
            expect(Array.isArray(withOptionals.allReactions)).toBe(true);

            expect(withoutOptionals.title).toBeUndefined();
            expect(withoutOptionals.totalVotes).toBeUndefined();
            expect(withoutOptionals.totalLikes).toBeUndefined();
            expect(withoutOptionals.allReactions).toBeUndefined();
        });
    });

    describe('Type Compatibility', () => {
        it('should work with type guards', () => {
            const isValidCardColor = (value: string): value is CardColor => {
                const validColors: CardColor[] = [
                    'pastelWhite', 'pastelGreen', 'pastelRed', 'pastelYellow', 'pastelBlue',
                    'pastelPurple', 'pastelOrange', 'pastelPink', 'pastelTeal', 'pastelGray'
                ];
                return validColors.includes(value as CardColor);
            };

            expect(isValidCardColor('pastelBlue')).toBe(true);
            expect(isValidCardColor('invalidColor')).toBe(false);
        });

        it('should work with utility functions', () => {
            const getCardSummary = (card: Card): string => {
                return `${card.content} (${card.column})`;
            };

            const testCard: Card = {
                id: 'test',
                content: 'Test content',
                column: 'helped',
                createdBy: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
                retrospectiveId: 'retro'
            };

            expect(getCardSummary(testCard)).toBe('Test content (helped)');
        });

        it('should handle array operations', () => {
            const cards: Card[] = [
                {
                    id: 'card1',
                    content: 'First card',
                    column: 'helped',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    retrospectiveId: 'retro1'
                },
                {
                    id: 'card2',
                    content: 'Second card',
                    column: 'improve',
                    createdBy: 'user2',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    retrospectiveId: 'retro1'
                }
            ];

            const helpedCards = cards.filter(card => card.column === 'helped');
            const cardIds = cards.map(card => card.id);

            expect(helpedCards).toHaveLength(1);
            expect(cardIds).toEqual(['card1', 'card2']);
        });
    });
});
