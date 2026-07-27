import { describe, expect, it } from 'vitest';
import { updateCard } from '../../../../src/application/use-cases/boards/UpdateCard';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryCardStore } from './cardFakes';
import type { Card } from '../../../../src/application/ports/cards';

const CARD: Card = {
    id: 'c1',
    retrospectiveId: 'b1',
    content: 'Original',
    column: 'helped',
    createdBy: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: [],
    reactions: [],
    order: 0,
};

describe('updateCard', () => {
    it("allows the owner to edit their own card", async () => {
        const cardPort = inMemoryCardStore([CARD]);
        const updated = await updateCard({ cardPort }, { cardId: 'c1', requesterUid: 'owner-1', updates: { content: 'Edited' } });
        expect(updated.content).toBe('Edited');
    });

    it('rejects a non-owner edit attempt', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        await expect(updateCard({ cardPort }, { cardId: 'c1', requesterUid: 'other-uid', updates: { content: 'Hacked' } })).rejects.toThrow(ForbiddenError);
    });

    it('resolves concurrent edits with last-write-wins (FR-014)', async () => {
        const cardPort = inMemoryCardStore([CARD]);
        await updateCard({ cardPort }, { cardId: 'c1', requesterUid: 'owner-1', updates: { content: 'First edit' } });
        const second = await updateCard({ cardPort }, { cardId: 'c1', requesterUid: 'owner-1', updates: { content: 'Second edit' } });
        expect(second.content).toBe('Second edit');
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const cardPort = inMemoryCardStore([]);
        await expect(updateCard({ cardPort }, { cardId: 'missing', requesterUid: 'owner-1', updates: {} })).rejects.toThrow(NotFoundError);
    });
});
