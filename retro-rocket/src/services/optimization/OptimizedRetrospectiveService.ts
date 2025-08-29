import {
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    query,
    where,
    collection,
    orderBy,
    limit as firestoreLimit,
    getDocs,
    increment
} from 'firebase/firestore';
import { db, FIRESTORE_COLLECTIONS } from '../firebase';
import { Retrospective } from '../../types/retrospective';
import { FirebaseMetricsService } from './FirebaseMetricsService';

export interface SoftDeleteRetrospective extends Retrospective {
    isDeleted?: boolean;
    deletedAt?: Date;
    deletedBy?: string;
}

/**
 * Optimized Retrospective Service with soft delete and performance optimizations
 * Implements soft delete to avoid permanent data loss and improve performance
 */
export class OptimizedRetrospectiveService {
    /**
     * Soft delete a retrospective (mark as deleted without removing data)
     * This is much faster than hard delete and allows data recovery
     */
    static async softDeleteRetrospective(
        retrospectiveId: string,
        userId: string
    ): Promise<void> {
        try {
            const docRef = doc(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);

            await updateDoc(docRef, {
                isDeleted: true,
                deletedAt: serverTimestamp(),
                deletedBy: userId,
                updatedAt: serverTimestamp()
            });

            FirebaseMetricsService.recordWrite('retrospectives-soft-delete', 1);
            console.log(`Retrospective ${retrospectiveId} soft deleted by ${userId}`);
        } catch (error) {
            console.error('Error soft deleting retrospective:', error);
            throw new Error('Could not delete retrospective');
        }
    }

    /**
     * Restore a soft-deleted retrospective
     */
    static async restoreRetrospective(retrospectiveId: string): Promise<void> {
        try {
            const docRef = doc(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);

            await updateDoc(docRef, {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                updatedAt: serverTimestamp()
            });

            FirebaseMetricsService.recordWrite('retrospectives-restore', 1);
            console.log(`Retrospective ${retrospectiveId} restored`);
        } catch (error) {
            console.error('Error restoring retrospective:', error);
            throw new Error('Could not restore retrospective');
        }
    }

    /**
     * Subscribe to active retrospectives only (not soft-deleted)
     * Optimized to filter out deleted retrospectives at the database level
     */
    static subscribeToActiveRetrospectives(
        userId: string,
        callback: (retrospectives: Retrospective[]) => void,
        limit?: number
    ): (() => void) {
        try {
            let q = query(
                collection(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES),
                where('facilitator', '==', userId),
                where('isDeleted', '!=', true), // Filter out soft-deleted at DB level
                orderBy('updatedAt', 'desc')
            );

            if (limit) {
                q = query(q, firestoreLimit(limit));
            }

            return onSnapshot(q, (snapshot) => {
                const retrospectives = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
                    } as Retrospective;
                });

                FirebaseMetricsService.recordRead('retrospectives-active-list', retrospectives.length);
                callback(retrospectives);
            });
        } catch (error) {
            console.error('Error subscribing to active retrospectives:', error);
            return () => { };
        }
    }

    /**
     * Subscribe to a single retrospective, handling soft delete status
     */
    static subscribeToRetrospective(
        retrospectiveId: string,
        callback: (retrospective: SoftDeleteRetrospective | null) => void,
        includeDeleted: boolean = false
    ): (() => void) {
        try {
            const docRef = doc(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);

            return onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    const retrospective: SoftDeleteRetrospective = {
                        id: doc.id,
                        ...data,
                        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
                        deletedAt: (data.deletedAt as Timestamp)?.toDate() || undefined
                    } as SoftDeleteRetrospective;

                    // If retrospective is soft-deleted and we don't want to include deleted ones
                    if (retrospective.isDeleted && !includeDeleted) {
                        callback(null);
                        return;
                    }

                    FirebaseMetricsService.recordRead('retrospectives-single', 1);
                    callback(retrospective);
                } else {
                    callback(null);
                }
            }, (error) => {
                console.error('Error subscribing to retrospective:', error);
                callback(null);
            });
        } catch (error) {
            console.error('Error setting up retrospective subscription:', error);
            return () => { };
        }
    }

    /**
     * Get soft-deleted retrospectives for admin/recovery purposes
     */
    static async getSoftDeletedRetrospectives(
        userId: string,
        limit: number = 50
    ): Promise<SoftDeleteRetrospective[]> {
        try {
            const q = query(
                collection(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES),
                where('facilitator', '==', userId),
                where('isDeleted', '==', true),
                orderBy('deletedAt', 'desc'),
                firestoreLimit(limit)
            );

            const snapshot = await getDocs(q);
            const retrospectives = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                    updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
                    deletedAt: (data.deletedAt as Timestamp)?.toDate() || undefined
                } as SoftDeleteRetrospective;
            });

            FirebaseMetricsService.recordRead('retrospectives-soft-deleted', retrospectives.length);
            return retrospectives;
        } catch (error) {
            console.error('Error getting soft-deleted retrospectives:', error);
            return [];
        }
    }

    /**
     * Permanently delete retrospectives that have been soft-deleted for a certain period
     * This is for cleanup/archival purposes and should be run periodically
     */
    static async cleanupOldSoftDeletedRetrospectives(
        daysOld: number = 90
    ): Promise<{ cleaned: number; errors: number }> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const q = query(
                collection(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES),
                where('isDeleted', '==', true),
                where('deletedAt', '<=', cutoffDate)
            );

            const snapshot = await getDocs(q);
            let cleaned = 0;
            let errors = 0;

            // Note: In a production environment, this should use batch operations
            // for better performance with large datasets
            for (const document of snapshot.docs) {
                try {
                    // Here we would typically move to archive collection
                    // For now, we just mark for later cleanup
                    await updateDoc(document.ref, {
                        markedForPermanentDeletion: true,
                        markedAt: serverTimestamp()
                    });
                    cleaned++;
                } catch (error) {
                    console.error(`Error marking document ${document.id} for cleanup:`, error);
                    errors++;
                }
            }

            FirebaseMetricsService.recordWrite('retrospectives-cleanup', cleaned);
            console.log(`Cleanup completed: ${cleaned} marked for deletion, ${errors} errors`);

            return { cleaned, errors };
        } catch (error) {
            console.error('Error during cleanup operation:', error);
            return { cleaned: 0, errors: 1 };
        }
    }

    /**
     * Get statistics about retrospectives
     */
    static async getRetrospectiveStats(userId: string): Promise<{
        active: number;
        softDeleted: number;
        total: number;
    }> {
        try {
            // Count active retrospectives
            const activeQuery = query(
                collection(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES),
                where('facilitator', '==', userId),
                where('isDeleted', '!=', true)
            );

            // Count soft-deleted retrospectives
            const deletedQuery = query(
                collection(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES),
                where('facilitator', '==', userId),
                where('isDeleted', '==', true)
            );

            const [activeSnapshot, deletedSnapshot] = await Promise.all([
                getDocs(activeQuery),
                getDocs(deletedQuery)
            ]);

            const active = activeSnapshot.size;
            const softDeleted = deletedSnapshot.size;
            const total = active + softDeleted;

            FirebaseMetricsService.recordRead('retrospectives-stats', 2);

            return { active, softDeleted, total };
        } catch (error) {
            console.error('Error getting retrospective stats:', error);
            return { active: 0, softDeleted: 0, total: 0 };
        }
    }

    /**
     * Increment participant count for a retrospective
     */
    static async incrementParticipantCount(retrospectiveId: string): Promise<void> {
        try {
            const docRef = doc(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);

            await updateDoc(docRef, {
                participantCount: increment(1),
                updatedAt: serverTimestamp()
            });

            FirebaseMetricsService.recordWrite('retrospectives-increment-participants', 1);
            console.log(`Participant count incremented for retrospective ${retrospectiveId}`);
        } catch (error) {
            console.error('Error incrementing participant count:', error);
            throw new Error('Could not increment participant count');
        }
    }

    /**
     * Decrement participant count for a retrospective
     */
    static async decrementParticipantCount(retrospectiveId: string): Promise<void> {
        try {
            const docRef = doc(db as any, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);

            await updateDoc(docRef, {
                participantCount: increment(-1),
                updatedAt: serverTimestamp()
            });

            FirebaseMetricsService.recordWrite('retrospectives-decrement-participants', 1);
            console.log(`Participant count decremented for retrospective ${retrospectiveId}`);
        } catch (error) {
            console.error('Error decrementing participant count:', error);
            throw new Error('Could not decrement participant count');
        }
    }
}
