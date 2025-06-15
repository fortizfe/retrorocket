import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Users, Zap, Heart } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import AuthButtonGroup from '../components/auth/AuthButtonGroup';
import UserProfileForm from '../components/auth/UserProfileForm';
import AuthWrapper from '../components/auth/AuthWrapper';
import ThemeToggle from '../components/ui/ThemeToggle';
import { APP_NAME, APP_DESCRIPTION } from '../utils/constants';

const LandingPage: React.FC = () => {
    const { signInWithGoogle, loading, user, userProfile, updateDisplayName } = useUser();
    const [showProfileForm, setShowProfileForm] = useState(false);

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            // If this is first time (no displayName or default one), show profile form
            setShowProfileForm(true);
        } catch (error) {
            console.error('Sign in error:', error);
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
            <div className="container mx-auto px-4 py-16">
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
                            {APP_DESCRIPTION}
                        </p>
                        <p className="text-lg text-slate-500 dark:text-slate-400">
                            Facilita retrospectivas que realmente impulsen el crecimiento de tu equipo
                        </p>
                    </motion.div>

                    {/* Features Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid md:grid-cols-3 gap-6 mb-12"
                    >
                        <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300">
                            <Users className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Conecta equipos</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                Une a tu equipo desde cualquier lugar para crear mejores soluciones juntos
                            </p>
                        </div>
                        <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300">
                            <Zap className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Resultados inmediatos</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                Obtén insights valiosos y planes de acción en tiempo récord
                            </p>
                        </div>
                        <div className="glass rounded-xl p-6 shadow-soft border border-white/20 dark:border-slate-700/20 hover:shadow-medium transition-all duration-300">
                            <Heart className="w-8 h-8 text-sky-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Fácil de adoptar</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                Tu equipo se sentirá cómodo desde el primer minuto, sin curva de aprendizaje
                            </p>
                        </div>
                    </motion.div>

                    {/* Auth Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-md mx-auto"
                    >
                        <div className="glass-strong rounded-xl p-8 shadow-medium border border-white/30 dark:border-slate-700/30">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                                Comienza tu próxima retrospectiva
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 mb-6">
                                Únete en segundos y descubre cómo mejorar en equipo
                            </p>

                            <AuthButtonGroup
                                onGoogleSignIn={handleGoogleSignIn}
                                loading={loading}
                            />
                        </div>
                    </motion.div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-12 text-center"
                    >
                        <p className="text-slate-600 dark:text-slate-300 mb-4">
                            ¿Listo para revolucionar tus retrospectivas? Accede directo a tus tableros
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/20 dark:border-slate-700/20 bg-white/5 dark:bg-slate-900/20 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-slate-600 dark:text-slate-400">
                        <p className="text-sm">
                            © 2025 {APP_NAME}. Hecho con ❤️ para equipos que buscan mejorar.
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
