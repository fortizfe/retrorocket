import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bot, ShieldCheck } from 'lucide-react';
import { decideMcpAuthorization } from '@/features/auth/services/connectedAppsService';
import Button from '@/lib/components/ui/Button';
import Card from '@/lib/components/ui/Card';
import Loading from '@/lib/components/ui/Loading';

/**
 * OAuth consent screen for the MCP connector (feature 015): rendered by the SPA at
 * /mcp/consent after the backend's GET /api/mcp/authorize confirms the user is signed in
 * and the client/redirect_uri are valid. Allow/Deny posts the decision back to the
 * backend, which returns the URL to redirect the browser to (the AI client's own
 * redirect_uri, carrying the authorization code or an error).
 */
const McpConsentScreen: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(false);

    const requestCode = searchParams.get('requestCode') ?? '';
    const clientName = searchParams.get('clientName') ?? '';

    const handleDecision = async (approve: boolean): Promise<void> => {
        setIsProcessing(true);
        setError(false);
        try {
            const result = await decideMcpAuthorization(requestCode, approve);
            window.location.assign(result.redirectUrl);
        } catch {
            setError(true);
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Card className="p-8 glass border border-border-default/50 text-center">
                    <Bot className="w-12 h-12 text-info-fg mx-auto mb-4" aria-hidden="true" />
                    <h1 className="text-xl font-semibold text-text-primary mb-3">
                        {t('mcpConnector.consent.title', { clientName })}
                    </h1>
                    <p className="text-sm text-text-secondary mb-6">{t('mcpConnector.consent.description', { clientName })}</p>

                    <div className="flex items-start gap-2 p-3 bg-info-bg rounded-lg border border-info-fg mb-6 text-left">
                        <ShieldCheck className="w-4 h-4 text-info-fg mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <p className="text-xs text-info-fg">{t('mcpConnector.connectedApps.description')}</p>
                    </div>

                    {error && <p className="text-sm text-error-fg mb-4">{t('mcpConnector.consent.error', { clientName })}</p>}

                    {isProcessing ? (
                        <div className="flex justify-center py-2">
                            <Loading size="sm" />
                            <span className="sr-only">{t('mcpConnector.consent.processing')}</span>
                        </div>
                    ) : (
                        <div className="flex gap-3 justify-center">
                            <Button onClick={() => handleDecision(false)} variant="secondary">
                                {t('mcpConnector.consent.deny')}
                            </Button>
                            <Button onClick={() => handleDecision(true)}>{t('mcpConnector.consent.allow')}</Button>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
};

export default McpConsentScreen;
