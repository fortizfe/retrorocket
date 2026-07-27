import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { TypingPort, TypingStatus } from '../../application/ports/cards';
import { TYPING_STATUS } from './collections';
import { toDate } from './firestoreUtil';

/** Staleness window: a typing status older than this is not surfaced (matches today's UX). */
const STALE_MS = 6_000;

/**
 * Admin SDK access to the `typingStatus` collection. Single canonical implementation
 * (research.md §4 — replacing the two duplicate frontend implementations), keyed
 * deterministically so a given user+column has exactly one doc, and generalized to any
 * column id rather than a hardcoded list.
 */
export class FirestoreTypingAdapter implements TypingPort {
    constructor(private readonly db: Firestore) {}

    async setTypingStatus(retrospectiveId: string, userId: string, username: string, column: string, isActive: boolean): Promise<void> {
        const id = `${retrospectiveId}_${userId}_${column}`;
        if (!isActive) {
            await this.db.collection(TYPING_STATUS).doc(id).delete();
            return;
        }
        await this.db.collection(TYPING_STATUS).doc(id).set({
            userId,
            username,
            retrospectiveId,
            column,
            isActive: true,
            timestamp: FieldValue.serverTimestamp(),
        });
    }

    async listTypingStatuses(retrospectiveId: string): Promise<TypingStatus[]> {
        const snap = await this.db.collection(TYPING_STATUS).where('retrospectiveId', '==', retrospectiveId).get();
        const now = Date.now();
        return snap.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    userId: data.userId as string,
                    username: data.username as string,
                    column: data.column as string,
                    isActive: data.isActive ?? true,
                    timestamp: toDate(data.timestamp),
                };
            })
            .filter((status) => now - status.timestamp.getTime() < STALE_MS);
    }
}
