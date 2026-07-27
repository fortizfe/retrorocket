import { useEffect, useState } from 'react';
import { Participant } from '@/features/boards/types/participant';
import { UserProfileCache } from '@/features/boards/participants/services/UserProfileCache';
import { FirebaseMetricsService } from '@/lib/services/FirebaseMetricsService';

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
                // Usar caché optimizado en lugar de consultas individuales
                const userIds = participants.map(p => p.userId);
                const profiles = await UserProfileCache.getProfiles(userIds);

                FirebaseMetricsService.recordCacheHit('user-profiles');

                const enrichedData = participants.map(participant => ({
                    ...participant,
                    photoURL: profiles.get(participant.userId)?.photoURL ?? null
                }));

                setEnrichedParticipants(enrichedData);
            } catch (error) {
                console.error('Error enriching participants:', error);
                FirebaseMetricsService.recordError('enrich-participants', error as Error);
                // Fallback a participantes sin photoURL
                setEnrichedParticipants(participants.map(p => ({ ...p, photoURL: null })));
            } finally {
                setLoading(false);
            }
        };

        enrichParticipants();
    }, [participants]);

    return { enrichedParticipants, loading };
};
