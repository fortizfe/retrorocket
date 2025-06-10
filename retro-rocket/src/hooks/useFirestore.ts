import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Card } from '../types/card';

const useFirestore = (panelId: string) => {
    const [cards, setCards] = useState<Card[]>([]);
    const cardsCollectionRef = collection(db, `panels/${panelId}/cards`);

    const fetchCards = async () => {
        const data = await getDocs(cardsCollectionRef);
        setCards(data.docs.map(doc => ({ ...doc.data(), id: doc.id } as Card)));
    };

    const addCard = async (newCard: Omit<Card, 'id'>) => {
        await addDoc(cardsCollectionRef, newCard);
        fetchCards();
    };

    const updateCard = async (id: string, updatedCard: Partial<Card>) => {
        const cardDoc = doc(cardsCollectionRef, id);
        await updateDoc(cardDoc, updatedCard);
        fetchCards();
    };

    const deleteCard = async (id: string) => {
        const cardDoc = doc(cardsCollectionRef, id);
        await deleteDoc(cardDoc);
        fetchCards();
    };

    useEffect(() => {
        fetchCards();
    }, [panelId]);

    return { cards, addCard, updateCard, deleteCard };
};

export default useFirestore;