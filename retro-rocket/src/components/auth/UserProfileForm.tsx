import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Save } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { UserProfile } from '../../types/user';

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
            className={`bg-white rounded-xl shadow-lg p-6 ${className}`}
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
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        ¡Bienvenido a RetroRocket! 🚀
                    </h2>
                    <p className="text-gray-600">
                        Completa tu perfil para comenzar a crear retrospectivas
                    </p>
                </div>
            )}

            {!isFirstTime && (
                <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Editar Perfil
                    </h3>
                    <p className="text-gray-600">
                        Actualiza tu información personal
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email
                    </label>
                    <Input
                        type="email"
                        value={userProfile?.email ?? ''}
                        disabled
                        className="bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        El email no puede ser modificado
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-2" />
                        Nombre a mostrar *
                    </label>
                    <Input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Tu nombre completo"
                        required
                        className="focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Este nombre aparecerá en los tableros que crees
                    </p>
                </div>

                <Button
                    type="submit"
                    disabled={!displayName.trim() || isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {isFirstTime ? 'Continuar' : 'Guardar cambios'}
                        </>
                    )}
                </Button>
            </form>

            {isFirstTime && (
                <div className="mt-4 text-center text-xs text-gray-500">
                    Podrás editar esta información desde tu perfil en cualquier momento
                </div>
            )}
        </motion.div>
    );
};

export default UserProfileForm;
