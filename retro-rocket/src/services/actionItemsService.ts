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
    serverTimestamp,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { ActionItem, CreateActionItemInput } from '../types/actionItem';

const COLLECTION_NAME = 'actionItems';

export class ActionItemsService {
    /**
     * Verificar que la base de datos esté inicializada
     */
    private static ensureDbInitialized(): void {
        if (!db) {
            throw new Error('Firebase is not initialized. Please configure Firebase to use this feature.');
        }
    }

    /**
     * Crear un nuevo elemento de acción
     */
    static async createActionItem(actionItemInput: CreateActionItemInput): Promise<string> {
        this.ensureDbInitialized();

        try {
            const actionItemData = {
                ...actionItemInput,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                order: Date.now() // Use timestamp as simple ordering
            };

            const docRef = await addDoc(collection(db!, COLLECTION_NAME), actionItemData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating action item:', error);
            throw new Error('Failed to create action item');
        }
    }

    /**
     * Actualizar un elemento de acción existente
     */
    static async updateActionItem(
        actionItemId: string,
        updates: Partial<ActionItem>
    ): Promise<void> {
        this.ensureDbInitialized();

        try {
            const actionItemRef = doc(db!, COLLECTION_NAME, actionItemId);
            const updateData = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            await updateDoc(actionItemRef, updateData);
        } catch (error) {
            console.error('Error updating action item:', error);
            throw new Error('Failed to update action item');
        }
    }

    /**
     * Eliminar un elemento de acción
     */
    static async deleteActionItem(actionItemId: string): Promise<void> {
        this.ensureDbInitialized();

        try {
            const actionItemRef = doc(db!, COLLECTION_NAME, actionItemId);
            await deleteDoc(actionItemRef);
        } catch (error) {
            console.error('Error deleting action item:', error);
            throw new Error('Failed to delete action item');
        }
    }

    /**
     * Suscribirse a los elementos de acción de una retrospectiva
     */
    static subscribeToActionItems(
        retrospectiveId: string,
        callback: (actionItems: ActionItem[]) => void
    ): () => void {
        this.ensureDbInitialized();

        const q = query(
            collection(db!, COLLECTION_NAME),
            where('retrospectiveId', '==', retrospectiveId),
            orderBy('order', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const actionItems: ActionItem[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    content: data.content,
                    retrospectiveId: data.retrospectiveId,
                    createdBy: data.createdBy,
                    assignedTo: data.assignedTo || null,
                    assignedToName: data.assignedToName || null,
                    dueDate: data.dueDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    order: data.order || 0
                };
            });

            callback(actionItems);
        }, (error) => {
            console.error('Error subscribing to action items:', error);
        });
    }

    /**
     * Convertir una tarjeta existente en elemento de acción
     */
    static async convertCardToActionItem(
        cardContent: string,
        retrospectiveId: string,
        facilitatorId: string,
        assignedTo?: string,
        assignedToName?: string,
        dueDate?: Date | null
    ): Promise<string> {
        return this.createActionItem({
            content: cardContent,
            retrospectiveId,
            createdBy: facilitatorId,
            assignedTo: assignedTo || null,
            assignedToName: assignedToName || null,
            dueDate: dueDate || null
        });
    }
}
