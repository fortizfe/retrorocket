import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type {
    ColumnDTO,
    ColumnGroupingStates,
    CountdownTimerDTO,
    ParticipantDTO,
    ParticipantPort,
    RetrospectiveBoardPort,
    RetrospectiveDTO,
} from '../../application/ports/retrospective';
import { ForbiddenError, NotFoundError } from '../../domain/errors';

const RETROSPECTIVES = 'retrospectives';
const COLUMNS = 'columns';
const PARTICIPANTS = 'participants';
const COUNTDOWN_TIMERS = 'countdown_timers';

/**
 * Exported so this pure mapping logic can be unit-tested directly — the rest of the
 * adapter is thin firebase-admin query composition that, consistent with
 * FirestoreBoardsAdapter/FirestoreProfileAdapter elsewhere in this codebase, is
 * verified end-to-end by the Playwright E2E suite against the emulator rather than
 * mocked at the Vitest level.
 */
export function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toRetrospective(id: string, data: FirebaseFirestore.DocumentData): RetrospectiveDTO {
    return {
        id,
        title: data.title,
        description: data.description,
        templateId: data.templateId,
        createdBy: data.createdBy,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        participantCount: data.participantCount ?? 0,
        isActive: data.isActive ?? true,
        // Gap noted in data-model.md: persisted today but absent from the pre-019
        // Retrospective TS type — default to {} for boards that predate this field.
        columnGroupingStates: (data.columnGroupingStates as ColumnGroupingStates) ?? {},
        isAnonymous: (data.isAnonymous as boolean) ?? false,
    };
}

export function toColumn(id: string, data: FirebaseFirestore.DocumentData): ColumnDTO {
    return { id, i18nKey: data.i18nKey, type: data.type, order: data.order, defaultColor: data.defaultColor };
}

export function toParticipant(id: string, data: FirebaseFirestore.DocumentData): ParticipantDTO {
    return {
        id,
        name: data.name,
        userId: data.userId,
        retrospectiveId: data.retrospectiveId,
        joinedAt: toDate(data.joinedAt),
        photoURL: data.photoURL ?? null,
        isActive: data.isActive ?? true,
    };
}

/**
 * Splits an array into chunks of at most `size` elements — exported so the ≤500-doc
 * Firestore batch-write limit's chunking logic (renameParticipantsForUser) can be
 * unit-tested directly, mirroring toDate/toParticipant's precedent (this file's test
 * suite has no dedicated Firestore mock).
 */
export function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export function toTimer(retrospectiveId: string, data: FirebaseFirestore.DocumentData): CountdownTimerDTO {
    return {
        retrospectiveId,
        startTime: data.startTime ? toDate(data.startTime) : null,
        duration: data.duration,
        originalDuration: data.originalDuration,
        isRunning: data.isRunning ?? false,
        isPaused: data.isPaused ?? false,
        endTime: data.endTime ? toDate(data.endTime) : null,
        createdBy: data.createdBy,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
    };
}

/**
 * Read/write Admin SDK access to the retrospectives/{id} document (metadata, columns,
 * column-grouping display preference, shared countdown timer) plus the participants
 * collection's write side (ParticipantPort) for the retrospective board screen
 * (feature 019).
 */
export class FirestoreRetrospectiveBoardAdapter implements RetrospectiveBoardPort, ParticipantPort {
    constructor(private readonly db: Firestore) {}

    async getRetrospective(id: string): Promise<RetrospectiveDTO | null> {
        const snap = await this.db.collection(RETROSPECTIVES).doc(id).get();
        if (!snap.exists) return null;
        return toRetrospective(snap.id, snap.data()!);
    }

    async listColumns(retrospectiveId: string): Promise<ColumnDTO[]> {
        const snap = await this.db.collection(RETROSPECTIVES).doc(retrospectiveId).collection(COLUMNS).orderBy('order').get();
        return snap.docs.map((doc) => toColumn(doc.id, doc.data()));
    }

    async saveColumnGroupingState(retrospectiveId: string, states: ColumnGroupingStates): Promise<void> {
        const docRef = this.db.collection(RETROSPECTIVES).doc(retrospectiveId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('El tablero especificado no existe o no está disponible');
        await docRef.update({ columnGroupingStates: states, updatedAt: FieldValue.serverTimestamp() });
    }

    async listParticipants(retrospectiveId: string): Promise<ParticipantDTO[]> {
        const snap = await this.db.collection(PARTICIPANTS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => toParticipant(doc.id, doc.data()));
    }

    async join(retrospectiveId: string, uid: string, userName: string, photoURL: string | null, knownBoard?: RetrospectiveDTO): Promise<ParticipantDTO> {
        const boardRef = this.db.collection(RETROSPECTIVES).doc(retrospectiveId);
        // 040, FR-001: skip this read entirely when the caller (JoinRetrospective)
        // already fetched the board this reconnection cycle — avoids a redundant
        // second read of the same retrospectives/{id} document. Callers that haven't
        // already fetched it (knownBoard undefined) get the original behavior.
        if (knownBoard) {
            if (!knownBoard.isActive) {
                throw new NotFoundError('El tablero especificado no existe o no está disponible');
            }
        } else {
            const boardSnap = await boardRef.get();
            if (!boardSnap.exists || boardSnap.data()?.isActive !== true) {
                throw new NotFoundError('El tablero especificado no existe o no está disponible');
            }
        }

        // A query-then-write existence check outside a transaction (this.db.collection
        // (...).where(...).get() followed by a separate write) is racy under concurrent
        // calls for the same uid — e.g. React StrictMode's intentional double-
        // invocation of mount effects in dev, or a genuine double-click/reconnect —
        // since both calls can observe "not yet a participant" before either writes,
        // producing two participant docs and a double-incremented participantCount
        // despite FR-005's idempotency requirement. Running the same query *inside* a
        // transaction fixes this: Firestore tracks the query's read set and retries the
        // whole transaction if a concurring commit would change its result (e.g. the
        // other call's insert), so only one of the two ever proceeds past the check.
        // Matches by (retrospectiveId, userId) rather than a deterministic doc id
        // because 017's createBoard already seeds the creator's own participant doc
        // with an auto-generated id (boards-wiring.ts) — a different id scheme this
        // adapter must still recognize as "already joined".
        const participantsQuery = this.db.collection(PARTICIPANTS).where('retrospectiveId', '==', retrospectiveId).where('userId', '==', uid).limit(1);

        return this.db.runTransaction(async (tx) => {
            const existing = await tx.get(participantsQuery);
            if (!existing.empty) {
                return toParticipant(existing.docs[0].id, existing.docs[0].data());
            }
            const participantRef = this.db.collection(PARTICIPANTS).doc();
            const participantData = {
                retrospectiveId,
                userId: uid,
                name: userName,
                photoURL,
                joinedAt: FieldValue.serverTimestamp(),
                isActive: true,
            };
            tx.set(participantRef, participantData);
            tx.update(boardRef, { participantCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
            // serverTimestamp() only resolves after commit — return a client-side Date
            // so the caller gets a usable joinedAt immediately rather than null.
            return toParticipant(participantRef.id, { ...participantData, joinedAt: new Date() });
        });
    }

    async renameParticipantsForUser(uid: string, name: string): Promise<void> {
        const snap = await this.db.collection(PARTICIPANTS).where('userId', '==', uid).get();
        if (snap.empty) return;
        for (const docs of chunk(snap.docs, 500)) {
            const batch = this.db.batch();
            docs.forEach((doc) => batch.update(doc.ref, { name }));
            await batch.commit();
        }
    }

    async getTimer(retrospectiveId: string): Promise<CountdownTimerDTO | null> {
        const snap = await this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId).get();
        if (!snap.exists) return null;
        return toTimer(retrospectiveId, snap.data()!);
    }

    private async requireFacilitator(retrospectiveId: string, uid: string): Promise<void> {
        const boardSnap = await this.db.collection(RETROSPECTIVES).doc(retrospectiveId).get();
        if (!boardSnap.exists) throw new NotFoundError('El tablero especificado no existe o no está disponible');
        if (boardSnap.data()?.createdBy !== uid) throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
    }

    async configureTimer(retrospectiveId: string, uid: string, duration: number): Promise<CountdownTimerDTO> {
        await this.requireFacilitator(retrospectiveId, uid);
        const docRef = this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId);
        const existing = await docRef.get();
        await docRef.set(
            {
                duration,
                originalDuration: duration,
                isRunning: false,
                isPaused: false,
                startTime: null,
                endTime: null,
                createdBy: uid,
                createdAt: existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: false },
        );
        const snap = await docRef.get();
        return toTimer(retrospectiveId, snap.data()!);
    }

    async startTimer(retrospectiveId: string, uid: string): Promise<CountdownTimerDTO> {
        await this.requireFacilitator(retrospectiveId, uid);
        const docRef = this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('No timer configured for this board');
        const data = snap.data()!;
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + data.duration * 1000);
        await docRef.update({
            isRunning: true,
            isPaused: false,
            startTime: FieldValue.serverTimestamp(),
            endTime,
            updatedAt: FieldValue.serverTimestamp(),
        });
        const updated = await docRef.get();
        return toTimer(retrospectiveId, { ...updated.data()!, startTime });
    }

    async pauseTimer(retrospectiveId: string, uid: string): Promise<CountdownTimerDTO> {
        await this.requireFacilitator(retrospectiveId, uid);
        const docRef = this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('No timer configured for this board');
        const data = snap.data()!;
        let duration = data.duration;
        if (data.isRunning && data.startTime) {
            const elapsedSeconds = Math.floor((Date.now() - toDate(data.startTime).getTime()) / 1000);
            duration = Math.max(0, data.duration - elapsedSeconds);
        }
        await docRef.update({ duration, isRunning: false, isPaused: true, updatedAt: FieldValue.serverTimestamp() });
        const updated = await docRef.get();
        return toTimer(retrospectiveId, updated.data()!);
    }

    async resetTimer(retrospectiveId: string, uid: string): Promise<CountdownTimerDTO> {
        await this.requireFacilitator(retrospectiveId, uid);
        const docRef = this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('No timer configured for this board');
        const originalDuration = snap.data()!.originalDuration;
        await docRef.update({
            duration: originalDuration,
            isRunning: false,
            isPaused: false,
            startTime: null,
            endTime: null,
            updatedAt: FieldValue.serverTimestamp(),
        });
        const updated = await docRef.get();
        return toTimer(retrospectiveId, updated.data()!);
    }

    async deleteTimer(retrospectiveId: string, uid: string): Promise<void> {
        await this.requireFacilitator(retrospectiveId, uid);
        await this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId).delete();
    }

    async setAnonymous(retrospectiveId: string, uid: string, isAnonymous: boolean): Promise<RetrospectiveDTO> {
        await this.requireFacilitator(retrospectiveId, uid);
        const docRef = this.db.collection(RETROSPECTIVES).doc(retrospectiveId);
        await docRef.update({ isAnonymous, updatedAt: FieldValue.serverTimestamp() });
        const snap = await docRef.get();
        return toRetrospective(retrospectiveId, snap.data()!);
    }
}
