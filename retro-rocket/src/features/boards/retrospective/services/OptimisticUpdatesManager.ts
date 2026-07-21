/**
 * Gestor de actualizaciones optimistas para mejorar la experiencia de usuario
 * Permite actualizaciones inmediatas en la UI con rollback automático en caso de error
 */
export class OptimisticUpdatesManager {
    /**
     * Ejecutar actualización optimista con rollback automático
     * @param localState - Estado actual local
     * @param setLocalState - Función para actualizar el estado local
     * @param remoteUpdate - Función para actualizar remotamente
     * @param optimisticUpdate - Función que aplica el cambio optimista
     * @returns Promise que resuelve cuando la actualización remota se completa
     */
    static async updateWithOptimism<T>(
        localState: T[],
        setLocalState: (state: T[]) => void,
        remoteUpdate: () => Promise<void>,
        optimisticUpdate: (state: T[]) => T[]
    ): Promise<void> {
        // Guardar estado original para posible rollback
        const originalState = [...localState];

        try {
            // Aplicar actualización optimista inmediatamente
            const optimisticState = optimisticUpdate(localState);
            setLocalState(optimisticState);

            // Ejecutar actualización remota
            await remoteUpdate();

            // Si llegamos aquí, la actualización fue exitosa
            // El listener real-time actualizará el estado con los datos del servidor

        } catch (error) {
            // Rollback al estado original en caso de error
            setLocalState(originalState);
            throw error;
        }
    }

    /**
     * Actualización optimista para crear un elemento
     * @param localState - Estado actual
     * @param setLocalState - Setter del estado
     * @param remoteCreate - Función de creación remota
     * @param newItem - Nuevo elemento a crear
     * @param generateTempId - Función para generar ID temporal
     */
    static async createWithOptimism<T extends { id: string }>(
        localState: T[],
        setLocalState: (state: T[]) => void,
        remoteCreate: () => Promise<string>,
        newItem: Omit<T, 'id'>,
        generateTempId: () => string = () => `temp_${Date.now()}_${Math.random()}`
    ): Promise<string> {
        const tempId = generateTempId();
        const optimisticItem = { ...newItem, id: tempId } as T;
        const originalState = [...localState];

        try {
            // Agregar elemento optimísticamente
            setLocalState([...localState, optimisticItem]);

            // Crear remotamente
            const realId = await remoteCreate();

            // El listener real-time se encargará de actualizar con el ID real
            return realId;

        } catch (error) {
            // Rollback
            setLocalState(originalState);
            throw error;
        }
    }

    /**
     * Actualización optimista para eliminar un elemento
     * @param localState - Estado actual
     * @param setLocalState - Setter del estado
     * @param remoteDelete - Función de eliminación remota
     * @param itemId - ID del elemento a eliminar
     */
    static async deleteWithOptimism<T extends { id: string }>(
        localState: T[],
        setLocalState: (state: T[]) => void,
        remoteDelete: () => Promise<void>,
        itemId: string
    ): Promise<void> {
        const originalState = [...localState];
        const itemToDelete = localState.find(item => item.id === itemId);

        if (!itemToDelete) {
            throw new Error('Elemento no encontrado para eliminar');
        }

        try {
            // Eliminar optimísticamente
            const optimisticState = localState.filter(item => item.id !== itemId);
            setLocalState(optimisticState);

            // Eliminar remotamente
            await remoteDelete();

        } catch (error) {
            // Rollback
            setLocalState(originalState);
            throw error;
        }
    }

    /**
     * Actualización optimista para modificar un elemento
     * @param localState - Estado actual
     * @param setLocalState - Setter del estado
     * @param remoteUpdate - Función de actualización remota
     * @param itemId - ID del elemento a modificar
     * @param updates - Cambios a aplicar
     */
    static async updateItemWithOptimism<T extends { id: string }>(
        localState: T[],
        setLocalState: (state: T[]) => void,
        remoteUpdate: () => Promise<void>,
        itemId: string,
        updates: Partial<T>
    ): Promise<void> {
        const originalState = [...localState];
        const itemIndex = localState.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            throw new Error('Elemento no encontrado para actualizar');
        }

        try {
            // Actualizar optimísticamente
            const optimisticState = [...localState];
            optimisticState[itemIndex] = { ...optimisticState[itemIndex], ...updates };
            setLocalState(optimisticState);

            // Actualizar remotamente
            await remoteUpdate();

        } catch (error) {
            // Rollback
            setLocalState(originalState);
            throw error;
        }
    }

    /**
     * Batch de actualizaciones optimistas
     * @param operations - Array de operaciones a ejecutar
     */
    static async batchOptimisticUpdates<T>(
        operations: Array<{
            name: string;
            optimisticFn: () => void;
            remoteFn: () => Promise<void>;
            rollbackFn: () => void;
        }>
    ): Promise<void> {
        // Aplicar todas las actualizaciones optimistas
        operations.forEach(op => op.optimisticFn());

        try {
            // Ejecutar todas las actualizaciones remotas
            await Promise.all(operations.map(op => op.remoteFn()));

        } catch (error) {
            // Rollback de todas las operaciones en orden inverso
            operations.reverse().forEach(op => op.rollbackFn());
            throw error;
        }
    }

    /**
     * Utility para crear función de rollback
     * @param setState - Función setter del estado
     * @param originalState - Estado original a restaurar
     */
    static createRollbackFunction<T>(
        setState: (state: T) => void,
        originalState: T
    ): () => void {
        return () => setState(originalState);
    }

    /**
     * Verificar si una operación puede ser optimista (basado en conectividad, etc.)
     * @returns true si es seguro hacer actualizaciones optimistas
     */
    static canUseOptimisticUpdates(): boolean {
        // Verificar conectividad
        if (!navigator.onLine) {
            return false;
        }

        // Verificar si hay errores recientes de Firebase
        // Este es un placeholder - se podría implementar un sistema más sofisticado
        return true;
    }

    /**
     * Configurar retry automático para actualizaciones fallidas
     * @param retryFn - Función a reintentar
     * @param maxRetries - Número máximo de reintentos
     * @param delayMs - Retraso entre reintentos
     */
    static async withRetry<T>(
        retryFn: () => Promise<T>,
        maxRetries: number = 3,
        delayMs: number = 1000
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await retryFn();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    throw lastError;
                }

                // Esperar antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }

        throw lastError!;
    }
}
