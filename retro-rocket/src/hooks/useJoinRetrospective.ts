import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRetrospectiveById, incrementParticipantCount } from '../services/retrospectiveService';
import { addParticipant } from '../services/participantService';
import { userService } from '../services/userService';
import { useUser } from '../contexts/UserContext';
import toast from 'react-hot-toast';

interface UseJoinRetrospectiveReturn {
    isJoining: boolean;
    error: string | null;
    joinByIdAndNavigate: (boardId: string) => Promise<void>;
    clearError: () => void;
}

export const useJoinRetrospective = (): UseJoinRetrospectiveReturn => {
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user, userProfile } = useUser();
    const navigate = useNavigate();

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const joinByIdAndNavigate = useCallback(async (boardId: string): Promise<void> => {
        if (!user || !userProfile) {
            throw new Error('Usuario no autenticado');
        }

        if (!boardId.trim()) {
            throw new Error('ID del tablero requerido');
        }

        setIsJoining(true);
        setError(null);

        try {
            // First, verify the retrospective exists and user can join
            const retrospective = await joinRetrospectiveById(
                boardId.trim(),
                user.uid,
                userProfile.displayName
            );

            // Add user as participant
            const participantResult = await addParticipant({
                name: userProfile.displayName,
                userId: user.uid,
                retrospectiveId: boardId.trim()
            });

            // Only increment count if it's a new participant
            if (participantResult.isNew) {
                await incrementParticipantCount(boardId.trim());
            }

            // Add to user's board history
            await userService.addBoardToUserHistory(
                user.uid,
                boardId.trim(),
                retrospective.title
            );

            // Add to user's joined boards list
            await userService.addJoinedBoard(user.uid, boardId.trim());

            // Store participant info to prevent auto-join on navigation
            localStorage.setItem(
                `participant_${boardId.trim()}_${user.uid}`,
                participantResult.id
            );

            toast.success(`Te has unido a "${retrospective.title}" exitosamente`);

            // Navigate to the retrospective
            navigate(`/retro/${boardId.trim()}`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al unirse a la retrospectiva';
            setError(errorMessage);
            toast.error(errorMessage);
            throw err;
        } finally {
            setIsJoining(false);
        }
    }, [user, userProfile, navigate]);

    return {
        isJoining,
        error,
        joinByIdAndNavigate,
        clearError
    };
};
