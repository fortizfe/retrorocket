import { Card, EmojiReaction, Like, Reaction, GroupedReaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

/**
 * Groups reactions by emoji and counts them
 */
export const groupReactions = (reactions: Reaction[]): GroupedReaction[] => {
    const grouped = {} as Record<EmojiReaction, GroupedReaction>;

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
export const hasUserLiked = (likes: Like[], userId: string): boolean => {
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
export const calculateNextOrder = (cards: Card[], column: string): number => {
    const columnCards = cards.filter(card => card.column === column);
    if (columnCards.length === 0) return 0;

    const maxOrder = Math.max(...columnCards.map(card => card.order ?? 0));
    return maxOrder + 1;
};

/**
 * Sorts cards by order within each column
 */
export const sortCardsByOrder = (cards: Card[]): Card[] => {
    return [...cards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

/**
 * Resolves a card author's display name for rendering: the name captured on the
 * card at creation time, else a live match in the current participants list (by
 * userId, not by name — keeps two same-named authors distinct), else the given
 * fallback label. Never returns `card.createdBy` (the raw uid) itself.
 */
export const resolveAuthorDisplayName = (
    card: Pick<Card, 'createdBy' | 'createdByName'>,
    participants: Participant[] | undefined,
    fallbackLabel: string
): string => {
    if (card.createdByName) return card.createdByName;
    const participant = participants?.find(p => p.userId === card.createdBy);
    return participant?.name ?? fallbackLabel;
};
