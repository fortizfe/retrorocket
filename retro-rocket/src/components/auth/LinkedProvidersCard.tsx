import React from 'react';
import { motion } from 'framer-motion';
import { Link, Shield, Check, Plus } from 'lucide-react';
import { useLinkedProviders, getProviderDisplayName } from '../../hooks/useLinkedProviders';
import { accountLinkingService } from '../../services/accountLinking';
import { AuthProviderType } from '../../types/user';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Loading from '../ui/Loading';
import toast from 'react-hot-toast';

interface LinkedProvidersCardProps {
    className?: string;
}

const LinkedProvidersCard: React.FC<LinkedProvidersCardProps> = ({ className = '' }) => {
    const { linkedProviders, isLoading, error, refreshLinkedProviders } = useLinkedProviders();

    const availableProviders: { id: AuthProviderType; name: string; icon: string }[] = [
        { id: 'google', name: 'Google', icon: '🔍' },
        { id: 'github', name: 'GitHub', icon: '🐙' },
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
                await refreshLinkedProviders();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al vincular proveedor';
            toast.error(errorMessage, {
                duration: 6000,
                style: { maxWidth: '400px' },
            });
        }
    };

    const getProviderIcon = (providerId: string): string => {
        switch (providerId) {
            case 'google.com':
                return '🔍';
            case 'github.com':
                return '🐙';
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
                                        <span className="text-lg">{getProviderIcon(providerId)}</span>
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
                                        <span className="text-lg">{provider.icon}</span>
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
