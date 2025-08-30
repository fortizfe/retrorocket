import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Rocket, Users, Zap, Heart, Shield,
    MessageSquare, Vote, Group, FileText,
    Palette, Smartphone, Github, Globe,
    Play, Edit3, ArrowRight, Star,
    Download, Settings, CheckCircle
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../hooks/useLanguage';
import AuthButtonGroup from '../components/auth/AuthButtonGroup';
import UserProfileForm from '../components/auth/UserProfileForm';
import AuthWrapper from '../components/auth/AuthWrapper';
import ThemeToggle from '../components/ui/ThemeToggle';
import { AuthProviderType } from '../types/user';
import { APP_NAME } from '../utils/constants';

const LandingPage: React.FC = () => {
    const { signInWithGoogle, signInWithGithub, loading, user, userProfile, updateDisplayName } = useUser();
    const { t } = useLanguage();
    const [showProfileForm, setShowProfileForm] = useState(false);

    const handleProviderSignIn = async (providerId: AuthProviderType) => {
        try {
            switch (providerId) {
                case 'google':
                    await signInWithGoogle();
                    break;
                case 'github':
                    await signInWithGithub();
                    break;
                default:
                    console.warn(`Provider ${providerId} not yet implemented`);
                    return;
            }
            // If this is first time (no displayName or default one), show profile form
            setShowProfileForm(true);
        } catch (error) {
            console.error(`Sign in with ${providerId} error:`, error);
        }
    };

    const handleProfileSave = async (displayName: string) => {
        await updateDisplayName(displayName);
        setShowProfileForm(false);
        // Navigate to dashboard will be handled by AuthWrapper
    };

    if (showProfileForm && user && userProfile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-primary-50 dark:from-slate-900 dark:via-blue-950 dark:to-primary-950 flex items-center justify-center p-4 transition-colors duration-300">
                <div className="max-w-md w-full">
                    <UserProfileForm
                        userProfile={userProfile}
                        onSave={handleProfileSave}
                        isFirstTime={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-primary-50 dark:from-slate-900 dark:via-blue-950 dark:to-primary-950 transition-colors duration-300">
            {/* Theme Toggle - Fixed position */}
            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Hero Section */}
            <div className="container mx-auto px-2 py-16">
                <div className="text-center max-w-4xl mx-auto">
                    {/* Logo and Title */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-soft">
                                <Rocket className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                                {APP_NAME}
                            </h1>
                        </div>
                        <p className="text-xl text-slate-600 dark:text-slate-300 mb-2">
                            {t('landing.hero.description')}
                        </p>
                        <p className="text-lg text-slate-500 dark:text-slate-400">
                            {t('landing.hero.tagline')}
                        </p>
                    </motion.div>

                    {/* Quick Access Auth Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-md mx-auto mb-16"
                    >
                        <div className="glass-strong rounded-xl p-8 shadow-medium border border-white/30 dark:border-slate-700/30">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
                                {t('landing.hero.cta.title')}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">
                                {t('landing.hero.cta.subtitle')}
                            </p>

                            <AuthButtonGroup
                                onProviderSignIn={handleProviderSignIn}
                                loading={loading}
                            />

                            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-4">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>{t('landing.hero.cta.freeForever')}</span>
                                <span className="mx-2">•</span>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>{t('landing.hero.cta.noLimits')}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Features Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid md:grid-cols-3 gap-6 mb-12"
                    >
                        <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300">
                            <Users className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('landing.features.connectTeams.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                {t('landing.features.connectTeams.description')}
                            </p>
                        </div>
                        <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300">
                            <Zap className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('landing.features.immediateResults.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                {t('landing.features.immediateResults.description')}
                            </p>
                        </div>
                        <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300">
                            <Heart className="w-8 h-8 text-sky-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('landing.features.easyToAdopt.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                {t('landing.features.easyToAdopt.description')}
                            </p>
                        </div>
                    </motion.div>

                    {/* Main Features Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-16 mb-16"
                    >
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                                {t('landing.mainFeatures.title')}
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                                {t('landing.mainFeatures.subtitle')}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Authentication */}
                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <Shield className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {t('landing.mainFeatures.advancedAuth.title')}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {t('landing.mainFeatures.advancedAuth.description')}
                                </p>
                            </div>

                            {/* Real-time Collaboration */}
                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {t('landing.mainFeatures.realTimeCollab.title')}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {t('landing.mainFeatures.realTimeCollab.description')}
                                </p>
                            </div>

                            {/* Card System */}
                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {t('landing.mainFeatures.cardSystem.title')}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {t('landing.mainFeatures.cardSystem.description')}
                                </p>
                            </div>

                            {/* Smart Grouping */}
                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <Group className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {t('landing.mainFeatures.smartGrouping.title')}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {t('landing.mainFeatures.smartGrouping.description')}
                                </p>
                            </div>

                            {/* Professional Export */}
                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {t('landing.mainFeatures.professionalExport.title')}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {t('landing.mainFeatures.professionalExport.description')}
                                </p>
                            </div>

                            {/* Modern UI */}
                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <Palette className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {t('landing.mainFeatures.modernUI.title')}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {t('landing.mainFeatures.modernUI.description')}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* How It Works Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-16 mb-16"
                    >
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                                {t('landing.howItWorks.title')}
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                                {t('landing.howItWorks.subtitle')}
                            </p>
                        </div>

                        <div className="max-w-4xl mx-auto">
                            {/* Step 1 */}
                            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                                <div className="w-full md:w-1/2">
                                    <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                1
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                                {t('landing.howItWorks.step1.title')}
                                            </h3>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 mb-4">
                                            {t('landing.howItWorks.step1.description')}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Play className="w-4 h-4" />
                                            <span>{t('landing.howItWorks.step1.time')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="glass-strong rounded-xl p-8 shadow-medium border border-white/30 dark:border-slate-700/30 text-center">
                                        <Globe className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('landing.howItWorks.step1.sharing')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col md:flex-row-reverse items-center gap-8 mb-12">
                                <div className="w-full md:w-1/2">
                                    <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                2
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                                {t('landing.howItWorks.step2.title')}
                                            </h3>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 mb-4">
                                            {t('landing.howItWorks.step2.description')}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Edit3 className="w-4 h-4" />
                                            <span>{t('landing.howItWorks.step2.tip')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="glass-strong rounded-xl p-8 shadow-medium border border-white/30 dark:border-slate-700/30 text-center">
                                        <div className="flex justify-center gap-4 mb-4">
                                            <Vote className="w-12 h-12 text-green-500" />
                                            <Star className="w-12 h-12 text-yellow-500" />
                                            <Heart className="w-12 h-12 text-red-500" />
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('landing.howItWorks.step2.actions')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                                <div className="w-full md:w-1/2">
                                    <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                3
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                                {t('landing.howItWorks.step3.title')}
                                            </h3>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 mb-4">
                                            {t('landing.howItWorks.step3.description')}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Settings className="w-4 h-4" />
                                            <span>{t('landing.howItWorks.step3.tip')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="glass-strong rounded-xl p-8 shadow-medium border border-white/30 dark:border-slate-700/30 text-center">
                                        <Download className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('landing.howItWorks.step3.sharing')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Technology Stack */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 }}
                        className="mt-16 mb-16"
                    >
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                                {t('landing.technology.title')}
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                                {t('landing.technology.subtitle')}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                                    <Zap className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('landing.technology.reactTypeScript')}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{t('landing.technology.reactTypeScript_desc')}</p>
                            </div>

                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                                    <Shield className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('landing.technology.firebase')}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{t('landing.technology.firebase_desc')}</p>
                            </div>

                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                                    <Palette className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('landing.technology.tailwind')}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{t('landing.technology.tailwind_desc')}</p>
                            </div>

                            <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                                    <Smartphone className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('landing.technology.mobileFirst')}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{t('landing.technology.mobileFirst_desc')}</p>
                            </div>
                        </div>

                        <div className="text-center mt-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">{t('landing.technology.openSource')}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Final Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                        className="text-center mb-16"
                    >
                        <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 max-w-xl mx-auto">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                                {t('landing.finalMessage.title')}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 mb-4">
                                {t('landing.finalMessage.subtitle')}
                            </p>

                            <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Github className="w-3 h-3" />
                                <span>{t('landing.finalMessage.githubLink')}</span>
                                <ArrowRight className="w-3 h-3 ml-1" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/20 dark:border-slate-700/20 bg-white/5 dark:bg-slate-900/20 backdrop-blur-sm">
                <div className="container mx-auto px-2 py-8">
                    <div className="text-center text-slate-600 dark:text-slate-400">
                        <p className="text-sm">
                            {t('landing.footer.copyright', { appName: APP_NAME })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Landing: React.FC = () => {
    return (
        <AuthWrapper requireAuth={false}>
            <LandingPage />
        </AuthWrapper>
    );
};

export default Landing;
