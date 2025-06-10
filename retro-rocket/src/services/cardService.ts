import { firestore } from './firebase';
import { Card } from '../types/card';

const cardsCollection = firestore.collection('cards');

export const createCard = async (card: Card): Promise<void> => {
    await cardsCollection.add(card);
};

export const updateCard = async (id: string, updatedCard: Partial<Card>): Promise<void> => {
    await cardsCollection.doc(id).update(updatedCard);
};

export const deleteCard = async (id: string): Promise<void> => {
    await cardsCollection.doc(id).delete();
};

export const getCards = async (): Promise<Card[]> => {
    const snapshot = await cardsCollection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Card));
};