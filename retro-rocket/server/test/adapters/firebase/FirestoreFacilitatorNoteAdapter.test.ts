import { describe, it, expect } from 'vitest';
import { toFacilitatorNote } from '../../../src/adapters/firebase/FirestoreFacilitatorNoteAdapter';

describe('toFacilitatorNote', () => {
    it('maps a Firestore facilitatorNotes document into a FacilitatorNoteDTO', () => {
        const timestamp = { toDate: () => new Date('2026-07-01T10:00:00Z') };
        const data = { content: 'Watch out for scope creep', timestamp, retrospectiveId: 'r1', facilitatorId: 'u1' };

        expect(toFacilitatorNote('note-1', data)).toEqual({
            id: 'note-1',
            content: 'Watch out for scope creep',
            timestamp: new Date('2026-07-01T10:00:00Z'),
            retrospectiveId: 'r1',
            facilitatorId: 'u1',
        });
    });
});
