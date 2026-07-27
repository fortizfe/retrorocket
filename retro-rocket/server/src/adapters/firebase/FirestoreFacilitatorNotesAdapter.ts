import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { FacilitatorNote, FacilitatorNotesPort } from '../../application/ports/facilitator';
import { FACILITATOR_NOTES } from './collections';
import { toDate } from './firestoreUtil';

/**
 * Admin SDK access to the `facilitatorNotes` collection. This is the collection where
 * research.md §2 found the current Firestore rule to be dead code — any authenticated
 * user could read another facilitator's private notes directly via the client SDK. The
 * backend (via CreateNote/UpdateNote/DeleteNote's isFacilitator/ownership checks) is
 * where that restriction becomes real for the first time.
 */
export class FirestoreFacilitatorNotesAdapter implements FacilitatorNotesPort {
    constructor(private readonly db: Firestore) {}

    async listNotes(retrospectiveId: string, facilitatorId: string): Promise<FacilitatorNote[]> {
        const snap = await this.db
            .collection(FACILITATOR_NOTES)
            .where('retrospectiveId', '==', retrospectiveId)
            .where('facilitatorId', '==', facilitatorId)
            .get();
        return snap.docs
            .map((doc) => this.toNote(doc.id, doc.data()))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async getNote(noteId: string): Promise<FacilitatorNote | null> {
        const doc = await this.db.collection(FACILITATOR_NOTES).doc(noteId).get();
        if (!doc.exists) return null;
        return this.toNote(doc.id, doc.data()!);
    }

    async createNote(retrospectiveId: string, facilitatorId: string, content: string): Promise<FacilitatorNote> {
        const ref = this.db.collection(FACILITATOR_NOTES).doc();
        const now = FieldValue.serverTimestamp();
        await ref.set({ retrospectiveId, facilitatorId, content, createdAt: now, updatedAt: now });
        return (await this.getNote(ref.id))!;
    }

    async updateNote(noteId: string, content: string): Promise<FacilitatorNote> {
        await this.db.collection(FACILITATOR_NOTES).doc(noteId).update({ content, updatedAt: FieldValue.serverTimestamp() });
        return (await this.getNote(noteId))!;
    }

    async deleteNote(noteId: string): Promise<void> {
        await this.db.collection(FACILITATOR_NOTES).doc(noteId).delete();
    }

    private toNote(id: string, data: FirebaseFirestore.DocumentData): FacilitatorNote {
        return {
            id,
            retrospectiveId: data.retrospectiveId,
            facilitatorId: data.facilitatorId,
            content: data.content,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
        };
    }
}
