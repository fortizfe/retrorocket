import { setTypingStatus } from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { TypingStatusUpdate } from '@/features/boards/types/typing';

/**
 * Servicio optimizado para gestión de estado de escritura en tiempo real.
 * Implementa debouncing y limpieza inteligente para reducir escrituras innecesarias.
 * Writes go through backendRetrospectiveClient.setTypingStatus() (feature 019, US3) —
 * reads now come from useRetrospectiveRealtimeSync's live channel instead of this
 * service's own onSnapshot subscription (retired: see useTypingStatus.ts).
 */
export class OptimizedTypingStatusService {
    private static readonly debounceTimers = new Map<string, NodeJS.Timeout>();
    private static readonly activeStatuses = new Map<string, TypingStatusUpdate>();
    private static readonly DEBOUNCE_DELAY = 300; // ms
    private static readonly TYPING_TIMEOUT = 5000; // ms

    /**
     * Establecer estado de escritura con debounce optimizado
     * @param update - Datos de actualización de estado
     */
    static setTypingStatusDebounced(update: TypingStatusUpdate): void {
        const key = `${update.retrospectiveId}_${update.userId}_${update.column}`;

        // Limpiar timer anterior si existe
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        if (update.isActive) {
            // Guardar estado activo
            this.activeStatuses.set(key, update);

            // Si es la primera vez que escribe en esta columna, activar inmediatamente
            if (!this.debounceTimers.has(key + '_initialized')) {
                this.setTypingStatusImmediate(update);
                this.debounceTimers.set(key + '_initialized', setTimeout(() => {
                    this.debounceTimers.delete(key + '_initialized');
                }, this.TYPING_TIMEOUT));
            }

            // Programar desactivación automática
            const cleanupTimer = setTimeout(() => {
                this.setTypingStatusImmediate({ ...update, isActive: false });
                this.activeStatuses.delete(key);
                this.debounceTimers.delete(key);
            }, this.DEBOUNCE_DELAY);

            this.debounceTimers.set(key, cleanupTimer);

        } else {
            // Desactivar inmediatamente
            this.setTypingStatusImmediate(update);
            this.activeStatuses.delete(key);
            this.debounceTimers.delete(key);
            this.debounceTimers.delete(key + '_initialized');
        }
    }

    /**
     * Establecer estado de escritura inmediatamente (sin debounce)
     * @param update - Datos de actualización de estado
     */
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

        const cleanupPromises = columns.map(column => {
            const key = `${retrospectiveId}_${userId}_${column}`;

            // Limpiar timers
            const timer = this.debounceTimers.get(key);
            if (timer) {
                clearTimeout(timer);
                this.debounceTimers.delete(key);
            }
            this.debounceTimers.delete(key + '_initialized');
            this.activeStatuses.delete(key);

            // Limpiar del backend
            return this.setTypingStatusImmediate({
                retrospectiveId,
                userId,
                column: column as 'helped' | 'hindered' | 'improve',
                username: '',
                isActive: false
            });
        });

        await Promise.all(cleanupPromises);
    }

    /**
     * Obtener estadísticas del servicio
     */
    static getStats(): {
        activeTimers: number;
        activeStatuses: number;
        memoryUsage: number;
    } {
        return {
            activeTimers: this.debounceTimers.size,
            activeStatuses: this.activeStatuses.size,
            memoryUsage: this.debounceTimers.size + this.activeStatuses.size
        };
    }

    /**
     * Limpiar todos los timers (útil para testing y cleanup)
     */
    static cleanup(): void {
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        this.activeStatuses.clear();
    }
}
