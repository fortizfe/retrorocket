import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreActionItemAdapter } from '../../../src/adapters/firebase/FirestoreActionItemAdapter';
import { FakeFirestore } from './fakeFirestore';

function adapter(): FirestoreActionItemAdapter {
    return new FirestoreActionItemAdapter(new FakeFirestore() as unknown as Firestore);
}

describe('FirestoreActionItemAdapter', () => {
    it('creates and round-trips an action item', async () => {
        const items = adapter();
        const created = await items.createActionItem({ retrospectiveId: 'b1', content: 'Fix CI', createdBy: 'facilitator-1', assignedTo: 'u2', assignedToName: 'Bob' });
        expect(created.content).toBe('Fix CI');
        expect(created.assignedTo).toBe('u2');

        const fetched = await items.getActionItem(created.id);
        expect(fetched?.content).toBe('Fix CI');
    });

    it('lists action items for a board', async () => {
        const items = adapter();
        await items.createActionItem({ retrospectiveId: 'b1', content: 'A', createdBy: 'facilitator-1' });
        await items.createActionItem({ retrospectiveId: 'b2', content: 'B', createdBy: 'facilitator-1' });

        const list = await items.listActionItems('b1');
        expect(list).toHaveLength(1);
        expect(list[0].content).toBe('A');
    });

    it('updates and deletes an action item', async () => {
        const items = adapter();
        const created = await items.createActionItem({ retrospectiveId: 'b1', content: 'A', createdBy: 'facilitator-1' });
        const updated = await items.updateActionItem(created.id, { content: 'A revised' });
        expect(updated.content).toBe('A revised');

        await items.deleteActionItem(created.id);
        expect(await items.getActionItem(created.id)).toBeNull();
    });

    it('defaults optional fields to null', async () => {
        const items = adapter();
        const created = await items.createActionItem({ retrospectiveId: 'b1', content: 'A', createdBy: 'facilitator-1' });
        expect(created.assignedTo).toBeNull();
        expect(created.assignedToName).toBeNull();
        expect(created.dueDate).toBeNull();
    });
});
