import {
    collection,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    increment,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db, FIRESTORE_COLLECTIONS } from './firebase';
import { Retrospective } from '../types/retrospective';

// Helper function to check if Firebase is available
const ensureFirestore = () => {
    if (!db) {
        throw new Error('Firebase is not initialized. Please configure Firebase to use this feature.');
    }
    return db;
};

export interface CreateRetrospectiveInput {
    title: string;
    description?: string;
    createdBy?: string;
    createdByName?: string;
}

export const createRetrospective = async (data: CreateRetrospectiveInput): Promise<string> => {
    try {
        const firestore = ensureFirestore();
        const retrospectivesCollection = collection(firestore, FIRESTORE_COLLECTIONS.RETROSPECTIVES);

        const retrospectiveData = {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            participantCount: 0,
            isActive: true
        };

        const docRef = await addDoc(retrospectivesCollection, retrospectiveData);
        return docRef.id;
    } catch (error) {
        console.error("Error creating retrospective: ", error);
        throw new Error("Could not create retrospective");
    }
};

export const getRetrospective = async (id: string): Promise<Retrospective | null> => {
    try {
        const firestore = ensureFirestore();
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
            } as Retrospective;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching retrospective: ", error);
        throw new Error("Could not fetch retrospective");
    }
};

export const updateRetrospective = async (id: string, updates: Partial<Retrospective>): Promise<void> => {
    try {
        const firestore = ensureFirestore();
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);
        const updateData = {
            ...updates,
            updatedAt: serverTimestamp()
        };

        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error("Error updating retrospective: ", error);
        throw new Error("Could not update retrospective");
    }
};

export const deleteRetrospective = async (id: string): Promise<void> => {
    try {
        const firestore = ensureFirestore();
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting retrospective: ", error);
        throw new Error("Could not delete retrospective");
    }
};

export const subscribeToRetrospective = (
    id: string,
    callback: (retrospective: Retrospective | null) => void
): (() => void) => {
    const firestore = ensureFirestore();
    const docRef = doc(firestore, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);

    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            const retrospective: Retrospective = {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date()
            } as Retrospective;

            callback(retrospective);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Error subscribing to retrospective:', error);
        callback(null);
    });
};

export const incrementParticipantCount = async (id: string): Promise<void> => {
    try {
        const firestore = ensureFirestore();
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);
        await updateDoc(docRef, {
            participantCount: increment(1),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error incrementing participant count: ", error);
        throw new Error("Could not update participant count");
    }
};

/**
 * Joins a user to an existing retrospective by its ID
 * @param boardId - The ID of the retrospective to join
 * @param userId - The user ID of the person joining
 * @param userName - The display name of the user joining
 * @returns Promise<Retrospective> - The retrospective data if successful
 * @throws Error if the retrospective doesn't exist or user can't join
 */
export const joinRetrospectiveById = async (
    boardId: string,
    userId: string,
    userName: string
): Promise<Retrospective> => {
    try {
        const firestore = ensureFirestore();

        // First, verify the retrospective exists and is active
        const retrospective = await getRetrospective(boardId);
        if (!retrospective) {
            throw new Error('El tablero especificado no existe o no está disponible');
        }

        if (!retrospective.isActive) {
            throw new Error('Este tablero ya no está activo');
        }

        // Check if user is already a participant to avoid duplicates
        const participantsQuery = query(
            collection(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS),
            where('retrospectiveId', '==', boardId),
            where('userId', '==', userId)
        );

        const existingParticipants = await getDocs(participantsQuery);

        if (!existingParticipants.empty) {
            // User is already a participant, just return the retrospective
            return retrospective;
        }

        return retrospective;
    } catch (error) {
        console.error("Error joining retrospective: ", error);
        if (error instanceof Error) {
            throw error; // Re-throw the original error with its message
        }
        throw new Error("No se pudo unir a la retrospectiva");
    }
};

export const decrementParticipantCount = async (retrospectiveId: string): Promise<void> => {
    try {
        const firestore = ensureFirestore();
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);
        await updateDoc(docRef, {
            participantCount: increment(-1),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error decrementing participant count: ", error);
        throw new Error("Could not update participant count");
    }
};

export const deleteRetrospectiveCompletely = async (retrospectiveId: string, userId: string): Promise<void> => {
    try {
        const firestore = ensureFirestore();

        // First, verify the user owns the retrospective
        const retroDoc = await getRetrospective(retrospectiveId);
        if (!retroDoc) {
            throw new Error('Retrospective not found');
        }

        if (retroDoc.createdBy !== userId) {
            throw new Error('You can only delete retrospectives you created');
        }

        // Delete related subcollections first
        // Note: In production, you might want to use Firebase Functions for this
        // to handle large datasets and ensure atomicity

        // Delete participants
        const participantsQuery = collection(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS);
        const participantsSnapshot = await getDocs(
            query(participantsQuery, where('retrospectiveId', '==', retrospectiveId))
        );

        const participantDeletions = participantsSnapshot.docs.map(doc =>
            deleteDoc(doc.ref)
        );
        await Promise.all(participantDeletions);

        // Delete cards (they might be in a subcollection or separate collection)
        // If cards are in a subcollection under retrospectives, we'd need to query differently
        const cardsQuery = collection(firestore, 'cards');
        const cardsSnapshot = await getDocs(
            query(cardsQuery, where('retrospectiveId', '==', retrospectiveId))
        );

        const cardDeletions = cardsSnapshot.docs.map(doc =>
            deleteDoc(doc.ref)
        );
        await Promise.all(cardDeletions);

        // Finally, delete the retrospective document itself
        await deleteRetrospective(retrospectiveId);

    } catch (error) {
        console.error('Error deleting retrospective completely:', error);
        throw error;
    }
};