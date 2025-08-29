import {
    getDocs,
    query,
    collection,
    where,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../../types/user';

/**
 * Caché inteligente para perfiles de usuario con consultas batch optimizadas
 * Reduce el problema N+1 al obtener múltiples perfiles de usuario
 */
export class UserProfileCache {
    private static readonly cache = new Map<string, UserProfile>();
    private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
    private static readonly cacheTimestamps = new Map<string, number>();

    /**
     * Obtener múltiples perfiles de usuario con batch queries
     * @param userIds - Array de IDs de usuario
     * @returns Map con los perfiles encontrados
     */
    static async getProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
        if (!db) {
            throw new Error('Firestore no está inicializado');
        }

        // Filtrar IDs que necesitan actualización
        const now = Date.now();
        const uncachedIds = userIds.filter(id => {
            const cachedAt = this.cacheTimestamps.get(id);
            return !this.cache.has(id) || !cachedAt || (now - cachedAt > this.CACHE_TTL);
        });

        if (uncachedIds.length > 0) {
            await this.batchFetchProfiles(uncachedIds);
        }

        // Devolver todos los perfiles solicitados que existen en caché
        const result = new Map<string, UserProfile>();
        userIds.forEach(id => {
            const profile = this.cache.get(id);
            if (profile) {
                result.set(id, profile);
            }
        });

        return result;
    }

    /**
     * Obtener un solo perfil de usuario (con caché)
     * @param userId - ID del usuario
     * @returns Perfil del usuario o null si no existe
     */
    static async getProfile(userId: string): Promise<UserProfile | null> {
        const profiles = await this.getProfiles([userId]);
        return profiles.get(userId) || null;
    }

    /**
     * Realizar consultas batch para obtener múltiples perfiles
     * @param userIds - IDs de usuarios a consultar
     */
    private static async batchFetchProfiles(userIds: string[]): Promise<void> {
        if (!db) return;

        const now = Date.now();
        const chunks = this.chunkArray(userIds, 10); // Firestore límite de 10 en consultas "in"

        const promises = chunks.map(async chunk => {
            try {
                if (chunk.length === 1) {
                    // Para un solo documento, usar getDoc es más eficiente
                    if (!db) return;
                    const docRef = doc(db, 'users', chunk[0]);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const profile = {
                            uid: docSnap.id,
                            ...docSnap.data(),
                            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
                            updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
                        } as UserProfile;

                        this.cache.set(docSnap.id, profile);
                        this.cacheTimestamps.set(docSnap.id, now);
                    }
                } else {
                    // Para múltiples documentos, usar query con "in" de IDs
                    if (!db) return;
                    const q = query(
                        collection(db, 'users'),
                        where('__name__', 'in', chunk)
                    );

                    const snapshot = await getDocs(q);
                    snapshot.docs.forEach(docSnap => {
                        const profile = {
                            uid: docSnap.id,
                            ...docSnap.data(),
                            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
                            updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
                        } as UserProfile;

                        this.cache.set(docSnap.id, profile);
                        this.cacheTimestamps.set(docSnap.id, now);
                    });
                }
            } catch (error) {
                console.warn('Error fetching user profiles batch:', error);
                // Marcar como intentados para evitar reintentos inmediatos
                chunk.forEach(id => {
                    this.cacheTimestamps.set(id, now);
                });
            }
        });

        await Promise.all(promises);
    }

    /**
     * Dividir array en chunks de tamaño específico
     * @param array - Array a dividir
     * @param size - Tamaño de cada chunk
     * @returns Array de chunks
     */
    private static chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Invalidar caché para un usuario específico
     * @param userId - ID del usuario
     */
    static invalidateProfile(userId: string): void {
        this.cache.delete(userId);
        this.cacheTimestamps.delete(userId);
    }

    /**
     * Limpiar todo el caché
     */
    static clearCache(): void {
        this.cache.clear();
        this.cacheTimestamps.clear();
    }

    /**
     * Obtener estadísticas del caché
     */
    static getStats(): {
        cacheSize: number;
        hitRate: number;
        oldestEntry: number;
    } {
        const now = Date.now();
        const timestamps = Array.from(this.cacheTimestamps.values());
        const oldestEntry = timestamps.length > 0 ? now - Math.min(...timestamps) : 0;

        return {
            cacheSize: this.cache.size,
            hitRate: 0, // Se podría implementar un contador de hits/misses
            oldestEntry
        };
    }

    /**
     * Actualizar perfil en caché (útil después de actualizaciones)
     * @param userId - ID del usuario
     * @param profile - Perfil actualizado
     */
    static updateCache(userId: string, profile: UserProfile): void {
        this.cache.set(userId, profile);
        this.cacheTimestamps.set(userId, Date.now());
    }
}
