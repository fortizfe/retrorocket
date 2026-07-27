import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreCardAdapter } from '../../../src/adapters/firebase/FirestoreCardAdapter';
import { FakeFirestore } from './fakeFirestore';

function adapter(): FirestoreCardAdapter {
    return new FirestoreCardAdapter(new FakeFirestore() as unknown as Firestore);
}

describe('FirestoreCardAdapter', () => {
    it('creates and round-trips a card', async () => {
        const cards = adapter();
        const created = await cards.createCard({ retrospectiveId: 'b1', content: 'Great sprint', column: 'helped', createdBy: 'u1' });
        expect(created.likes).toEqual([]);
        expect(created.reactions).toEqual([]);

        const fetched = await cards.getCard(created.id);
        expect(fetched?.content).toBe('Great sprint');
    });

    it('lists cards for a board ordered by order asc', async () => {
        const cards = adapter();
        const a = await cards.createCard({ retrospectiveId: 'b1', content: 'A', column: 'helped', createdBy: 'u1' });
        const b = await cards.createCard({ retrospectiveId: 'b1', content: 'B', column: 'helped', createdBy: 'u1' });
        await cards.reorderCards([{ cardId: a.id, order: 5 }, { cardId: b.id, order: 1 }]);

        const list = await cards.listCards('b1');
        expect(list.map((c) => c.id)).toEqual([b.id, a.id]);
    });

    it('updates and deletes a card', async () => {
        const cards = adapter();
        const created = await cards.createCard({ retrospectiveId: 'b1', content: 'X', column: 'helped', createdBy: 'u1' });
        const updated = await cards.updateCard(created.id, { content: 'Y' });
        expect(updated.content).toBe('Y');

        await cards.deleteCard(created.id);
        expect(await cards.getCard(created.id)).toBeNull();
    });

    it('toggles a like on and off', async () => {
        const cards = adapter();
        const created = await cards.createCard({ retrospectiveId: 'b1', content: 'X', column: 'helped', createdBy: 'u1' });

        const liked = await cards.toggleLike(created.id, 'u2', 'Bob');
        expect(liked.likes).toHaveLength(1);

        const unliked = await cards.toggleLike(created.id, 'u2', 'Bob');
        expect(unliked.likes).toHaveLength(0);
    });

    it('sets and removes a reaction (one per user)', async () => {
        const cards = adapter();
        const created = await cards.createCard({ retrospectiveId: 'b1', content: 'X', column: 'helped', createdBy: 'u1' });

        await cards.setReaction(created.id, 'u2', 'Bob', '🎉');
        const replaced = await cards.setReaction(created.id, 'u2', 'Bob', '👍');
        expect(replaced.reactions).toHaveLength(1);
        expect(replaced.reactions[0].emoji).toBe('👍');

        const removed = await cards.removeReaction(created.id, 'u2');
        expect(removed.reactions).toEqual([]);
    });
});
