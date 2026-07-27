import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreBoardAdapter } from '../../../src/adapters/firebase/FirestoreBoardAdapter';
import { FakeFirestore } from './fakeFirestore';

function adapter(): FirestoreBoardAdapter {
    return new FirestoreBoardAdapter(new FakeFirestore() as unknown as Firestore);
}

describe('FirestoreBoardAdapter', () => {
    it('creates a board with its columns, in order', async () => {
        const board = adapter();

        const created = await board.createBoard({
            templateId: 'default',
            title: 'Sprint 42 Retro',
            createdBy: 'u1',
            createdByName: 'Ana',
            locale: 'en',
            columns: [
                { id: 'helped', i18nKey: 'k.helped', type: 'regular', order: 0, defaultColor: 'green' },
                { id: 'actionItems', i18nKey: 'k.action', type: 'action', order: 1, defaultColor: 'blue' },
            ],
        });

        expect(created.title).toBe('Sprint 42 Retro');
        expect(created.isActive).toBe(true);
        expect(created.participantCount).toBe(0);
        expect(created.columns.map((c) => c.id)).toEqual(['helped', 'actionItems']);
    });

    it('round-trips a created board through getBoard', async () => {
        const board = adapter();
        const created = await board.createBoard({
            templateId: 'default',
            title: 'X',
            createdBy: 'u1',
            createdByName: 'Ana',
            locale: 'en',
            columns: [{ id: 'c1', i18nKey: 'k', type: 'regular', order: 0, defaultColor: 'green' }],
        });

        const fetched = await board.getBoard(created.id);
        expect(fetched).not.toBeNull();
        expect(fetched!.id).toBe(created.id);
        expect(fetched!.columns).toHaveLength(1);
    });

    it('returns null for a nonexistent board', async () => {
        const board = adapter();
        expect(await board.getBoard('missing')).toBeNull();
    });

    it('increments the participant count', async () => {
        const board = adapter();
        const created = await board.createBoard({
            templateId: 'default',
            title: 'X',
            createdBy: 'u1',
            createdByName: 'Ana',
            locale: 'en',
            columns: [],
        });

        await board.incrementParticipantCount(created.id);
        await board.incrementParticipantCount(created.id);

        const fetched = await board.getBoard(created.id);
        expect(fetched!.participantCount).toBe(2);
    });
});
