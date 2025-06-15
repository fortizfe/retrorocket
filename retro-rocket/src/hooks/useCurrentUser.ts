import { useUser } from '../contexts/UserContext';

/**
 * Hook personalizado que devuelve información completa del usuario actual
 * Incluye uid, displayName y datos extendidos desde Firestore
 */
export const useCurrentUser = () => {
    const { user, userProfile, isAuthenticated, loading } = useUser();

    return {
        uid: user?.uid ?? null,
        email: user?.email ?? null,
        displayName: userProfile?.displayName ?? user?.displayName ?? null,
        photoURL: user?.photoURL ?? null,
        userProfile,
        isAuthenticated,
        loading,
        // Datos auxiliares para facilitar el uso
        isReady: !loading && isAuthenticated && userProfile,
        fullName: userProfile?.displayName ?? user?.displayName ?? 'Usuario',
    };
};
