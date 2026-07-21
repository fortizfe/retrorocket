import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, LogOut } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useLanguage } from '@/lib/hooks/useLanguage';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import UserProfileForm from '@/features/auth/components/UserProfileForm';
import LinkedProvidersCard from '@/features/auth/components/LinkedProvidersCard';
import Button from '@/lib/components/ui/Button';
import Card from '@/lib/components/ui/Card';

const ProfilePage: React.FC = () => {
    const { userProfile, updateDisplayName, signOut } = useUser();
    const { t } = useLanguage();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    };

    const getProviderName = (provider: string) => {
        switch (provider) {
            case 'google':
                return 'Google';
            case 'github':
                return 'GitHub';
            case 'apple':
                return 'Apple';
            default:
                return provider;
        }
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-2 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                                {t('profile.title')}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300 mt-2">
                                {t('profile.subtitle')}
                            </p>
                        </div>
                        <Button
                            onClick={handleSignOut}
                            variant="secondary"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            {t('profile.signOut')}
                        </Button>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Profile Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1 space-y-6"
                    >
                        <Card className="p-6 glass border border-slate-200/50 dark:border-slate-700/50">
                            <div className="text-center">
                                {userProfile?.photoURL && (
                                    <img
                                        src={userProfile.photoURL}
                                        alt="Avatar"
                                        className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white dark:border-slate-700 shadow-soft"
                                    />
                                )}

                                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {userProfile?.displayName}
                                </h2>

                                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center justify-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{userProfile?.email}</span>
                                    </div>

                                    <div className="flex items-center justify-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {t('profile.memberSince')} {userProfile?.createdAt ? formatDate(userProfile.createdAt) : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('profile.primaryProvider')}</div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {userProfile?.primaryProvider && getProviderName(userProfile.primaryProvider)}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Linked Providers */}
                        <LinkedProvidersCard className="glass border border-slate-200/50 dark:border-slate-700/50" />
                    </motion.div>

                    {/* Edit Profile Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-2"
                    >
                        <UserProfileForm
                            userProfile={userProfile}
                            onSave={updateDisplayName}
                            isFirstTime={false}
                            className="glass border border-slate-200/50 dark:border-slate-700/50"
                        />
                    </motion.div>
                </div>

                {/* Account Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8"
                >
                    <Card className="p-6 glass border border-slate-200/50 dark:border-slate-700/50">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                            {t('profile.accountActions.title')}
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div>
                                    <h4 className="font-medium text-slate-800 dark:text-slate-100">{t('profile.accountActions.exportData.title')}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {t('profile.accountActions.exportData.description')}
                                    </p>
                                </div>
                                <Button variant="secondary" disabled>
                                    {t('profile.accountActions.exportData.button')}
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/50">
                                <div>
                                    <h4 className="font-medium text-red-800 dark:text-red-300">{t('profile.accountActions.deleteAccount.title')}</h4>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {t('profile.accountActions.deleteAccount.description')}
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                    disabled
                                >
                                    {t('profile.accountActions.deleteAccount.button')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

const Profile: React.FC = () => {
    return (
        <AuthWrapper requireAuth={true}>
            <ProfilePage />
        </AuthWrapper>
    );
};

export default Profile;
