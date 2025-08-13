import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Card, CreateCardInput } from '../types/card';
import { FIRESTORE_COLLECTIONS } from '../utils/constants';

const cardsCollection = collection(db as any, FIRESTORE_COLLECTIONS.CARDS);

export const createCard = async (cardInput: CreateCardInput): Promise<string> => {
    try {
        const cardData = {
            ...cardInput,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            votes: 0,
            likes: [],
            reactions: [],
            order: Date.now() // Use timestamp as simple ordering
        };

        const docRef = await addDoc(cardsCollection, cardData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating card:', error);
        throw new Error('Failed to create card');
    }
};

export const updateCard = async (id: string, updates: Partial<Card>): Promise<void> => {
    try {
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, id);
        const updateData = {
            ...updates,
            updatedAt: serverTimestamp()
        };

        await updateDoc(cardRef, updateData);
    } catch (error) {
        console.error('Error updating card:', error);
        throw new Error('Failed to update card');
    }
};

export const deleteCard = async (id: string): Promise<void> => {
    try {
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, id);
        await deleteDoc(cardRef);
    } catch (error) {
        console.error('Error deleting card:', error);
        throw new Error('Failed to delete card');
    }
};

export const getCardsByRetrospective = async (retrospectiveId: string): Promise<Card[]> => {
    try {
        const q = query(
            cardsCollection,
            where('retrospectiveId', '==', retrospectiveId),
            orderBy('order', 'asc'),
            orderBy('createdAt', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
                likes: data.likes || [],
                reactions: data.reactions || [],
                order: data.order || 0
            } as Card;
        });
    } catch (error) {
        console.error('Error getting cards:', error);
        throw new Error('Failed to get cards');
    }
};

export const subscribeToCards = (
    retrospectiveId: string,
    callback: (cards: Card[]) => void
): (() => void) => {
    const q = query(
        cardsCollection,
        where('retrospectiveId', '==', retrospectiveId),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const cards = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date()
        } as Card));

        callback(cards);
    }, (error) => {
        console.error('Error subscribing to cards:', error);
    });
};

export const voteCard = async (cardId: string, increment: boolean = true): Promise<void> => {
    try {
        console.log(`🗳️ Vote card: ${cardId}, increment: ${increment}`);
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);

        // For simplicity, we'll get the current votes and update
        // In a production app, you might want to use increment() for atomic updates
        const cardDoc = await getDoc(cardRef);

        if (cardDoc.exists()) {
            const currentCard = cardDoc.data() as Card;
            const currentVotes = currentCard.votes || 0;
            const newVotes = currentVotes + (increment ? 1 : -1);

            console.log(`🗳️ Current votes: ${currentVotes}, new votes: ${Math.max(0, newVotes)}`);

            await updateDoc(cardRef, {
                votes: Math.max(0, newVotes),
                updatedAt: serverTimestamp()
            });

            console.log(`🗳️ Vote updated successfully for card ${cardId}`);
        } else {
            console.log(`🗳️ Card ${cardId} not found for voting`);
        }
    } catch (error) {
        console.error('Error voting card:', error);
        throw new Error('Failed to vote card');
    }
};