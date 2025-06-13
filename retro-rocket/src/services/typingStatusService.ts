import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { TypingStatus, TypingStatusUpdate } from '../types/typing';

const TYPING_COLLECTION = 'typingStatus';
const TYPING_TIMEOUT = 6000; // 6 seconds timeout (more tolerance for network delays)

/**
 * Service to manage real-time typing status for collaborative card creation
 */
export class TypingStatusService {
    private static readonly cleanupTimers = new Map<string, NodeJS.Timeout>();

    /**
     * Set user's typing status for a specific column
     */
    static async setTypingStatus(update: TypingStatusUpdate): Promise<void> {
        try {
            const typingId = `${update.retrospectiveId}_${update.userId}_${update.column}`;

            if (update.isActive) {
                const typingRef = doc(db as any, TYPING_COLLECTION, typingId);

                await setDoc(typingRef, {
                    id: typingId,
                    userId: update.userId,
                    username: update.username,
                    retrospectiveId: update.retrospectiveId,
                    column: update.column,
                    timestamp: serverTimestamp(),
                    isActive: true,
                });

                // Set auto-cleanup timer
                this.setCleanupTimer(typingId, update);
            } else {
                const typingRef = doc(db as any, TYPING_COLLECTION, typingId);
                await deleteDoc(typingRef);
                this.clearCleanupTimer(typingId);
            }
        } catch (error) {
            console.error('Error updating typing status:', error);
        }
    }

    /**
     * Subscribe to typing status changes for a retrospective
     */
    static subscribeToTypingStatus(
        retrospectiveId: string,
        callback: (typingStatuses: TypingStatus[]) => void
    ): () => void {
        try {
            const q = query(
                collection(db as any, TYPING_COLLECTION),
                where('retrospectiveId', '==', retrospectiveId),
                where('isActive', '==', true)
            );

            return onSnapshot(q, (snapshot) => {
                const typingStatuses: TypingStatus[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    // Check if the typing status is still valid (not expired)
                    const timestamp = data.timestamp as Timestamp;
                    const now = new Date();
                    const typingTime = timestamp ? timestamp.toDate() : new Date();
                    const timeDiff = now.getTime() - typingTime.getTime();

                    if (timeDiff < TYPING_TIMEOUT) {
                        typingStatuses.push({
                            id: doc.id,
                            userId: data.userId,
                            username: data.username,
                            retrospectiveId: data.retrospectiveId,
                            column: data.column,
                            timestamp: typingTime,
                            isActive: data.isActive,
                        });
                    } else {
                        // Auto-cleanup expired entries
                        this.cleanupExpiredStatus(doc.id);
                    }
                });

                callback(typingStatuses);
            });
        } catch (error) {
            console.error('Error subscribing to typing status:', error);
            return () => { };
        }
    }

    /**
     * Set a cleanup timer for a typing status
     */
    private static setCleanupTimer(typingId: string, update: TypingStatusUpdate): void {
        // Clear existing timer if any
        this.clearCleanupTimer(typingId);

        // Set new timer
        const timer = setTimeout(async () => {
            await this.setTypingStatus({ ...update, isActive: false });
            this.clearCleanupTimer(typingId);
        }, TYPING_TIMEOUT);

        this.cleanupTimers.set(typingId, timer);
    }

    /**
     * Clear cleanup timer for a typing status
     */
    private static clearCleanupTimer(typingId: string): void {
        const timer = this.cleanupTimers.get(typingId);
        if (timer) {
            clearTimeout(timer);
            this.cleanupTimers.delete(typingId);
        }
    }

    /**
     * Cleanup expired typing status
     */
    private static async cleanupExpiredStatus(typingId: string): Promise<void> {
        try {
            const typingRef = doc(db as any, TYPING_COLLECTION, typingId);
            await deleteDoc(typingRef);
            this.clearCleanupTimer(typingId);
        } catch (error) {
            console.error('Error cleaning up expired typing status:', error);
        }
    }

    /**
     * Cleanup all typing statuses for a user (useful for page unload)
     */
    static async cleanupUserTypingStatus(userId: string, retrospectiveId: string): Promise<void> {
        try {
            const columns = ['helped', 'hindered', 'improve'];

            await Promise.all(
                columns.map(async (column) => {
                    const typingId = `${retrospectiveId}_${userId}_${column}`;
                    const typingRef = doc(db as any, TYPING_COLLECTION, typingId);
                    await deleteDoc(typingRef);
                    this.clearCleanupTimer(typingId);
                })
            );
        } catch (error) {
            console.error('Error cleaning up user typing status:', error);
        }
    }
}
