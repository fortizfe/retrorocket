import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { Participant } from '../types/participant';

interface EnrichedParticipant extends Participant {
    photoURL?: string | null;
}

export const useEnrichedParticipants = (participants: Participant[]) => {
    const [enrichedParticipants, setEnrichedParticipants] = useState<EnrichedParticipant[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const enrichParticipants = async () => {
            if (participants.length === 0) {
                setEnrichedParticipants([]);
                return;
            }

            setLoading(true);

            try {
                const enrichedData = await Promise.all(
                    participants.map(async (participant) => {
                        try {
                            const userProfile = await userService.getUserProfile(participant.userId);
                            return {
                                ...participant,
                                photoURL: userProfile?.photoURL ?? null
                            };
                        } catch (error) {
                            console.warn(`Could not fetch profile for user ${participant.userId}:`, error);
                            return {
                                ...participant,
                                photoURL: null
                            };
                        }
                    })
                );

                setEnrichedParticipants(enrichedData);
            } catch (error) {
                console.error('Error enriching participants:', error);
                // Fallback to original participants without photoURL
                setEnrichedParticipants(participants.map(p => ({ ...p, photoURL: null })));
            } finally {
                setLoading(false);
            }
        };

        enrichParticipants();
    }, [participants]);

    return { enrichedParticipants, loading };
};
