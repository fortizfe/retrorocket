import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { Participant } from '../types/participant';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

const useParticipants = (panelId: string) => {
    const [participants, setParticipants] = useState<Participant[]>([]);

    useEffect(() => {
        const participantsRef = collection(db, `panels/${panelId}/participants`);
        const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
            const participantsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Participant[];
            setParticipants(participantsData);
        });

        return () => unsubscribe();
    }, [panelId]);

    const addParticipant = async (name: string) => {
        await addDoc(collection(db, `panels/${panelId}/participants`), { name });
    };

    const removeParticipant = async (participantId: string) => {
        await deleteDoc(doc(db, `panels/${panelId}/participants`, participantId));
    };

    return { participants, addParticipant, removeParticipant };
};

export default useParticipants;