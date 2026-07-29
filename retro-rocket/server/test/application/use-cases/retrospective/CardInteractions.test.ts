import { describe, it, expect } from 'vitest';
import { voteCard, toggleLike, setReaction, removeReaction } from '../../../../src/application/use-cases/retrospective/CardInteractions';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';

function seededCard() {
    return { id: 'c1', content: 'x', column: 'col1', createdBy: 'owner-uid', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 };
}

describe('voteCard', () => {
    it('increments votes by default', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        const card = await voteCard({ ...store }, { cardId: 'c1', increment: true });
        expect(card.votes).toBe(1);
    });

    it('decrements votes when increment=false', async () => {
        const store = createRetrospectiveFakeStore({ cards: [{ ...seededCard(), votes: 3 }] });
        const card = await voteCard({ ...store }, { cardId: 'c1', increment: false });
        expect(card.votes).toBe(2);
    });
});

describe('toggleLike', () => {
    it('adds a like for a first-time liker', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        const card = await toggleLike({ ...store }, { cardId: 'c1', uid: 'u1', username: 'Alice' });
        expect(card.likes).toHaveLength(1);
        expect(card.likes[0]).toMatchObject({ userId: 'u1', username: 'Alice' });
    });

    it('removes the like on a second toggle by the same user', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        await toggleLike({ ...store }, { cardId: 'c1', uid: 'u1', username: 'Alice' });
        const card = await toggleLike({ ...store }, { cardId: 'c1', uid: 'u1', username: 'Alice' });
        expect(card.likes).toHaveLength(0);
    });
});

describe('setReaction', () => {
    it('adds a reaction for the caller', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        const card = await setReaction({ ...store }, { cardId: 'c1', uid: 'u1', username: 'Alice', emoji: '👍' });
        expect(card.reactions).toEqual([{ userId: 'u1', username: 'Alice', emoji: '👍', timestamp: expect.any(Date) }]);
    });

    it('replaces any prior reaction from the same user (one reaction per user)', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        await setReaction({ ...store }, { cardId: 'c1', uid: 'u1', username: 'Alice', emoji: '👍' });
        const card = await setReaction({ ...store }, { cardId: 'c1', uid: 'u1', username: 'Alice', emoji: '🎉' });
        expect(card.reactions).toHaveLength(1);
        expect(card.reactions[0].emoji).toBe('🎉');
    });
});

describe('removeReaction', () => {
    it("removes the caller's reaction", async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        await setReaction({ ...store }, { cardId: 'c1', uid: 'u1', username: 'Alice', emoji: '👍' });
        const card = await removeReaction({ ...store }, { cardId: 'c1', uid: 'u1' });
        expect(card.reactions).toEqual([]);
    });
});
