import { CardGroup, Card, Reaction } from '@/features/boards/types/card';

/**
 * Calculate group aggregations (votes, likes, reactions). The only export retained in
 * this file — its Firestore-direct CRUD/subscription exports (createCardGroup,
 * disbandCardGroup, addCardToGroup, removeCardFromGroup, updateGroupCollapseState,
 * getRetrospectiveGroups, subscribeToRetrospectiveGroups) were retired outright once
 * useCardGroups.ts moved to backendRetrospectiveClient (feature 019, US4) — confirmed
 * zero remaining callers (research.md §10 precedent).
 */
export const calculateGroupAggregations = (group: CardGroup, cards: Card[]): CardGroup => {
    const groupCards = cards.filter(card =>
        card.id === group.headCardId || group.memberCardIds.includes(card.id)
    );

    let totalVotes = 0;
    let totalLikes = 0;
    const allReactions: Reaction[] = [];

    groupCards.forEach(card => {
        totalVotes += card.votes ?? 0;
        totalLikes += card.likes?.length ?? 0;
        if (card.reactions) {
            allReactions.push(...card.reactions);
        }
    });

    return {
        ...group,
        totalVotes,
        totalLikes,
        allReactions
    };
};
