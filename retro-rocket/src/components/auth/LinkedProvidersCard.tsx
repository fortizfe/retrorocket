import React from 'react';
import { motion } from 'framer-motion';
import { Link, Shield, Check, Plus, Github } from 'lucide-react';
import { useLinkedProviders, getProviderDisplayName } from '../../hooks/useLinkedProviders';
import { accountLinkingService } from '../../services/accountLinking';
import { AuthProviderType } from '../../types/user';
import { useUser } from '../../contexts/UserContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Loading from '../ui/Loading';
import toast from 'react-hot-toast';

interface LinkedProvidersCardProps {
    className?: string;
}

const LinkedProvidersCard: React.FC<LinkedProvidersCardProps> = ({ className = '' }) => {
    const { linkedProviders, isLoading, error, refreshLinkedProviders } = useLinkedProviders();
    const { refreshUserProfile } = useUser();

    const availableProviders: { id: AuthProviderType; name: string; icon: React.ReactNode }[] = [
        {
            id: 'google',
            name: 'Google',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            )
        },
        {
            id: 'github',
            name: 'GitHub',
            icon: <Github className="w-5 h-5" />
        },
    ];

    const handleLinkProvider = async (providerType: AuthProviderType) => {
        try {
            const result = await accountLinkingService.signInWithAccountLinking(providerType);

            if (result.success) {
                if (result.wasLinked) {
                    toast.success(result.message, {
                        duration: 6000,
                        style: { maxWidth: '450px' },
                    });
                } else {
                    toast.success(`Proveedor ${getProviderDisplayName(providerType + '.com')} vinculado exitosamente`);
                }

                // Refresh both linked providers and user profile to update the UI
                await Promise.all([
                    refreshLinkedProviders(),
                    refreshUserProfile()
                ]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al vincular proveedor';
            toast.error(errorMessage, {
                duration: 6000,
                style: { maxWidth: '400px' },
            });
        }
    };

    const getProviderIcon = (providerId: string): React.ReactNode => {
        switch (providerId) {
            case 'google.com':
                return (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                );
            case 'github.com':
                return <Github className="w-5 h-5" />;
            case 'apple.com':
                return '🍎';
            default:
                return '🔐';
        }
    };

    const isProviderLinked = (providerType: AuthProviderType): boolean => {
        return linkedProviders.includes(`${providerType}.com`);
    };

    if (error) {
        return (
            <Card className={`p-6 ${className}`}>
                <div className="text-center">
                    <Shield className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                    <Button
                        onClick={refreshLinkedProviders}
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                    >
                        Reintentar
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className={`p-6 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Métodos de Inicio de Sesión
                </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                Administra los métodos de autenticación vinculados a tu cuenta. Puedes iniciar sesión con cualquiera de estos proveedores.
            </p>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loading size="sm" />
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Linked Providers */}
                    {linkedProviders.length > 0 && (
                        <>
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Métodos vinculados
                            </h4>
                            {linkedProviders.map((providerId) => (
                                <motion.div
                                    key={providerId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center">{getProviderIcon(providerId)}</div>
                                        <div>
                                            <div className="font-medium text-green-800 dark:text-green-300">
                                                {getProviderDisplayName(providerId)}
                                            </div>
                                            <div className="text-xs text-green-600 dark:text-green-400">
                                                Vinculado y activo
                                            </div>
                                        </div>
                                    </div>
                                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </motion.div>
                            ))}
                        </>
                    )}

                    {/* Available Providers to Link */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 pt-2">
                            Vincular método adicional
                        </h4>
                        {availableProviders
                            .filter(provider => !isProviderLinked(provider.id))
                            .map((provider) => (
                                <motion.div
                                    key={provider.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center">{provider.icon}</div>
                                        <div>
                                            <div className="font-medium text-slate-800 dark:text-slate-200">
                                                {provider.name}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                No vinculado
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleLinkProvider(provider.id)}
                                        variant="secondary"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Vincular
                                    </Button>
                                </motion.div>
                            ))}
                    </div>

                    {/* Security Notice */}
                    <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                            <Link className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-800 dark:text-blue-300">
                                <strong>Seguridad:</strong> Vincular múltiples métodos te permite acceder a tu cuenta
                                de diferentes formas. Todos los métodos vinculados comparten la misma información de usuario
                                y retrospectivas.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default LinkedProvidersCard;
