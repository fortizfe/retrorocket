import { describe, expect, it } from 'vitest';
import { setReaction } from '../../../../src/application/use-cases/boards/SetReaction';
import { removeReaction } from '../../../../src/application/use-cases/boards/RemoveReaction';
import { NotFoundError } from '../../../../src/domain/errors';
import { inMemoryCardStore } from './cardFakes';
import type { Card } from '../../../../src/application/ports/cards';

const CARD: Card = {
    id: 'c1', retrospectiveId: 'b1', content: 'X', column: 'helped', createdBy: 'owner-1',
    createdAt: new Date(), updatedAt: new Date(), likes: [], reactions: [], order: 0,
};

describe('setReaction', () => {
    it('adds a reaction for a user', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        const card = await setReaction({ cardPort }, { cardId: 'c1', userId: 'u2', username: 'Bob', emoji: '🎉' });
        expect(card.reactions).toEqual([expect.objectContaining({ userId: 'u2', emoji: '🎉' })]);
    });

    it('replaces (not adds to) an existing reaction from the same user', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        await setReaction({ cardPort }, { cardId: 'c1', userId: 'u2', username: 'Bob', emoji: '🎉' });
        const card = await setReaction({ cardPort }, { cardId: 'c1', userId: 'u2', username: 'Bob', emoji: '👍' });
        expect(card.reactions).toHaveLength(1);
        expect(card.reactions[0].emoji).toBe('👍');
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const cardPort = inMemoryCardStore([]);
        await expect(setReaction({ cardPort }, { cardId: 'missing', userId: 'u2', username: 'Bob', emoji: '🎉' })).rejects.toThrow(NotFoundError);
    });
});

describe('removeReaction', () => {
    it("removes the user's reaction", async () => {
        const cardPort = inMemoryCardStore([CARD]);
        await setReaction({ cardPort }, { cardId: 'c1', userId: 'u2', username: 'Bob', emoji: '🎉' });
        const card = await removeReaction({ cardPort }, { cardId: 'c1', userId: 'u2' });
        expect(card.reactions).toEqual([]);
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const cardPort = inMemoryCardStore([]);
        await expect(removeReaction({ cardPort }, { cardId: 'missing', userId: 'u2' })).rejects.toThrow(NotFoundError);
    });
});
