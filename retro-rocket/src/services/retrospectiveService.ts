import { firestore } from './firebase';
import { Retrospective } from '../types/retrospective';

const RETROSPECTIVE_COLLECTION = 'retrospectives';

export const createRetrospective = async (data: Retrospective) => {
    try {
        const docRef = await firestore.collection(RETROSPECTIVE_COLLECTION).add(data);
        return docRef.id;
    } catch (error) {
        console.error("Error creating retrospective: ", error);
        throw new Error("Could not create retrospective");
    }
};

export const getRetrospective = async (id: string) => {
    try {
        const doc = await firestore.collection(RETROSPECTIVE_COLLECTION).doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() } as Retrospective;
        } else {
            throw new Error("Retrospective not found");
        }
    } catch (error) {
        console.error("Error fetching retrospective: ", error);
        throw new Error("Could not fetch retrospective");
    }
};

export const updateRetrospective = async (id: string, data: Partial<Retrospective>) => {
    try {
        await firestore.collection(RETROSPECTIVE_COLLECTION).doc(id).update(data);
    } catch (error) {
        console.error("Error updating retrospective: ", error);
        throw new Error("Could not update retrospective");
    }
};

export const deleteRetrospective = async (id: string) => {
    try {
        await firestore.collection(RETROSPECTIVE_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error deleting retrospective: ", error);
        throw new Error("Could not delete retrospective");
    }
};