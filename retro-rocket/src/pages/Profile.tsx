import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, LogOut } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import AuthWrapper from '../components/auth/AuthWrapper';
import UserProfileForm from '../components/auth/UserProfileForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const ProfilePage: React.FC = () => {
    const { userProfile, updateDisplayName, signOut } = useUser();

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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <User className="w-8 h-8 text-purple-600" />
                                Mi Perfil
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Gestiona tu información personal y configuraciones de cuenta
                            </p>
                        </div>
                        <Button
                            onClick={handleSignOut}
                            variant="secondary"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar Sesión
                        </Button>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Profile Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <Card className="p-6 bg-white/80 backdrop-blur-sm border border-white/20">
                            <div className="text-center">
                                {userProfile?.photoURL && (
                                    <img
                                        src={userProfile.photoURL}
                                        alt="Avatar"
                                        className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                                    />
                                )}

                                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                                    {userProfile?.displayName}
                                </h2>

                                <div className="space-y-3 text-sm text-gray-600">
                                    <div className="flex items-center justify-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{userProfile?.email}</span>
                                    </div>

                                    <div className="flex items-center justify-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            Miembro desde {userProfile?.createdAt ? formatDate(userProfile.createdAt) : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">Proveedor de autenticación</div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                                        {userProfile?.provider && getProviderName(userProfile.provider)}
                                    </div>
                                </div>
                            </div>
                        </Card>
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
                            className="bg-white/80 backdrop-blur-sm border border-white/20"
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
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border border-white/20">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Acciones de Cuenta
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-800">Exportar Datos</h4>
                                    <p className="text-sm text-gray-600">
                                        Descarga todos tus datos de retrospectivas
                                    </p>
                                </div>
                                <Button variant="secondary" disabled>
                                    Próximamente
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                                <div>
                                    <h4 className="font-medium text-red-800">Eliminar Cuenta</h4>
                                    <p className="text-sm text-red-600">
                                        Elimina permanentemente tu cuenta y todos los datos
                                    </p>
                                </div>
                                <Button variant="secondary" className="text-red-600 hover:text-red-700" disabled>
                                    Eliminar
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
