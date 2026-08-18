import React from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bot, ShieldOff, Monitor, Smartphone, Globe, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConnectedApps } from '@/features/auth/hooks/useConnectedApps';
import type { ConnectedApp } from '@/features/auth/services/connectedAppsService';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import Button from '@/lib/components/ui/Button';
import Card from '@/lib/components/ui/Card';
import Loading from '@/lib/components/ui/Loading';

interface ConnectedAppsCardProps {
    className?: string;
}

const ORIGIN_ICONS: Record<ConnectedApp['origin'], React.ElementType> = {
    desktop: Monitor,
    mobile: Smartphone,
    web: Globe,
    unknown: HelpCircle,
};

/**
 * The strong ease-out this page already uses for every other "quiet, not celebratory"
 * feedback/entrance moment (spec 050 T017/T022 — matches `ProfileDirectionB.tsx`'s
 * `EASE_OUT` and its own `ConnectedAppRow` reference exactly, per the `animate` skill's
 * decision for T032: reusing the codebase's established curve/duration for this exact
 * class of moment rather than inventing a new one).
 */
const ROW_EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

/**
 * Lists the AI clients (feature 015) a user has authorized via the MCP connector, and
 * lets them revoke any of them. Rebuilt per the selected "Structured Account Pane"
 * direction (spec 050-profile-redesign, tasks.md T030 —
 * `ProfileDirectionB.tsx`'s `ConnectedAppRow`, the same uniform Settings-row vocabulary
 * — leading icon slot, primary/secondary text, trailing action — `LinkedProvidersCard`
 * also now uses): list/revoke/loading/error/empty behavior is unchanged from before
 * this rebuild (all 11 pre-existing `ConnectedAppsCard.test.tsx` assertions still hold).
 *
 * T032 (animate skill): the revoke-in-progress -> removed transition is a deliberate,
 * infrequent, security-relevant action (removing a connected AI client), not a routine
 * one — purpose is "state indication" (the row leaving the list) and "preventing a
 * jarring change" (no instant teleport/reflow). `AnimatePresence` must directly parent
 * this list for the exit to play at all (pre-existing design-audit finding, spec 028).
 * Enter/exit both use `transform`(x)+`opacity` only, the codebase's established
 * quiet curve/duration (0.18s, `ROW_EASE`), and — the actual gap this task closes —
 * are now fully skipped (`duration: 0`, no x offset) under `useReducedMotion()`, which
 * the pre-rebuild version never checked at all.
 */
const ConnectedAppsCard: React.FC<ConnectedAppsCardProps> = ({ className = '' }) => {
    const { t, i18n } = useTranslation();
    const { connectedApps, isLoading, error, revokingIds, revoke } = useConnectedApps();
    const reducedMotion = useReducedMotion();

    const rowTransition: Transition = reducedMotion ? { duration: 0 } : { duration: 0.18, ease: ROW_EASE };
    const rowOffsetIn = reducedMotion ? 0 : -10;
    const rowOffsetOut = reducedMotion ? 0 : 10;

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
            <div className="flex items-center gap-3 mb-1">
                <Bot className="w-5 h-5 text-info-fg" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-text-primary">{t('mcpConnector.connectedApps.title')}</h3>
            </div>

            <p className="text-sm text-text-secondary mb-4">{t('mcpConnector.connectedApps.description')}</p>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loading size="sm" />
                </div>
            ) : connectedApps.length === 0 ? (
                <p className="text-sm text-text-muted">{t('mcpConnector.connectedApps.empty')}</p>
            ) : (
                <ul className="divide-y divide-border-default rounded-lg border border-border-default">
                    {/* AnimatePresence must directly parent this list for a revoked app to
                        exit-animate (design audit finding, spec 028; same class as DAF-001). */}
                    <AnimatePresence initial={false}>
                        {connectedApps.map((app) => {
                            const isRevoking = revokingIds.includes(app.id);
                            const OriginIcon = ORIGIN_ICONS[app.origin];
                            return (
                                <motion.li
                                    key={app.id}
                                    initial={{ opacity: 0, x: rowOffsetIn }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: rowOffsetOut }}
                                    transition={rowTransition}
                                    className="flex items-center gap-3 px-4 py-3"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-text-secondary">
                                        <Bot className="w-5 h-5" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-primary">
                                            {app.clientName}
                                            <span className="inline-flex items-center gap-1 text-xs font-normal text-text-secondary">
                                                <OriginIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                                {t(`mcpConnector.connectedApps.origin${app.origin.charAt(0).toUpperCase()}${app.origin.slice(1)}`)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-text-muted">
                                            {t('mcpConnector.connectedApps.connectedOn', { date: formatDate(app.createdAt) })}
                                        </div>
                                        <div className="text-xs text-text-muted">
                                            {app.lastUsedAt
                                                ? t('mcpConnector.connectedApps.lastUsedOn', { date: formatDate(app.lastUsedAt) })
                                                : t('mcpConnector.connectedApps.neverUsedYet')}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleRevoke(app.id)}
                                        variant="secondary"
                                        size="sm"
                                        disabled={isRevoking}
                                        loading={isRevoking}
                                        className="text-error-fg border-error-fg hover:bg-error-bg flex items-center gap-2"
                                        aria-label={`${t('mcpConnector.connectedApps.revoke')} ${app.clientName}`}
                                    >
                                        {!isRevoking && <ShieldOff className="w-4 h-4" aria-hidden="true" />}
                                        {isRevoking ? t('mcpConnector.connectedApps.revoking') : t('mcpConnector.connectedApps.revoke')}
                                    </Button>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            )}
        </Card>
    );
};

export default ConnectedAppsCard;
