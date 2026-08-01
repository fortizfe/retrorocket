import { Card, EmojiReaction, Like, Reaction, GroupedReaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

/**
 * Groups reactions by emoji and counts them. `users` holds each reactor's
 * resolved display name (via resolveDisplayName); `userIds` carries the raw
 * userIds, parallel-indexed with `users`, for membership checks (e.g. "is this
 * my reaction") that must never compare against a display name.
 */
export const groupReactions = (
    reactions: Reaction[],
    participants: Participant[] | undefined,
    fallbackLabel: string
): GroupedReaction[] => {
    const grouped = {} as Record<EmojiReaction, GroupedReaction>;

    reactions.forEach(reaction => {
        if (!grouped[reaction.emoji]) {
            grouped[reaction.emoji] = {
                emoji: reaction.emoji,
                count: 0,
                users: [],
                userIds: []
            };
        }
        grouped[reaction.emoji].count++;
        grouped[reaction.emoji].users.push(
            resolveDisplayName(reaction.userId, reaction.username, participants, fallbackLabel)
        );
        grouped[reaction.emoji].userIds.push(reaction.userId);
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
 * Resolves any user-attributed identifier to a display name, applying the same
 * order everywhere (FR-005): a live match in the current participants list (by
 * userId, not by name — keeps two same-named authors distinct) first, since the
 * rename fan-out keeps it current for as long as the account exists; else the
 * name captured at the time of the action; else the given fallback label. Never
 * returns the raw userId itself.
 */
export const resolveDisplayName = (
    userId: string,
    capturedName: string | undefined,
    participants: Participant[] | undefined,
    fallbackLabel: string
): string => {
    const participant = participants?.find(p => p.userId === userId);
    if (participant?.name) return participant.name;
    if (capturedName) return capturedName;
    return fallbackLabel;
};
