import { setTypingStatus } from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { TypingStatusUpdate } from '@/features/boards/types/typing';

/**
 * Thin write-forwarding layer for typing-status updates (feature 019, US3; retimed in
 * feature 026, research.md §2). Every call is written unconditionally, with no
 * time-based auto-deactivation of its own — a previous version raced its own 300ms
 * auto-deactivation timer against useTypingStatus's decision, which was the root cause
 * of the typing indicator flickering on and off while a user was still actively typing.
 * Deciding *when* a user has stopped typing remains useTypingStatus's sole
 * responsibility. Reads come from useRetrospectiveRealtimeSync's live channel, not this
 * service.
 *
 * Writes for the same participant+column are additionally serialized (feature 027,
 * research.md §2): without this, two in-flight requests for the same key had no
 * ordering guarantee, so a late-arriving `isActive:true` could reach the server after a
 * subsequent `isActive:false`, resurrecting a "ghost" typing indicator in a column the
 * participant had already left. A failed write is discarded, not retried, so it never
 * blocks the next queued write for that key (FR-007) — the server's disconnect-safety
 * TTL sweep is the fallback correction path for that case.
 */
export class OptimizedTypingStatusService {
    private static pendingWrites = new Map<string, Promise<void>>();

    static setTypingStatusDebounced(update: TypingStatusUpdate): void {
        const key = `${update.retrospectiveId}_${update.column}`;
        const priorWrite = this.pendingWrites.get(key);
        const write = priorWrite
            ? priorWrite.then(() => this.setTypingStatusImmediate(update))
            : this.setTypingStatusImmediate(update);

        this.pendingWrites.set(key, write);
        void write.finally(() => {
            if (this.pendingWrites.get(key) === write) {
                this.pendingWrites.delete(key);
            }
        });
    }

    private static async setTypingStatusImmediate(update: TypingStatusUpdate): Promise<void> {
        try {
            await setTypingStatus(update.retrospectiveId, update.column, update.isActive);
        } catch (error) {
            console.error('Error actualizando estado de escritura:', error);
        }
    }

    /**
     * Limpiar todos los estados de escritura de un usuario
     * @param userId - ID del usuario
     * @param retrospectiveId - ID de la retrospectiva
     */
    static async cleanupUserTypingStatus(userId: string, retrospectiveId: string): Promise<void> {
        const columns = ['helped', 'hindered', 'improve'];

        const cleanupPromises = columns.map(column =>
            this.setTypingStatusImmediate({
                retrospectiveId,
                userId,
                column: column as 'helped' | 'hindered' | 'improve',
                username: '',
                isActive: false
            })
        );

        await Promise.all(cleanupPromises);
    }
}
