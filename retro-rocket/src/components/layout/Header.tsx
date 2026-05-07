import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, User, LayoutGrid, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext, useUserProfileContext } from '../../contexts/UserContext';
import { APP_NAME } from '../../utils/constants';
import ThemeToggle from '../ui/ThemeToggle';
import ThemeMenuToggle from '../ui/ThemeMenuToggle';
// ...existing imports...
import LanguageMenuList from '../ui/LanguageMenuList';
import RetrospectiveTopbar from '../../components/retrospective/RetrospectiveTopbar';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
    const { isAuthenticated, signOut } = useAuthContext();
    const { user, userProfile } = useUserProfileContext();
    const { t } = useTranslation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuButtonRef = useRef<HTMLButtonElement>(null);
    const [userMenuPosition, setUserMenuPosition] = useState({ top: 0, left: 0 });
    const navigate = useNavigate();
    const location = useLocation();
    // Match both legacy '/retro/:id' and verbose '/retrospective/:id' routes
    const isRetrospectiveRoute = location.pathname.startsWith('/retro/') || location.pathname.startsWith('/retrospective/');

    // extract id from path like /retro/:id or /retrospective/:id
    const pathParts = location.pathname.split('/').filter(Boolean);
    let retrospectiveId: string | undefined;
    if (pathParts[0] === 'retro' || pathParts[0] === 'retrospective') {
        retrospectiveId = pathParts[1];
    }

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const calculateUserMenuPosition = () => {
        if (!userMenuButtonRef.current) return;

        const buttonRect = userMenuButtonRef.current.getBoundingClientRect();
        const menuWidth = 224; // w-56 = 224px

        let left = buttonRect.right - menuWidth;
        if (left < 10) {
            left = buttonRect.left;
        }

        setUserMenuPosition({
            top: buttonRect.bottom + 8,
            left: left
        });
    };

    const handleUserMenuToggle = () => {
        if (!showUserMenu) {
            calculateUserMenuPosition();
        }
        setShowUserMenu(!showUserMenu);
    };

    useEffect(() => {
        const handleResize = () => {
            if (showUserMenu) {
                calculateUserMenuPosition();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [showUserMenu]);

    const isActivePath = (path: string) => {
        return location.pathname === path;
    };

    if (!isAuthenticated) {
        return null; // Don't show header on landing page
    }

    return (
        <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-soft border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
            <div className="container mx-auto px-2">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/mis-tableros" className="flex items-center gap-2 mr-6 md:mr-8 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                            <Rocket className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                            {APP_NAME}
                        </span>
                    </Link>

                    {/* Navigation or retrospective topbar */}
                    {isRetrospectiveRoute ? (
                        <RetrospectiveTopbar retrospectiveId={retrospectiveId} />
                    ) : (
                        <nav className="hidden md:flex items-center gap-6">
                            <Link
                                to="/mis-tableros"
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActivePath('/mis-tableros')
                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                {t('header.myBoards')}
                            </Link>
                        </nav>
                    )}

                    {/* Right side actions */}
                    <div className="flex items-center gap-4">
                        {/* User Menu */}
                        <div>
                            <button
                                ref={userMenuButtonRef}
                                onClick={handleUserMenuToggle}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                {userProfile?.photoURL ? (
                                    <img
                                        src={userProfile.photoURL}
                                        alt="Avatar"
                                        className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm"
                                    />
                                ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                        <User className="w-4 h-4 text-white" data-testid="user-icon" />
                                    </div>
                                )}
                                <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || t('header.user')}
                                </span>
                                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* User Menu Portal */}
                        {typeof document !== 'undefined' && createPortal(
                            <AnimatePresence>
                                {showUserMenu && (
                                    <>
                                        {/* Backdrop */}
                                        <button
                                            className="fixed inset-0 z-40 bg-transparent border-none cursor-default"
                                            onClick={() => setShowUserMenu(false)}
                                            aria-label={t('header.closeMenu')}
                                        />

                                        {/* Menu */}
                                        <motion.div
                                            role="menu"
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className="fixed z-50 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-medium border border-slate-200 dark:border-slate-700 py-2"
                                            style={{
                                                top: userMenuPosition.top,
                                                left: userMenuPosition.left
                                            }}
                                        >
                                            {/* User Info */}
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    {userProfile?.photoURL ? (
                                                        <img
                                                            src={userProfile.photoURL}
                                                            alt="Avatar"
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center">
                                                            <User className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                            {userProfile?.displayName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
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
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <User className="w-4 h-4" />
                                                    {t('header.profile')}
                                                </Link>

                                                {/* 'Mis tableros' for all screen sizes inside menu */}
                                                <Link
                                                    to="/mis-tableros"
                                                    onClick={() => setShowUserMenu(false)}
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <LayoutGrid className="w-4 h-4" />
                                                    {t('header.myBoards')}
                                                </Link>

                                                {/* Language selector rendered as menu rows to match other items */}
                                                <div className="px-2 py-2" role="presentation" aria-label={t('header.language')}>
                                                    <div className="text-xs text-slate-400 dark:text-slate-500 px-4 mb-2">{t('header.language')}</div>
                                                    <div className="px-0">
                                                        <LanguageMenuList onClose={() => setShowUserMenu(false)} />
                                                    </div>
                                                </div>

                                                {/* Theme toggle inside menu (menu-friendly) */}
                                                <div className="px-2 py-2">
                                                    <ThemeMenuToggle />
                                                </div>
                                            </div>

                                            {/* Sign Out */}
                                            <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
                                                <button
                                                    onClick={() => {
                                                        setShowUserMenu(false);
                                                        handleSignOut();
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    {t('header.signOut')}
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>,
                            document.body
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;