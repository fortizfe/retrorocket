import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, User, LayoutGrid, LogOut, ChevronDown } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { APP_NAME } from '../../utils/constants';

const Header: React.FC = () => {
    const { isAuthenticated, userProfile, signOut } = useUser();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const isActivePath = (path: string) => {
        return location.pathname === path;
    };

    if (!isAuthenticated) {
        return null; // Don't show header on landing page
    }

    return (
        <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-40">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/mis-tableros" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Rocket className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {APP_NAME}
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link
                            to="/mis-tableros"
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActivePath('/mis-tableros')
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Mis Tableros
                        </Link>
                    </nav>

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            {userProfile?.photoURL ? (
                                <img
                                    src={userProfile.photoURL}
                                    alt="Avatar"
                                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                            )}
                            <span className="hidden md:block text-sm font-medium text-gray-700">
                                {userProfile?.displayName ?? 'Usuario'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        </button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <>
                                    {/* Backdrop */}
                                    <button
                                        className="fixed inset-0 z-40 bg-transparent border-none cursor-default"
                                        onClick={() => setShowUserMenu(false)}
                                        aria-label="Cerrar menú"
                                    />

                                    {/* Menu */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                                    >
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                {userProfile?.photoURL ? (
                                                    <img
                                                        src={userProfile.photoURL}
                                                        alt="Avatar"
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                                        <User className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {userProfile?.displayName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {userProfile?.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1">
                                            <Link
                                                to="/perfil"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                Mi Perfil
                                            </Link>

                                            <Link
                                                to="/mis-tableros"
                                                onClick={() => setShowUserMenu(false)}
                                                className="md:hidden flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                                <LayoutGrid className="w-4 h-4" />
                                                Mis Tableros
                                            </Link>
                                        </div>

                                        {/* Sign Out */}
                                        <div className="border-t border-gray-100 pt-1">
                                            <button
                                                onClick={() => {
                                                    setShowUserMenu(false);
                                                    handleSignOut();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Cerrar Sesión
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;