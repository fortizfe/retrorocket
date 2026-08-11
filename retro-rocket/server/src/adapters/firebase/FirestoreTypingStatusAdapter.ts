import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { TypingStatusPort } from '../../application/ports/typing';

const TYPING_STATUS = 'typingStatus';

export function typingStatusDocId(retrospectiveId: string, userId: string, column: string): string {
    return `${retrospectiveId}_${userId}_${column}`;
}

/**
 * Read/write Admin SDK access to the typingStatus collection (feature 019, US3).
 * Deterministic doc id `{retroId}_{userId}_{column}`; isActive:false deletes the doc
 * rather than setting a field (data-model.md). The 3000ms hard TTL (feature 026) is
 * enforced server-side by FirestoreRealtimeGatewayAdapter's sweep, not here.
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
}
