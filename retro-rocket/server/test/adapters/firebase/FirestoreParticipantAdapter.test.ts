import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreBoardAdapter } from '../../../src/adapters/firebase/FirestoreBoardAdapter';
import { FirestoreParticipantAdapter } from '../../../src/adapters/firebase/FirestoreParticipantAdapter';
import { FakeFirestore } from './fakeFirestore';

async function setup() {
    const db = new FakeFirestore() as unknown as Firestore;
    const boards = new FirestoreBoardAdapter(db);
    const participants = new FirestoreParticipantAdapter(db);
    const board = await boards.createBoard({
        templateId: 'default',
        title: 'X',
        createdBy: 'facilitator-1',
        createdByName: 'Ana',
        locale: 'en',
        columns: [],
    });
    return { participants, board };
}

describe('FirestoreParticipantAdapter', () => {
    it('creates a new participant', async () => {
        const { participants, board } = await setup();

        const { participant, isNew } = await participants.addParticipant({
            retrospectiveId: board.id,
            userId: 'u2',
            name: 'Bob',
            photoURL: null,
        });

        expect(isNew).toBe(true);
        expect(participant.userId).toBe('u2');
        expect(participant.retrospectiveId).toBe(board.id);
    });

    it('is idempotent for a user who already joined', async () => {
        const { participants, board } = await setup();

        await participants.addParticipant({ retrospectiveId: board.id, userId: 'u2', name: 'Bob', photoURL: null });
        const second = await participants.addParticipant({ retrospectiveId: board.id, userId: 'u2', name: 'Bob', photoURL: null });

        expect(second.isNew).toBe(false);
        expect(await participants.listParticipants(board.id)).toHaveLength(1);
    });

    it('marks the board creator as facilitator when listing participants', async () => {
        const { participants, board } = await setup();
        await participants.addParticipant({ retrospectiveId: board.id, userId: 'facilitator-1', name: 'Ana', photoURL: null });
        await participants.addParticipant({ retrospectiveId: board.id, userId: 'u2', name: 'Bob', photoURL: null });

        const list = await participants.listParticipants(board.id);
        expect(list.find((p) => p.userId === 'facilitator-1')!.isFacilitator).toBe(true);
        expect(list.find((p) => p.userId === 'u2')!.isFacilitator).toBe(false);
    });

    it('returns null from getParticipantByUser when not found', async () => {
        const { participants, board } = await setup();
        expect(await participants.getParticipantByUser(board.id, 'nobody')).toBeNull();
    });
});
