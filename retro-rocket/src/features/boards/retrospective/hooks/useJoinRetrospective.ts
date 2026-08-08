import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinBoard } from '@/features/dashboard/services/backendBoardsClient';
import { useUser } from '@/lib/contexts/useUserContext';
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
            // Joining (existence/active check, participant record, idempotency) is fully
            // handled by the backend now (FR-004). The board detail page's own auto-join
            // fallback (RetrospectivePage.tsx, out of scope for this feature) idempotently
            // resolves the participant id on first visit if the localStorage cache isn't
            // pre-populated here.
            const board = await joinBoard(boardId.trim());

            toast.success(`Te has unido a "${board.title}" exitosamente`);

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
