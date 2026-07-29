import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { FacilitatorNoteDTO, FacilitatorNotePort } from '../../application/ports/facilitatorNotes';
import { ForbiddenError, NotFoundError } from '../../domain/errors';

const FACILITATOR_NOTES = 'facilitatorNotes';

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toFacilitatorNote(id: string, data: FirebaseFirestore.DocumentData): FacilitatorNoteDTO {
    return { id, content: data.content, timestamp: toDate(data.timestamp), retrospectiveId: data.retrospectiveId, facilitatorId: data.facilitatorId };
}

/**
 * Read/write Admin SDK access to the facilitatorNotes collection (feature 019). Every
 * read/write is scoped by facilitatorId === caller uid (FR-013) — editNote/deleteNote
 * throw ForbiddenError if the caller isn't the note's author, never trusting a
 * caller-supplied facilitatorId for the scoping itself.
 */
export class FirestoreFacilitatorNoteAdapter implements FacilitatorNotePort {
    constructor(private readonly db: Firestore) {}

    async listNotesForFacilitator(retrospectiveId: string, facilitatorId: string): Promise<FacilitatorNoteDTO[]> {
        const snap = await this.db
            .collection(FACILITATOR_NOTES)
            .where('retrospectiveId', '==', retrospectiveId)
            .where('facilitatorId', '==', facilitatorId)
            .get();
        return snap.docs.map((doc) => toFacilitatorNote(doc.id, doc.data()));
    }

    async getNote(noteId: string): Promise<FacilitatorNoteDTO | null> {
        const snap = await this.db.collection(FACILITATOR_NOTES).doc(noteId).get();
        if (!snap.exists) return null;
        return toFacilitatorNote(snap.id, snap.data()!);
    }

    async createNote(retrospectiveId: string, facilitatorId: string, content: string): Promise<FacilitatorNoteDTO> {
        const noteRef = this.db.collection(FACILITATOR_NOTES).doc();
        const noteData = { content, retrospectiveId, facilitatorId, timestamp: FieldValue.serverTimestamp() };
        await noteRef.set(noteData);
        // serverTimestamp() only resolves after commit — return a client-side Date so
        // the caller gets a usable timestamp immediately rather than null.
        return toFacilitatorNote(noteRef.id, { ...noteData, timestamp: new Date() });
    }

    private async requireAuthor(noteId: string, uid: string): Promise<FirebaseFirestore.DocumentReference> {
        const noteRef = this.db.collection(FACILITATOR_NOTES).doc(noteId);
        const snap = await noteRef.get();
        if (!snap.exists) throw new NotFoundError('Note not found');
        if (snap.data()!.facilitatorId !== uid) throw new ForbiddenError("Not this note's author");
        return noteRef;
    }

    async editNote(noteId: string, uid: string, content: string): Promise<FacilitatorNoteDTO> {
        const noteRef = await this.requireAuthor(noteId, uid);
        await noteRef.update({ content, timestamp: FieldValue.serverTimestamp() });
        const updated = await noteRef.get();
        return toFacilitatorNote(updated.id, updated.data()!);
    }

    async deleteNote(noteId: string, uid: string): Promise<void> {
        const noteRef = await this.requireAuthor(noteId, uid);
        await noteRef.delete();
    }
}
