import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { CreateParticipantInput, Participant, ParticipantPort } from '../../application/ports/boards';
import { PARTICIPANTS, RETROSPECTIVES } from './collections';
import { toDate } from './firestoreUtil';

/**
 * Admin SDK access to the `participants` collection (data-model.md). Presence
 * (active/inactive) is set by the SSE connection lifecycle (routes/boards.ts's
 * handleBoardEvents) via setActive() — persisted here (not kept purely in-memory) so the
 * change fans out to every connected client through the existing `participants` listener,
 * correctly even across horizontally-scaled serverless instances (research.md §1).
 */
export class FirestoreParticipantAdapter implements ParticipantPort {
    constructor(private readonly db: Firestore) {}

    async listParticipants(retrospectiveId: string): Promise<Participant[]> {
        const boardSnap = await this.db.collection(RETROSPECTIVES).doc(retrospectiveId).get();
        const createdBy = boardSnap.exists ? boardSnap.data()!.createdBy : undefined;

        const snap = await this.db.collection(PARTICIPANTS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => this.toParticipant(doc.id, doc.data(), createdBy));
    }

    async getParticipantByUser(retrospectiveId: string, userId: string): Promise<Participant | null> {
        const snap = await this.db
            .collection(PARTICIPANTS)
            .where('retrospectiveId', '==', retrospectiveId)
            .where('userId', '==', userId)
            .limit(1)
            .get();
        if (snap.empty) return null;

        const boardSnap = await this.db.collection(RETROSPECTIVES).doc(retrospectiveId).get();
        const createdBy = boardSnap.exists ? boardSnap.data()!.createdBy : undefined;
        const doc = snap.docs[0];
        return this.toParticipant(doc.id, doc.data(), createdBy);
    }

    async addParticipant(input: CreateParticipantInput): Promise<{ participant: Participant; isNew: boolean }> {
        const existing = await this.getParticipantByUser(input.retrospectiveId, input.userId);
        if (existing) return { participant: existing, isNew: false };

        const ref = this.db.collection(PARTICIPANTS).doc();
        await ref.set({
            retrospectiveId: input.retrospectiveId,
            userId: input.userId,
            name: input.name,
            photoURL: input.photoURL,
            joinedAt: FieldValue.serverTimestamp(),
            isActive: false,
        });

        const created = await this.getParticipantByUser(input.retrospectiveId, input.userId);
        return { participant: created!, isNew: true };
    }

    async setActive(participantId: string, isActive: boolean): Promise<void> {
        await this.db.collection(PARTICIPANTS).doc(participantId).update({ isActive });
    }

    async listParticipantRecordsForUser(userId: string): Promise<Participant[]> {
        const snap = await this.db.collection(PARTICIPANTS).where('userId', '==', userId).get();
        // `isFacilitator` is irrelevant to this query's one caller (ListBoards only reads
        // `retrospectiveId` off these records) — computing it would mean an extra board
        // read per record, so it's left false rather than fetched needlessly.
        return snap.docs.map((doc) => this.toParticipant(doc.id, doc.data(), undefined));
    }

    private toParticipant(id: string, data: FirebaseFirestore.DocumentData, boardCreatedBy: string | undefined): Participant {
        return {
            id,
            retrospectiveId: data.retrospectiveId,
            userId: data.userId,
            name: data.name,
            photoURL: data.photoURL ?? null,
            joinedAt: toDate(data.joinedAt),
            isFacilitator: boardCreatedBy !== undefined && data.userId === boardCreatedBy,
            isActive: data.isActive ?? false,
        };
    }
}
