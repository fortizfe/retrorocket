import { describe, it, expect } from 'vitest';
import { toActionItem } from '../../../src/adapters/firebase/FirestoreActionItemAdapter';

describe('toActionItem', () => {
    it('maps a Firestore actionItems document into an ActionItemDTO', () => {
        const createdAt = { toDate: () => new Date('2026-07-01T10:00:00Z') };
        const updatedAt = { toDate: () => new Date('2026-07-01T11:00:00Z') };
        const dueDate = { toDate: () => new Date('2026-07-10T00:00:00Z') };
        const data = {
            content: 'Follow up with the team',
            retrospectiveId: 'r1',
            createdBy: 'u1',
            createdAt,
            updatedAt,
            assignedTo: 'u2',
            assignedToName: 'U Two',
            dueDate,
            order: 3,
        };

        expect(toActionItem('a1', data)).toEqual({
            id: 'a1',
            content: 'Follow up with the team',
            retrospectiveId: 'r1',
            createdBy: 'u1',
            createdAt: new Date('2026-07-01T10:00:00Z'),
            updatedAt: new Date('2026-07-01T11:00:00Z'),
            assignedTo: 'u2',
            assignedToName: 'U Two',
            dueDate: new Date('2026-07-10T00:00:00Z'),
            order: 3,
        });
    });

    it('defaults assignedTo/assignedToName/dueDate to null and order to 0 when absent', () => {
        const createdAt = { toDate: () => new Date('2026-07-01T10:00:00Z') };
        const data = { content: 'x', retrospectiveId: 'r1', createdBy: 'u1', createdAt, updatedAt: createdAt };

        expect(toActionItem('a2', data)).toMatchObject({ assignedTo: null, assignedToName: null, dueDate: null, order: 0 });
    });
});
