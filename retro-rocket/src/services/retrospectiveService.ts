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
    increment
} from 'firebase/firestore';
import { db } from './firebase';
import { Retrospective } from '../types/retrospective';
import { FIRESTORE_COLLECTIONS } from '../utils/constants';

const retrospectivesCollection = collection(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES);

export interface CreateRetrospectiveInput {
    title: string;
    description?: string;
}

export const createRetrospective = async (data: CreateRetrospectiveInput): Promise<string> => {
    try {
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
        const docRef = doc(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);
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
        const docRef = doc(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);
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
        const docRef = doc(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);
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
    const docRef = doc(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES, id);

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

export const incrementParticipantCount = async (retrospectiveId: string): Promise<void> => {
    try {
        const docRef = doc(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);
        await updateDoc(docRef, {
            participantCount: increment(1),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error incrementing participant count: ", error);
        throw new Error("Could not update participant count");
    }
};

export const decrementParticipantCount = async (retrospectiveId: string): Promise<void> => {
    try {
        const docRef = doc(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId);
        await updateDoc(docRef, {
            participantCount: increment(-1),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error decrementing participant count: ", error);
        throw new Error("Could not update participant count");
    }
};