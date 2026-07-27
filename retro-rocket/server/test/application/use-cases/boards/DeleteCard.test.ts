import { describe, expect, it } from 'vitest';
import { deleteCard } from '../../../../src/application/use-cases/boards/DeleteCard';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryCardGroupStore, inMemoryCardStore } from './cardFakes';
import type { Card, CardGroup } from '../../../../src/application/ports/cards';

const CARD: Card = {
    id: 'c1',
    retrospectiveId: 'b1',
    content: 'X',
    column: 'helped',
    createdBy: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: [],
    reactions: [],
    order: 0,
};

describe('deleteCard', () => {
    it('allows the owner to delete their own card', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        const cardGroupPort = inMemoryCardGroupStore();
        await deleteCard({ cardPort, cardGroupPort }, { cardId: 'c1', requesterUid: 'owner-1' });
        expect(await cardPort.getCard('c1')).toBeNull();
    });

    it('rejects a non-owner delete attempt', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        const cardGroupPort = inMemoryCardGroupStore();
        await expect(deleteCard({ cardPort, cardGroupPort }, { cardId: 'c1', requesterUid: 'stranger' })).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const cardPort = inMemoryCardStore([]);
        const cardGroupPort = inMemoryCardGroupStore();
        await expect(deleteCard({ cardPort, cardGroupPort }, { cardId: 'missing', requesterUid: 'owner-1' })).rejects.toThrow(NotFoundError);
    });

    it('cleans up group membership when a grouped card is deleted', async () => {
        const grouped: Card = { ...CARD, groupId: 'g1' };
        const cardPort = inMemoryCardStore([grouped]);
        const group: CardGroup = {
            id: 'g1',
            retrospectiveId: 'b1',
            column: 'helped',
            headCardId: 'c1',
            memberCardIds: ['c2'],
            isCollapsed: false,
            createdAt: new Date(),
            createdBy: 'owner-1',
            order: 0,
        };
        const cardGroupPort = inMemoryCardGroupStore([group]);

        await deleteCard({ cardPort, cardGroupPort }, { cardId: 'c1', requesterUid: 'owner-1' });

        const updatedGroup = await cardGroupPort.getGroup('g1');
        expect(updatedGroup?.headCardId).toBe('c2');
    });
});
