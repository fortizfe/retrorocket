import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Users, Zap, Heart, ArrowRight } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import AuthButtonGroup from '../components/auth/AuthButtonGroup';
import UserProfileForm from '../components/auth/UserProfileForm';
import AuthWrapper from '../components/auth/AuthWrapper';
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
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center p-4">
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
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
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                <Rocket className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {APP_NAME}
                            </h1>
                        </div>
                        <p className="text-xl text-gray-600 mb-2">
                            {APP_DESCRIPTION}
                        </p>
                        <p className="text-lg text-gray-500">
                            Herramienta colaborativa moderna para equipos Scrum
                        </p>
                    </motion.div>

                    {/* Features Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid md:grid-cols-3 gap-6 mb-12"
                    >
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                            <Users className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Colaborativo</h3>
                            <p className="text-gray-600 text-sm">
                                Trabaja en tiempo real con tu equipo, sin límites geográficos
                            </p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                            <Zap className="w-8 h-8 text-pink-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Rápido</h3>
                            <p className="text-gray-600 text-sm">
                                Configura y ejecuta retrospectivas en minutos, no horas
                            </p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                            <Heart className="w-8 h-8 text-red-500 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Intuitivo</h3>
                            <p className="text-gray-600 text-sm">
                                Interfaz limpia y accesible, enfocada en la experiencia del usuario
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
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-xl border border-white/30">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Accede a tu cuenta
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Inicia sesión para crear y gestionar tus retrospectivas
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
                        <p className="text-gray-600 mb-4">
                            ¿Ya tienes una cuenta? El botón de arriba te llevará directo a tus tableros
                        </p>
                    </motion.div>
                </div>
            </div>
            {/* Footer */}
            <div className="border-t border-white/20 bg-white/5 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-gray-600">
                        <p className="text-sm">
                            © 2024 {APP_NAME}. Hecho con ❤️ para equipos que buscan mejorar.
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
