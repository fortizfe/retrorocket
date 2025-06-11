import { EmojiReaction, Reaction, GroupedReaction } from '../types/card';

/**
 * Groups reactions by emoji and counts them
 */
export const groupReactions = (reactions: Reaction[]): GroupedReaction[] => {
    const grouped: Record<EmojiReaction, GroupedReaction> = {} as any;

    reactions.forEach(reaction => {
        if (!grouped[reaction.emoji]) {
            grouped[reaction.emoji] = {
                emoji: reaction.emoji,
                count: 0,
                users: []
            };
        }
        grouped[reaction.emoji].count++;
        grouped[reaction.emoji].users.push(reaction.username);
    });

    return Object.values(grouped);
};

/**
 * Checks if a user has liked a card
 */
export const hasUserLiked = (likes: any[], userId: string): boolean => {
    return likes?.some(like => like.userId === userId) ?? false;
};

/**
 * Gets a user's reaction for a card
 */
export const getUserReaction = (reactions: Reaction[], userId: string): EmojiReaction | null => {
    const reaction = reactions?.find(r => r.userId === userId);
    return reaction?.emoji ?? null;
};

/**
 * Calculates the next order position for a new card in a column
 */
export const calculateNextOrder = (cards: any[], column: string): number => {
    const columnCards = cards.filter(card => card.column === column);
    if (columnCards.length === 0) return 0;

    const maxOrder = Math.max(...columnCards.map(card => card.order ?? 0));
    return maxOrder + 1;
};

/**
 * Sorts cards by order within each column
 */
export const sortCardsByOrder = (cards: any[]): any[] => {
    return [...cards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};
