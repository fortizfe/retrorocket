import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { TypingStatusDTO, TypingStatusPort } from '../../application/ports/typing';

const TYPING_STATUS = 'typingStatus';

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function typingStatusDocId(retrospectiveId: string, userId: string, column: string): string {
    return `${retrospectiveId}_${userId}_${column}`;
}

export function toTypingStatus(id: string, data: FirebaseFirestore.DocumentData): TypingStatusDTO {
    return {
        id,
        userId: data.userId,
        username: data.username,
        retrospectiveId: data.retrospectiveId,
        column: data.column,
        timestamp: toDate(data.timestamp),
    };
}

/**
 * Read/write Admin SDK access to the typingStatus collection (feature 019, US3).
 * Deterministic doc id `{retroId}_{userId}_{column}`; isActive:false deletes the doc
 * rather than setting a field (data-model.md). The 5000ms hard TTL is enforced
 * server-side by FirestoreRealtimeGatewayAdapter's sweep, not here.
 */
export class FirestoreTypingStatusAdapter implements TypingStatusPort {
    constructor(private readonly db: Firestore) {}

    async setTypingStatus(retrospectiveId: string, userId: string, username: string, column: string, isActive: boolean): Promise<void> {
        const docRef = this.db.collection(TYPING_STATUS).doc(typingStatusDocId(retrospectiveId, userId, column));
        if (!isActive) {
            await docRef.delete();
            return;
        }
        await docRef.set({ userId, username, retrospectiveId, column, timestamp: FieldValue.serverTimestamp() });
    }

    async listActive(retrospectiveId: string): Promise<TypingStatusDTO[]> {
        const snap = await this.db.collection(TYPING_STATUS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => toTypingStatus(doc.id, doc.data()));
    }
}
