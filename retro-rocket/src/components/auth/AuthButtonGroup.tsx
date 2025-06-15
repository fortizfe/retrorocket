import React from 'react';
import { motion } from 'framer-motion';
import { Github, Apple } from 'lucide-react';
import Button from '../ui/Button';
import { AuthProvider, AuthProviderType } from '../../types/user';
import { getAvailableProviders } from '../../services/authProvider';

interface AuthButtonGroupProps {
    onProviderSignIn: (providerId: AuthProviderType) => void;
    loading?: boolean;
    className?: string;
}

// Static configuration for providers UI
const providerUIConfig: Record<AuthProviderType, { name: string; comingSoon?: boolean }> = {
    google: { name: 'Continuar con Google' },
    github: { name: 'Continuar con GitHub' },
    apple: { name: 'Próximamente: Apple', comingSoon: true },
};

const getProviderIcon = (provider: AuthProviderType) => {
    switch (provider) {
        case 'google':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            );
        case 'github':
            return <Github className="w-5 h-5" />;
        case 'apple':
            return <Apple className="w-5 h-5" />;
        default:
            return null;
    }
};

const getProviderStyles = (providerId: AuthProviderType) => {
    // Todos los proveedores usan los mismos estilos base
    return '!bg-white dark:!bg-slate-800 !text-slate-900 dark:!text-slate-100 border border-slate-300 dark:border-slate-600 hover:!bg-slate-50 dark:hover:!bg-slate-700 hover:border-primary-400 dark:hover:border-primary-500';
};

const AuthButtonGroup: React.FC<AuthButtonGroupProps> = ({
    onProviderSignIn,
    loading = false,
    className = '',
}) => {
    // Get available providers from service and combine with UI config
    const availableProviders = getAvailableProviders();
    const allProviders: AuthProviderType[] = ['google', 'github', 'apple'];

    const providers = allProviders.map(providerId => {
        const isAvailable = availableProviders.some(p => p.providerId === providerId);
        const config = providerUIConfig[providerId];

        return {
            id: providerId,
            name: config.name,
            icon: providerId,
            available: isAvailable,
            comingSoon: config.comingSoon,
        } as AuthProvider;
    });

    return (
        <div className={`space-y-3 ${className}`}>
            {providers.map((provider, index) => (
                <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Button
                        onClick={provider.available ? () => onProviderSignIn(provider.id) : undefined}
                        disabled={!provider.available || loading}
                        variant="ghost"
                        className={`
              w-full h-12 text-sm font-medium flex items-center justify-center gap-3
              ${provider.available
                                ? getProviderStyles(provider.id)
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            }
              ${loading ? 'opacity-50' : ''}
            `}
                    >
                        {getProviderIcon(provider.id)}
                        <span className="flex-1 text-center">
                            {loading ? 'Iniciando sesión...' : provider.name}
                        </span>
                        {provider.comingSoon && (
                            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full">
                                Pronto
                            </span>
                        )}
                    </Button>
                </motion.div>
            ))}

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                Al continuar, aceptas nuestros términos y condiciones
            </div>
        </div>
    );
};

export default AuthButtonGroup;
