import type { Firestore, Query } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { Board, BoardReadPort, BoardWithColumns, BoardWritePort, CreateBoardInput, UpdateBoardInput } from '../../application/ports/boards';
import {
    ACTION_ITEMS,
    CARDS,
    COLUMNS_SUBCOLLECTION,
    COUNTDOWN_TIMERS,
    FACILITATOR_NOTES,
    GROUPS,
    PARTICIPANTS,
    RETROSPECTIVES,
    SENTIMENT_RESULTS,
    TYPING_STATUS,
} from './collections';
import { toDate } from './firestoreUtil';

const BATCH_LIMIT = 500;

/** Deletes every document matched by `query`, chunked to Firestore's 500-write batch limit. */
async function deleteAllMatching(db: Firestore, query: Query): Promise<void> {
    const snap = await query.get();
    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        for (const doc of snap.docs.slice(i, i + BATCH_LIMIT)) batch.delete(doc.ref);
        await batch.commit();
    }
}

/**
 * Admin SDK read/write access to the `retrospectives` collection + its `columns`
 * subcollection (data-model.md "Retrospective Board").
 */
export class FirestoreBoardAdapter implements BoardReadPort, BoardWritePort {
    constructor(private readonly db: Firestore) {}

    async getBoard(boardId: string): Promise<BoardWithColumns | null> {
        const doc = await this.db.collection(RETROSPECTIVES).doc(boardId).get();
        if (!doc.exists) return null;
        return this.toBoardWithColumns(doc.id, doc.data()!);
    }

    async listBoardsCreatedBy(userId: string): Promise<Board[]> {
        const snap = await this.db.collection(RETROSPECTIVES).where('createdBy', '==', userId).get();
        return snap.docs.map((doc) => this.toBoard(doc.id, doc.data()));
    }

    async createBoard(input: CreateBoardInput): Promise<BoardWithColumns> {
        const boardRef = this.db.collection(RETROSPECTIVES).doc();
        const now = FieldValue.serverTimestamp();
        await boardRef.set({
            title: input.title,
            description: input.description ?? null,
            templateId: input.templateId,
            createdBy: input.createdBy,
            createdByName: input.createdByName,
            locale: input.locale,
            createdAt: now,
            updatedAt: now,
            participantCount: 0,
            isActive: true,
        });

        const columnsCollection = boardRef.collection(COLUMNS_SUBCOLLECTION);
        await Promise.all(
            input.columns.map((column) =>
                columnsCollection.doc(column.id).set({
                    i18nKey: column.i18nKey,
                    type: column.type,
                    order: column.order,
                    defaultColor: column.defaultColor,
                    createdAt: now,
                }),
            ),
        );

        const created = await this.getBoard(boardRef.id);
        return created!;
    }

    async incrementParticipantCount(boardId: string): Promise<void> {
        await this.db
            .collection(RETROSPECTIVES)
            .doc(boardId)
            .update({ participantCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    }

    async renameBoard(boardId: string, updates: UpdateBoardInput): Promise<BoardWithColumns> {
        const data: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
        if (updates.title !== undefined) data.title = updates.title;
        if (updates.description !== undefined) data.description = updates.description;
        await this.db.collection(RETROSPECTIVES).doc(boardId).update(data as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
        return (await this.getBoard(boardId))!;
    }

    async deleteBoardCascade(boardId: string): Promise<void> {
        const byBoardId = (collectionName: string) => this.db.collection(collectionName).where('retrospectiveId', '==', boardId);

        await Promise.all([
            deleteAllMatching(this.db, byBoardId(CARDS)),
            deleteAllMatching(this.db, byBoardId(GROUPS)),
            deleteAllMatching(this.db, byBoardId(PARTICIPANTS)),
            deleteAllMatching(this.db, byBoardId(FACILITATOR_NOTES)),
            deleteAllMatching(this.db, byBoardId(ACTION_ITEMS)),
            deleteAllMatching(this.db, byBoardId(SENTIMENT_RESULTS)),
            deleteAllMatching(this.db, byBoardId(TYPING_STATUS)),
            deleteAllMatching(this.db, this.db.collection(RETROSPECTIVES).doc(boardId).collection(COLUMNS_SUBCOLLECTION)),
            this.db.collection(COUNTDOWN_TIMERS).doc(boardId).delete(),
        ]);

        await this.db.collection(RETROSPECTIVES).doc(boardId).delete();
    }

    private toBoard(id: string, data: FirebaseFirestore.DocumentData): Board {
        return {
            id,
            title: data.title,
            description: data.description ?? undefined,
            templateId: data.templateId,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            locale: data.locale,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            participantCount: data.participantCount ?? 0,
            isActive: data.isActive ?? true,
        };
    }

    private async toBoardWithColumns(id: string, data: FirebaseFirestore.DocumentData): Promise<BoardWithColumns> {
        const columnsSnap = await this.db
            .collection(RETROSPECTIVES)
            .doc(id)
            .collection(COLUMNS_SUBCOLLECTION)
            .orderBy('order', 'asc')
            .get();

        return {
            id,
            title: data.title,
            description: data.description ?? undefined,
            templateId: data.templateId,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            locale: data.locale,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            participantCount: data.participantCount ?? 0,
            isActive: data.isActive ?? true,
            columns: columnsSnap.docs.map((doc) => ({
                id: doc.id,
                i18nKey: doc.data().i18nKey,
                type: doc.data().type,
                order: doc.data().order,
                defaultColor: doc.data().defaultColor,
            })),
        };
    }
}
