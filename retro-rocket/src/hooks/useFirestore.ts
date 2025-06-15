import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Card } from '../types/card';

// Helper function to check if Firebase is available
const ensureFirestore = () => {
    if (!db) {
        throw new Error('Firebase is not initialized. Please configure Firebase to use this feature.');
    }
    return db;
};

const useFirestore = (panelId: string) => {
    const [cards, setCards] = useState<Card[]>([]);

    const getCardsCollection = () => {
        const firestore = ensureFirestore();
        return collection(firestore, `panels/${panelId}/cards`);
    };

    const fetchCards = async () => {
        try {
            const cardsCollectionRef = getCardsCollection();
            const data = await getDocs(cardsCollectionRef);
            setCards(data.docs.map(doc => ({ ...doc.data(), id: doc.id } as Card)));
        } catch (error) {
            console.error('Error fetching cards:', error);
            setCards([]);
        }
    };

    const addCard = async (newCard: Omit<Card, 'id'>) => {
        try {
            const cardsCollectionRef = getCardsCollection();
            await addDoc(cardsCollectionRef, newCard);
            fetchCards();
        } catch (error) {
            console.error('Error adding card:', error);
            throw error;
        }
    };

    const updateCard = async (id: string, updatedCard: Partial<Card>) => {
        try {
            const firestore = ensureFirestore();
            const cardDoc = doc(firestore, `panels/${panelId}/cards`, id);
            await updateDoc(cardDoc, updatedCard);
            fetchCards();
        } catch (error) {
            console.error('Error updating card:', error);
            throw error;
        }
    };

    const deleteCard = async (id: string) => {
        try {
            const firestore = ensureFirestore();
            const cardDoc = doc(firestore, `panels/${panelId}/cards`, id);
            await deleteDoc(cardDoc);
            fetchCards();
        } catch (error) {
            console.error('Error deleting card:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchCards();
    }, [panelId]);

    return { cards, addCard, updateCard, deleteCard };
};

export default useFirestore;