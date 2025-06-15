import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db, FIRESTORE_COLLECTIONS } from './firebase';
import { Participant } from '../types/participant';

// Helper function to check if Firebase is available
const ensureFirestore = () => {
    if (!db) {
        throw new Error('Firebase is not initialized. Please configure Firebase to use this feature.');
    }
    return db;
};

export interface CreateParticipantInput {
    name: string;
    userId: string;
    retrospectiveId: string;
}

export const getActiveParticipantByUser = async (
    retrospectiveId: string,
    userId: string
): Promise<Participant | null> => {
    try {
        const firestore = ensureFirestore();
        const participantsCollection = collection(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS);
        const q = query(
            participantsCollection,
            where('retrospectiveId', '==', retrospectiveId),
            where('userId', '==', userId),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0]; // Should only be one active participant per user per retrospective
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            joinedAt: (data.joinedAt as Timestamp)?.toDate() || new Date()
        } as Participant;
    } catch (error) {
        console.error('Error getting active participant by user:', error);
        return null;
    }
};

export const addParticipant = async (participantInput: CreateParticipantInput): Promise<{ id: string; isNew: boolean }> => {
    try {
        const firestore = ensureFirestore();
        const participantsCollection = collection(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS);

        // Check if user is already an active participant
        const existingParticipant = await getActiveParticipantByUser(
            participantInput.retrospectiveId,
            participantInput.userId
        );

        if (existingParticipant) {
            // User is already a participant, return existing ID
            return { id: existingParticipant.id, isNew: false };
        }

        const participantData = {
            ...participantInput,
            joinedAt: serverTimestamp(),
            isActive: true
        };

        const docRef = await addDoc(participantsCollection, participantData);
        return { id: docRef.id, isNew: true };
    } catch (error) {
        console.error('Error adding participant:', error);
        throw new Error('Failed to add participant');
    }
};

export const updateParticipant = async (id: string, updates: Partial<Participant>): Promise<void> => {
    try {
        const firestore = ensureFirestore();
        const participantRef = doc(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS, id);
        await updateDoc(participantRef, updates);
    } catch (error) {
        console.error('Error updating participant:', error);
        throw new Error('Failed to update participant');
    }
};

export const removeParticipant = async (id: string): Promise<void> => {
    try {
        const firestore = ensureFirestore();
        const participantRef = doc(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS, id);
        await deleteDoc(participantRef);
    } catch (error) {
        console.error('Error removing participant:', error);
        throw new Error('Failed to remove participant');
    }
};

export const getParticipantsByRetrospective = async (retrospectiveId: string): Promise<Participant[]> => {
    try {
        const firestore = ensureFirestore();
        const participantsCollection = collection(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS);
        const q = query(
            participantsCollection,
            where('retrospectiveId', '==', retrospectiveId),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                joinedAt: (data.joinedAt as Timestamp)?.toDate() || new Date()
            } as Participant;
        });
    } catch (error) {
        console.error('Error getting participants:', error);
        throw new Error('Failed to get participants');
    }
};

export const subscribeToParticipants = (
    retrospectiveId: string,
    callback: (participants: Participant[]) => void
): (() => void) => {
    const firestore = ensureFirestore();
    const participantsCollection = collection(firestore, FIRESTORE_COLLECTIONS.PARTICIPANTS);

    const q = query(
        participantsCollection,
        where('retrospectiveId', '==', retrospectiveId),
        where('isActive', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
        const participants = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                joinedAt: (data.joinedAt as Timestamp)?.toDate() || new Date()
            } as Participant;
        });

        callback(participants);
    }, (error) => {
        console.error('Error subscribing to participants:', error);
    });
};

export const setParticipantInactive = async (id: string): Promise<void> => {
    try {
        await updateParticipant(id, { isActive: false });
    } catch (error) {
        console.error('Error setting participant inactive:', error);
        throw new Error('Failed to set participant inactive');
    }
};
