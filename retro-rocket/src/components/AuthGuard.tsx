import React from 'react';
import { UserProvider } from '../contexts/UserContext';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    return (
        <UserProvider>
            {children}
        </UserProvider>
    );
};
