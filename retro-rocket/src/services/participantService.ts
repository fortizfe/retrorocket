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
import { db } from './firebase';
import { Participant } from '../types/participant';
import { FIRESTORE_COLLECTIONS } from '../utils/constants';

const participantsCollection = collection(db, FIRESTORE_COLLECTIONS.PARTICIPANTS);

export interface CreateParticipantInput {
    name: string;
    retrospectiveId: string;
}

export const addParticipant = async (participantInput: CreateParticipantInput): Promise<string> => {
    try {
        const participantData = {
            ...participantInput,
            joinedAt: serverTimestamp(),
            isActive: true
        };

        const docRef = await addDoc(participantsCollection, participantData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding participant:', error);
        throw new Error('Failed to add participant');
    }
};

export const updateParticipant = async (id: string, updates: Partial<Participant>): Promise<void> => {
    try {
        const participantRef = doc(db, FIRESTORE_COLLECTIONS.PARTICIPANTS, id);
        await updateDoc(participantRef, updates);
    } catch (error) {
        console.error('Error updating participant:', error);
        throw new Error('Failed to update participant');
    }
};

export const removeParticipant = async (id: string): Promise<void> => {
    try {
        const participantRef = doc(db, FIRESTORE_COLLECTIONS.PARTICIPANTS, id);
        await deleteDoc(participantRef);
    } catch (error) {
        console.error('Error removing participant:', error);
        throw new Error('Failed to remove participant');
    }
};

export const getParticipantsByRetrospective = async (retrospectiveId: string): Promise<Participant[]> => {
    try {
        const q = query(
            participantsCollection,
            where('retrospectiveId', '==', retrospectiveId),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            joinedAt: (doc.data().joinedAt as Timestamp)?.toDate() || new Date()
        } as Participant));
    } catch (error) {
        console.error('Error getting participants:', error);
        throw new Error('Failed to get participants');
    }
};

export const subscribeToParticipants = (
    retrospectiveId: string,
    callback: (participants: Participant[]) => void
): (() => void) => {
    const q = query(
        participantsCollection,
        where('retrospectiveId', '==', retrospectiveId),
        where('isActive', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
        const participants = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            joinedAt: (doc.data().joinedAt as Timestamp)?.toDate() || new Date()
        } as Participant));

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
