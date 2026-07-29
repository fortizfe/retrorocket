import { describe, it, expect } from 'vitest';
import { toCard } from '../../../src/adapters/firebase/FirestoreCardAdapter';

// FirestoreCardAdapter's query/write composition (vote/like/reaction atomicity via
// FieldValue.increment()/arrayUnion()/arrayRemove(), reorder's atomic WriteBatch) is
// exercised end-to-end by the Playwright E2E suite against the Firestore emulator,
// consistent with FirestoreBoardsAdapter/FirestoreProfileAdapter having no dedicated
// Vitest-level Firestore mock. Only this adapter's pure mapping helper is unit-tested
// directly here.

describe('toCard', () => {
    const data = {
        content: 'Great sprint!',
        column: 'helped',
        createdBy: 'u1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        retrospectiveId: 'r1',
        color: 'pastelBlue',
        votes: 3,
        order: 2,
    };

    it('maps a Firestore document into a CardDTO', () => {
        expect(toCard('c1', data)).toMatchObject({ id: 'c1', content: 'Great sprint!', column: 'helped', votes: 3, color: 'pastelBlue' });
    });

    it('defaults votes/order to 0 and likes/reactions to [] when absent', () => {
        const { votes: _v, order: _o, ...rest } = data;
        void _v;
        void _o;
        expect(toCard('c1', rest)).toMatchObject({ votes: 0, order: 0, likes: [], reactions: [] });
    });

    it('maps likes/reactions arrays, converting each timestamp', () => {
        const withLikesAndReactions = {
            ...data,
            likes: [{ userId: 'u2', username: 'Bob', timestamp: new Date('2026-01-03T00:00:00Z') }],
            reactions: [{ userId: 'u2', username: 'Bob', emoji: '👍', timestamp: new Date('2026-01-03T00:00:00Z') }],
        };
        const card = toCard('c1', withLikesAndReactions);
        expect(card.likes).toEqual([{ userId: 'u2', username: 'Bob', timestamp: new Date('2026-01-03T00:00:00Z') }]);
        expect(card.reactions).toEqual([{ userId: 'u2', username: 'Bob', emoji: '👍', timestamp: new Date('2026-01-03T00:00:00Z') }]);
    });

    it('preserves group-membership fields when present', () => {
        const grouped = { ...data, groupId: 'g1', isGroupHead: true, groupOrder: 0 };
        expect(toCard('c1', grouped)).toMatchObject({ groupId: 'g1', isGroupHead: true, groupOrder: 0 });
    });

    it('maps createdByName when present (spec 020-user-display-name-fix)', () => {
        const withName = { ...data, createdByName: 'Jane Smith' };
        expect(toCard('c1', withName).createdByName).toBe('Jane Smith');
    });

    it('leaves createdByName undefined on a legacy document that predates this field', () => {
        expect(toCard('c1', data).createdByName).toBeUndefined();
    });
});
