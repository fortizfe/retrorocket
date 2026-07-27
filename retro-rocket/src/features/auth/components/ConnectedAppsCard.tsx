import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bot, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConnectedApps } from '@/features/auth/hooks/useConnectedApps';
import Button from '@/lib/components/ui/Button';
import Card from '@/lib/components/ui/Card';
import Loading from '@/lib/components/ui/Loading';

interface ConnectedAppsCardProps {
    className?: string;
}

/**
 * Lists the AI clients (feature 015) a user has authorized via the MCP connector, and
 * lets them revoke any of them. Modeled directly on LinkedProvidersCard's card/list/
 * action pattern, since this is the same "manage what has access to my account" shape.
 */
const ConnectedAppsCard: React.FC<ConnectedAppsCardProps> = ({ className = '' }) => {
    const { t, i18n } = useTranslation();
    const { connectedApps, isLoading, error, revokingIds, revoke } = useConnectedApps();

    const formatDate = (iso: string): string =>
        new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));

    const handleRevoke = async (connectionId: string): Promise<void> => {
        try {
            await revoke(connectionId);
            toast.success(t('mcpConnector.connectedApps.revokeSuccess'));
        } catch {
            toast.error(t('mcpConnector.connectedApps.revokeError'));
        }
    };

    if (error) {
        return (
            <Card className={`p-6 ${className}`}>
                <div className="text-center">
                    <ShieldOff className="w-8 h-8 text-error-fg mx-auto mb-2" aria-hidden="true" />
                    <p className="text-error-fg text-sm">{t('mcpConnector.connectedApps.loadError')}</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className={`p-6 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <Bot className="w-5 h-5 text-info-fg" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-text-primary">{t('mcpConnector.connectedApps.title')}</h3>
            </div>

            <p className="text-sm text-text-secondary mb-6">{t('mcpConnector.connectedApps.description')}</p>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loading size="sm" />
                </div>
            ) : connectedApps.length === 0 ? (
                <p className="text-sm text-text-muted">{t('mcpConnector.connectedApps.empty')}</p>
            ) : (
                <div className="space-y-3">
                    {connectedApps.map((app) => {
                        const isRevoking = revokingIds.includes(app.id);
                        return (
                            <motion.div
                                key={app.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between p-3 bg-surface/50 rounded-lg border border-border-default"
                            >
                                <div className="flex items-center gap-3">
                                    <Bot className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                                    <div>
                                        <div className="font-medium text-text-primary">{app.clientName}</div>
                                        <div className="text-xs text-text-muted">
                                            {t('mcpConnector.connectedApps.connectedOn', { date: formatDate(app.createdAt) })}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleRevoke(app.id)}
                                    variant="secondary"
                                    size="sm"
                                    disabled={isRevoking}
                                    className="text-error-fg border-error-fg hover:bg-error-bg flex items-center gap-2"
                                    aria-label={`${t('mcpConnector.connectedApps.revoke')} ${app.clientName}`}
                                >
                                    <ShieldOff className="w-4 h-4" aria-hidden="true" />
                                    {isRevoking ? t('mcpConnector.connectedApps.revoking') : t('mcpConnector.connectedApps.revoke')}
                                </Button>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

export default ConnectedAppsCard;
