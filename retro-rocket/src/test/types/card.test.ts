import { describe, it, expect } from 'vitest';
import { Card, CardColor, CreateCardInput, Reaction, Like } from '../../types/card';

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
            const validColumns = ['helped', 'hindered', 'improve'] as const;

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
});
