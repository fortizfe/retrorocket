import { setTypingStatus } from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { TypingStatusUpdate } from '@/features/boards/types/typing';

/**
 * Thin write-forwarding layer for typing-status updates (feature 019, US3; retimed in
 * feature 026, research.md §2). Every call is written immediately and unconditionally —
 * this service holds no timers or state of its own. Deciding *when* a user has stopped
 * typing (inactivity grace period, explicit stop actions) is useTypingStatus's sole
 * responsibility; a previous version of this service also raced its own 300ms
 * auto-deactivation timer against that decision, which was the root cause of the
 * typing indicator flickering on and off while a user was still actively typing.
 * Reads come from useRetrospectiveRealtimeSync's live channel, not this service.
 */
export class OptimizedTypingStatusService {
    static setTypingStatusDebounced(update: TypingStatusUpdate): void {
        this.setTypingStatusImmediate(update);
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
