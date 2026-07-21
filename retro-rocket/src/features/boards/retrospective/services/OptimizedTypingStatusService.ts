import {
    doc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/services/firebase';
import { TypingStatus, TypingStatusUpdate } from '@/features/boards/types/typing';

/**
 * Servicio optimizado para gestión de estado de escritura en tiempo real
 * Implementa debouncing y limpieza inteligente para reducir escrituras innecesarias
 */
export class OptimizedTypingStatusService {
    private static readonly debounceTimers = new Map<string, NodeJS.Timeout>();
    private static readonly activeStatuses = new Map<string, TypingStatusUpdate>();
    private static readonly DEBOUNCE_DELAY = 300; // ms
    private static readonly TYPING_TIMEOUT = 5000; // ms
    private static readonly COLLECTION_NAME = 'typingStatus';

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
        if (!db) {
            console.warn('Firestore no está inicializado');
            return;
        }

        try {
            const typingId = `${update.retrospectiveId}_${update.userId}_${update.column}`;
            const typingRef = doc(db, this.COLLECTION_NAME, typingId);

            if (update.isActive) {
                await setDoc(typingRef, {
                    id: typingId,
                    userId: update.userId,
                    username: update.username,
                    retrospectiveId: update.retrospectiveId,
                    column: update.column,
                    timestamp: serverTimestamp(),
                    isActive: true,
                });
            } else {
                await deleteDoc(typingRef);
            }
        } catch (error) {
            console.error('Error actualizando estado de escritura:', error);
        }
    }

    /**
     * Suscribirse a cambios de estado de escritura
     * @param retrospectiveId - ID de la retrospectiva
     * @param callback - Función de callback con los estados
     * @returns Función para desuscribirse
     */
    static subscribeToTypingStatus(
        retrospectiveId: string,
        callback: (typingStatuses: TypingStatus[]) => void
    ): () => void {
        if (!db) {
            console.warn('Firestore no está inicializado');
            return () => { };
        }

        try {
            const q = query(
                collection(db, this.COLLECTION_NAME),
                where('retrospectiveId', '==', retrospectiveId),
                where('isActive', '==', true)
            );

            return onSnapshot(q, (snapshot) => {
                const typingStatuses: TypingStatus[] = [];
                const now = new Date();

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const timestamp = data.timestamp?.toDate() || new Date();
                    const timeDiff = now.getTime() - timestamp.getTime();

                    // Solo incluir estados recientes
                    if (timeDiff < this.TYPING_TIMEOUT) {
                        typingStatuses.push({
                            id: doc.id,
                            userId: data.userId,
                            username: data.username,
                            retrospectiveId: data.retrospectiveId,
                            column: data.column,
                            timestamp,
                            isActive: data.isActive,
                        });
                    } else {
                        // Auto-limpiar estados expirados
                        this.cleanupExpiredStatus(doc.id);
                    }
                });

                callback(typingStatuses);
            }, (error) => {
                console.error('Error suscribiéndose a estados de escritura:', error);
            });
        } catch (error) {
            console.error('Error configurando suscripción:', error);
            return () => { };
        }
    }

    /**
     * Limpiar estado de escritura expirado
     * @param typingId - ID del estado de escritura
     */
    private static async cleanupExpiredStatus(typingId: string): Promise<void> {
        if (!db) return;

        try {
            const typingRef = doc(db, this.COLLECTION_NAME, typingId);
            await deleteDoc(typingRef);
        } catch (error) {
            console.error('Error limpiando estado expirado:', error);
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

            // Limpiar de Firestore
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
