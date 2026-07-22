import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Save } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Button from '@/lib/components/ui/Button';
import Input from '@/lib/components/ui/Input';
import { UserProfile } from '@/features/auth/types/user';

interface UserProfileFormProps {
    userProfile: UserProfile | null;
    onSave: (displayName: string) => Promise<void>;
    isFirstTime?: boolean;
    className?: string;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({
    userProfile,
    onSave,
    isFirstTime = false,
    className = '',
}) => {
    const { t } = useLanguage();
    const [displayName, setDisplayName] = useState(userProfile?.displayName ?? '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!displayName.trim()) {
            return;
        }

        try {
            setIsLoading(true);
            await onSave(displayName.trim());
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-surface-raised rounded-xl shadow-lg p-6 ${className}`}
        >
            {isFirstTime && (
                <div className="text-center mb-6">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <User className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">
                        {t('auth.userProfileForm.welcome')}
                    </h2>
                    <p className="text-text-secondary">
                        {t('auth.userProfileForm.welcomeSubtitle')}
                    </p>
                </div>
            )}

            {!isFirstTime && (
                <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                        {t('auth.userProfileForm.editProfile')}
                    </h3>
                    <p className="text-text-secondary">
                        {t('auth.userProfileForm.editProfileSubtitle')}
                    </p>
                </div>
            )}

            {userProfile?.photoURL && (
                <div className="text-center mb-6">
                    <img
                        src={userProfile.photoURL}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full mx-auto border-4 border-white shadow-lg"
                    />
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="profile-email" className="block text-sm font-medium text-text-secondary mb-2">
                        <Mail className="w-4 h-4 inline mr-2" />
                        {t('auth.userProfileForm.email')}
                    </label>
                    <Input
                        id="profile-email"
                        type="email"
                        value={userProfile?.email ?? ''}
                        disabled
                        className="bg-surface text-text-muted"
                    />
                    <p className="text-xs text-text-muted mt-1">
                        {t('auth.userProfileForm.emailNotEditable')}
                    </p>
                </div>

                <div>
                    <label htmlFor="profile-display-name" className="block text-sm font-medium text-text-secondary mb-2">
                        <User className="w-4 h-4 inline mr-2" />
                        {t('auth.userProfileForm.displayName')}
                    </label>
                    <Input
                        id="profile-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t('auth.userProfileForm.displayNamePlaceholder')}
                        required
                    />
                    <p className="text-xs text-text-muted mt-1">
                        {t('auth.userProfileForm.displayNameHelp')}
                    </p>
                </div>

                <Button
                    type="submit"
                    disabled={!displayName.trim() || isLoading}
                    variant="primary"
                    className="w-full py-3 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t('auth.userProfileForm.saving')}
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {isFirstTime ? t('auth.userProfileForm.continue') : t('auth.userProfileForm.saveChanges')}
                        </>
                    )}
                </Button>
            </form>

            {isFirstTime && (
                <div className="mt-4 text-center text-xs text-text-muted">
                    {t('auth.userProfileForm.editLaterNote')}
                </div>
            )}
        </motion.div>
    );
};

export default UserProfileForm;
