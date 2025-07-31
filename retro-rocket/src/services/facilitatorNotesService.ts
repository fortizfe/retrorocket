import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { FacilitatorNote } from '../types/facilitatorNotes';

const COLLECTION_NAME = 'facilitatorNotes';

export class FacilitatorNotesService {
    /**
     * Verificar que la base de datos esté inicializada
     */
    private static ensureDbInitialized(): void {
        if (!db) {
            throw new Error('Firebase no está inicializado correctamente');
        }
    }

    /**
     * Crear una nueva nota del facilitador
     */
    static async createNote(
        retrospectiveId: string,
        facilitatorId: string,
        content: string
    ): Promise<string> {
        try {
            this.ensureDbInitialized();

            const noteData = {
                content,
                retrospectiveId,
                facilitatorId,
                timestamp: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db!, COLLECTION_NAME), noteData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating facilitator note:', error);
            throw new Error('Error al crear la nota');
        }
    }

    /**
     * Actualizar una nota existente
     */
    static async updateNote(noteId: string, content: string): Promise<void> {
        try {
            this.ensureDbInitialized();

            const noteRef = doc(db!, COLLECTION_NAME, noteId);
            await updateDoc(noteRef, {
                content,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error updating facilitator note:', error);
            throw new Error('Error al actualizar la nota');
        }
    }

    /**
     * Eliminar una nota
     */
    static async deleteNote(noteId: string): Promise<void> {
        try {
            this.ensureDbInitialized();

            const noteRef = doc(db!, COLLECTION_NAME, noteId);
            await deleteDoc(noteRef);
        } catch (error) {
            console.error('Error deleting facilitator note:', error);
            throw new Error('Error al eliminar la nota');
        }
    }

    /**
     * Suscribirse a las notas de una retrospectiva
     */
    static subscribeToNotes(
        retrospectiveId: string,
        facilitatorId: string,
        callback: (notes: FacilitatorNote[]) => void
    ): () => void {
        this.ensureDbInitialized();

        const q = query(
            collection(db!, COLLECTION_NAME),
            where('retrospectiveId', '==', retrospectiveId),
            where('facilitatorId', '==', facilitatorId),
            orderBy('timestamp', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const notes: FacilitatorNote[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    content: data.content,
                    retrospectiveId: data.retrospectiveId,
                    facilitatorId: data.facilitatorId,
                    timestamp: data.timestamp.toDate()
                };
            });

            callback(notes);
        }, (error) => {
            console.error('Error subscribing to facilitator notes:', error);
        });
    }
}
