import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinBoard } from '@/features/boards/participants/services/participantsApiClient';
import { useUser } from '@/lib/contexts/UserContext';
import toast from 'react-hot-toast';

interface UseJoinRetrospectiveReturn {
    isJoining: boolean;
    error: string | null;
    joinByIdAndNavigate: (boardId: string) => Promise<void>;
    clearError: () => void;
}

/**
 * Backend-mediated replacement for the 4-round-trip client flow this hook used to
 * orchestrate (joinRetrospectiveById → addParticipant → incrementParticipantCount →
 * userService.addBoardToUserHistory/addJoinedBoard) — feature 017 US4. `joinBoard` now
 * does all of that atomically server-side in one call (contracts/boards-api.md
 * `POST /api/boards/:id/join`), and its response already carries the board's title.
 */
export const useJoinRetrospective = (): UseJoinRetrospectiveReturn => {
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useUser();
    const navigate = useNavigate();

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const joinByIdAndNavigate = useCallback(async (boardId: string): Promise<void> => {
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        const trimmedId = boardId.trim();
        if (!trimmedId) {
            throw new Error('ID del tablero requerido');
        }

        setIsJoining(true);
        setError(null);

        try {
            const result = await joinBoard(trimmedId);

            // Store participant info to prevent auto-join on navigation
            localStorage.setItem(`participant_${trimmedId}_${user.uid}`, result.id);

            toast.success(`Te has unido a "${result.boardTitle}" exitosamente`);

            navigate(`/retro/${trimmedId}`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al unirse a la retrospectiva';
            setError(errorMessage);
            toast.error(errorMessage);
            throw err;
        } finally {
            setIsJoining(false);
        }
    }, [user, navigate]);

    return {
        isJoining,
        error,
        joinByIdAndNavigate,
        clearError
    };
};
