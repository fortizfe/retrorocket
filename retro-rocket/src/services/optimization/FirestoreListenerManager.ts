/**
 * Gestor centralizado de listeners de Firestore para evitar conexiones redundantes
 * Implementa un patrón de referencia compartida para optimizar el uso de onSnapshot
 */
export class FirestoreListenerManager {
    private static readonly listeners = new Map<string, {
        unsubscribe: () => void;
        refCount: number;
        callback?: (data: any) => void;
    }>();

    /**
     * Suscribirse a un listener con referencia compartida
     * @param key - Clave única para identificar el listener
     * @param listenerFn - Función que crea el listener
     * @returns Función para desuscribirse
     */
    static subscribe(key: string, listenerFn: () => () => void): () => void {
        if (this.listeners.has(key)) {
            const listener = this.listeners.get(key)!;
            listener.refCount++;
            // No llamamos listenerFn aquí porque ya existe el listener
            return () => this.unsubscribe(key);
        }

        // Solo llamamos listenerFn cuando es la primera vez con esta key
        const unsubscribe = listenerFn();
        this.listeners.set(key, { unsubscribe, refCount: 1 });

        return () => this.unsubscribe(key);
    }

    /**
     * Desuscribirse de un listener, decrementando la referencia
     * @param key - Clave del listener
     */
    private static unsubscribe(key: string): void {
        const listener = this.listeners.get(key);
        if (listener) {
            listener.refCount--;
            if (listener.refCount === 0) {
                listener.unsubscribe();
                this.listeners.delete(key);
            }
        }
    }

    /**
     * Obtener estadísticas de listeners activos
     */
    static getStats(): { totalListeners: number; totalReferences: number } {
        const totalListeners = this.listeners.size;
        const totalReferences = Array.from(this.listeners.values())
            .reduce((sum, listener) => sum + listener.refCount, 0);

        return { totalListeners, totalReferences };
    }

    /**
     * Limpiar todos los listeners (útil para testing)
     */
    static cleanup(): void {
        this.listeners.forEach(listener => listener.unsubscribe());
        this.listeners.clear();
    }
}
