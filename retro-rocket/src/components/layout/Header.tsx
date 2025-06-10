import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Header: React.FC = () => {
    const { user, isAuthenticated } = useAuth();

    return (
        <header className="bg-blue-600 text-white p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">RetroRocket</h1>
                    <p className="text-sm">Manage your retrospectives collaboratively and fun!</p>
                </div>
                {isAuthenticated && (
                    <div className="text-right">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm">Conectado</span>
                        </div>
                        <p className="text-xs text-blue-200">ID: {user?.uid?.slice(-8)}</p>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;