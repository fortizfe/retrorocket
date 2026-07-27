import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreCardAdapter } from '../../../src/adapters/firebase/FirestoreCardAdapter';
import { FirestoreCardGroupAdapter } from '../../../src/adapters/firebase/FirestoreCardGroupAdapter';
import { FakeFirestore } from './fakeFirestore';

async function setup() {
    const db = new FakeFirestore() as unknown as Firestore;
    const cards = new FirestoreCardAdapter(db);
    const groups = new FirestoreCardGroupAdapter(db);
    const head = await cards.createCard({ retrospectiveId: 'b1', content: 'Head', column: 'helped', createdBy: 'u1' });
    const member1 = await cards.createCard({ retrospectiveId: 'b1', content: 'M1', column: 'helped', createdBy: 'u1' });
    const member2 = await cards.createCard({ retrospectiveId: 'b1', content: 'M2', column: 'helped', createdBy: 'u1' });
    return { cards, groups, head, member1, member2 };
}

describe('FirestoreCardGroupAdapter', () => {
    it('creates a group and marks head/member cards accordingly', async () => {
        const { cards, groups, head, member1 } = await setup();
        const group = await groups.createGroup('b1', head.id, [member1.id], 'u1');

        expect(group.headCardId).toBe(head.id);
        expect(group.memberCardIds).toEqual([member1.id]);

        const headCard = await cards.getCard(head.id);
        const memberCard = await cards.getCard(member1.id);
        expect(headCard?.isGroupHead).toBe(true);
        expect(memberCard?.groupId).toBe(group.id);
    });

    it('disbands a group and clears refs on all its cards', async () => {
        const { cards, groups, head, member1 } = await setup();
        const group = await groups.createGroup('b1', head.id, [member1.id], 'u1');
        await groups.disbandGroup(group.id);

        expect(await groups.getGroup(group.id)).toBeNull();
        expect((await cards.getCard(head.id))?.groupId).toBeUndefined();
        expect((await cards.getCard(member1.id))?.groupId).toBeUndefined();
    });

    it('adds a card to an existing group', async () => {
        const { groups, head, member1, member2 } = await setup();
        const group = await groups.createGroup('b1', head.id, [member1.id], 'u1');
        const updated = await groups.addCardToGroup(group.id, member2.id);
        expect(updated.memberCardIds).toEqual([member1.id, member2.id]);
    });

    it('promotes the next member to head when the head card is removed', async () => {
        const { groups, head, member1, member2 } = await setup();
        const group = await groups.createGroup('b1', head.id, [member1.id, member2.id], 'u1');
        const updated = await groups.removeCardFromGroup(head.id);
        expect(updated?.headCardId).toBe(member1.id);
        expect(updated?.memberCardIds).toEqual([member2.id]);
        expect(updated?.id).toBe(group.id);
    });

    it('disbands the group when the head is removed with no members to promote', async () => {
        const { groups, head } = await setup();
        const group = await groups.createGroup('b1', head.id, [], 'u1');
        const result = await groups.removeCardFromGroup(head.id);
        expect(result).toBeNull();
        expect(await groups.getGroup(group.id)).toBeNull();
    });

    it('disbands the group when the last remaining member is removed', async () => {
        const { groups, head, member1 } = await setup();
        const group = await groups.createGroup('b1', head.id, [member1.id], 'u1');
        const result = await groups.removeCardFromGroup(member1.id);
        expect(result).toBeNull();
        expect(await groups.getGroup(group.id)).toBeNull();
    });

    it('sets the collapsed flag', async () => {
        const { groups, head, member1 } = await setup();
        const group = await groups.createGroup('b1', head.id, [member1.id], 'u1');
        const updated = await groups.setGroupCollapsed(group.id, true);
        expect(updated.isCollapsed).toBe(true);
    });

    it('persists and reads the column-grouping UI state', async () => {
        const { groups } = await setup();
        await groups.saveColumnGroupingState('b1', { helped: { mode: 'grouped' } });
        expect(await groups.getColumnGroupingState('b1')).toEqual({ helped: { mode: 'grouped' } });
    });

    it('returns an empty object for a board with no saved grouping state', async () => {
        const { groups } = await setup();
        expect(await groups.getColumnGroupingState('never-saved')).toEqual({});
    });
});
