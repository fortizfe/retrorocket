import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Loading from './ui/Loading';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { user, loading, error, signInAnonymouslyIfNeeded } = useAuth();

    useEffect(() => {
        if (!loading && !user && !error) {
            signInAnonymouslyIfNeeded();
        }
    }, [user, loading, error, signInAnonymouslyIfNeeded]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <Loading />
                    <p className="mt-4 text-gray-600">Conectando con Firebase...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Error de Autenticación</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-100">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="text-yellow-500 text-6xl mb-4">🔑</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Autenticación Requerida</h2>
                    <p className="text-gray-600 mb-4">Iniciando sesión automáticamente...</p>
                    <button
                        onClick={signInAnonymouslyIfNeeded}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                    >
                        Conectar
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
