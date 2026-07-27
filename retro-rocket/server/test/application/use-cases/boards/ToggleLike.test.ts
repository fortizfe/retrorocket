import { describe, expect, it } from 'vitest';
import { toggleLike } from '../../../../src/application/use-cases/boards/ToggleLike';
import { NotFoundError } from '../../../../src/domain/errors';
import { inMemoryCardStore } from './cardFakes';
import type { Card } from '../../../../src/application/ports/cards';

const CARD: Card = {
    id: 'c1', retrospectiveId: 'b1', content: 'X', column: 'helped', createdBy: 'owner-1',
    createdAt: new Date(), updatedAt: new Date(), likes: [], reactions: [], order: 0,
};

describe('toggleLike', () => {
    it('adds a like for a user who has not liked the card yet', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        const card = await toggleLike({ cardPort }, { cardId: 'c1', userId: 'u2', username: 'Bob' });
        expect(card.likes).toHaveLength(1);
        expect(card.likes[0].userId).toBe('u2');
    });

    it('removes the like on a second toggle by the same user', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        await toggleLike({ cardPort }, { cardId: 'c1', userId: 'u2', username: 'Bob' });
        const card = await toggleLike({ cardPort }, { cardId: 'c1', userId: 'u2', username: 'Bob' });
        expect(card.likes).toHaveLength(0);
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const cardPort = inMemoryCardStore([]);
        await expect(toggleLike({ cardPort }, { cardId: 'missing', userId: 'u2', username: 'Bob' })).rejects.toThrow(NotFoundError);
    });
});
