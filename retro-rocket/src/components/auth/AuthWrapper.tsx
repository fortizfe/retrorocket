import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import Loading from '../ui/Loading';

interface AuthWrapperProps {
    children: React.ReactNode;
    requireAuth?: boolean;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children, requireAuth = true }) => {
    const { isAuthenticated, loading } = useUser();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <Loading />
                    <p className="mt-4 text-gray-600">Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    if (requireAuth && !isAuthenticated) {
        // Redirect to home with return path
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (!requireAuth && isAuthenticated) {
        // If user is authenticated and trying to access public route (like login)
        // redirect to dashboard or wherever they were trying to go
        const from = location.state?.from?.pathname ?? '/mis-tableros';
        return <Navigate to={from} replace />;
    }

    return <>{children}</>;
};

export default AuthWrapper;
