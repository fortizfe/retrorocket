import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreFacilitatorNotesAdapter } from '../../../src/adapters/firebase/FirestoreFacilitatorNotesAdapter';
import { FakeFirestore } from './fakeFirestore';

function adapter(): FirestoreFacilitatorNotesAdapter {
    return new FirestoreFacilitatorNotesAdapter(new FakeFirestore() as unknown as Firestore);
}

describe('FirestoreFacilitatorNotesAdapter', () => {
    it('creates and round-trips a note', async () => {
        const notes = adapter();
        const created = await notes.createNote('b1', 'facilitator-1', 'Watch the timebox');
        expect(created.content).toBe('Watch the timebox');

        const fetched = await notes.getNote(created.id);
        expect(fetched?.facilitatorId).toBe('facilitator-1');
    });

    it('lists only the requesting facilitator\'s own notes for the board', async () => {
        const notes = adapter();
        await notes.createNote('b1', 'facilitator-1', 'Note A');
        await notes.createNote('b1', 'facilitator-2', 'Note from someone else');
        await notes.createNote('b2', 'facilitator-1', 'Different board');

        const list = await notes.listNotes('b1', 'facilitator-1');
        expect(list).toHaveLength(1);
        expect(list[0].content).toBe('Note A');
    });

    it('updates and deletes a note', async () => {
        const notes = adapter();
        const created = await notes.createNote('b1', 'facilitator-1', 'old');
        const updated = await notes.updateNote(created.id, 'new');
        expect(updated.content).toBe('new');

        await notes.deleteNote(created.id);
        expect(await notes.getNote(created.id)).toBeNull();
    });
});
