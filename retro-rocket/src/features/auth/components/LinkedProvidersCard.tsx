import React, { useState } from 'react';
import { Shield, Check, Plus, Github } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLinkedProviders, getProviderDisplayName } from '@/features/auth/hooks/useLinkedProviders';
import { startLinkProvider, type BackendProvider } from '@/features/auth/services/backendAuthClient';
import { AuthProviderType } from '@/features/auth/types/user';
import Button from '@/lib/components/ui/Button';
import Card from '@/lib/components/ui/Card';
import Loading from '@/lib/components/ui/Loading';

interface LinkedProvidersCardProps {
    className?: string;
}

const GoogleGlyph: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

interface ProviderDef {
    id: AuthProviderType;
    name: string;
    icon: React.ReactNode;
    /** Whether linking this provider is actually supported today (FR-005). Apple is a
     *  real, listed provider that is deliberately not-yet-linkable — data-model.md's
     *  `Linked Provider Row` requires it be shown, not silently omitted. */
    available: boolean;
}

const PROVIDER_DEFS: ProviderDef[] = [
    { id: 'google', name: 'Google', icon: <GoogleGlyph />, available: true },
    { id: 'github', name: 'GitHub', icon: <Github className="w-5 h-5" aria-hidden="true" />, available: true },
    { id: 'apple', name: 'Apple', icon: <span aria-hidden="true" className="text-lg leading-none">🍎</span>, available: false },
];

/**
 * Linked sign-in providers section (spec 050-profile-redesign, tasks.md T029), rebuilt
 * per the selected "Structured Account Pane" direction
 * (`ProfileDirectionB.tsx`'s `ProviderRow` — uniform Settings-row vocabulary: leading
 * icon, primary/secondary text, trailing action; every state spelled out in visible
 * text, never color-only).
 *
 * Closes a real pre-existing gap (tasks.md T024/T005, data-model.md's `Linked Provider
 * Row`): Apple is now always rendered as its own row in an explicit `not-yet-available`
 * state (native `disabled` + a persistently visible status caption + `aria-describedby`
 * pointing to it — the same FR-007 pattern `Profile.tsx`'s account-action placeholders
 * use), instead of being entirely absent from the UI. All copy is now sourced through
 * i18next (`linkedProviders.*`) — the pre-rebuild component hardcoded this section's
 * copy in Spanish outside the translation system entirely (FR-011).
 *
 * No per-row entrance motion here (unlike `ConnectedAppsCard`, which needs
 * `AnimatePresence` for its revoke-exit transition): `ProfileDirectionB.tsx`'s
 * `ProviderRow` reference doesn't animate this list's rows either — three static rows
 * on every page load has no "state change to make legible" or "jarring teleport to
 * bridge" purpose to name (the `animate` skill's gate, tasks.md T032), so per that
 * skill's own philosophy the correct call is not to animate it at all. The
 * provider-linking-in-progress indicator (T032) is instead a `loading`/`disabled` state
 * on the specific row's own "Link" button while `startLinkProvider()`'s full-page
 * redirect is pending — reusing `Button`'s existing loading affordance rather than any
 * bespoke motion.
 */
const LinkedProvidersCard: React.FC<LinkedProvidersCardProps> = ({ className = '' }) => {
    const { t } = useTranslation();
    const { linkedProviders, isLoading, error, refreshLinkedProviders } = useLinkedProviders();
    const [linkingProviderId, setLinkingProviderId] = useState<AuthProviderType | null>(null);

    const handleLinkProvider = (providerType: AuthProviderType): void => {
        // T032 (animate skill): startLinkProvider() is a synchronous window.location.assign
        // full-page redirect — there's no async network round-trip in JS to await, but a
        // perceptible gap can exist between the click and the browser actually unloading
        // this page (redirect-target latency). Setting the loading state before navigating
        // gives the click visible feedback for that gap instead of leaving the button inert.
        setLinkingProviderId(providerType);
        startLinkProvider(providerType as BackendProvider, window.location.pathname);
    };

    const isProviderLinked = (providerType: AuthProviderType): boolean =>
        linkedProviders.includes(`${providerType}.com`);

    if (error) {
        return (
            <Card className={`p-6 ${className}`}>
                <div className="text-center">
                    <Shield className="w-8 h-8 text-error-fg mx-auto mb-2" aria-hidden="true" />
                    <p className="text-error-fg text-sm">{error}</p>
                    <Button onClick={refreshLinkedProviders} variant="secondary" size="sm" className="mt-2">
                        {t('common.retry')}
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className={`p-6 ${className}`}>
            <div className="flex items-center gap-3 mb-1">
                <Shield className="w-5 h-5 text-info-fg" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-text-primary">{t('linkedProviders.heading')}</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">{t('linkedProviders.description')}</p>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loading size="sm" />
                </div>
            ) : (
                <ul className="divide-y divide-border-default rounded-lg border border-border-default">
                    {PROVIDER_DEFS.map((provider) => {
                        const linked = isProviderLinked(provider.id);
                        const isLinking = linkingProviderId === provider.id;
                        const statusId = `linked-provider-${provider.id}-status`;

                        return (
                            <li key={provider.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface">
                                    {provider.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-text-primary">
                                        {linked ? getProviderDisplayName(`${provider.id}.com`) : provider.name}
                                    </p>
                                    <p id={statusId} className="text-xs text-text-secondary">
                                        {linked
                                            ? t('linkedProviders.statusLinked')
                                            : provider.available
                                                ? t('linkedProviders.statusNotLinked')
                                                : t('linkedProviders.statusNotAvailable')}
                                    </p>
                                </div>
                                {linked && (
                                    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-success-fg">
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                        {t('linkedProviders.statusLinked')}
                                    </span>
                                )}
                                {!linked && provider.available && (
                                    <Button
                                        type="button"
                                        onClick={() => handleLinkProvider(provider.id)}
                                        variant="secondary"
                                        size="sm"
                                        loading={isLinking}
                                        className="flex shrink-0 items-center gap-1.5"
                                    >
                                        {!isLinking && <Plus className="h-4 w-4" aria-hidden="true" />}
                                        {t('linkedProviders.linkAction')}
                                    </Button>
                                )}
                                {!linked && !provider.available && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled
                                        aria-describedby={statusId}
                                        className="shrink-0"
                                    >
                                        {t('linkedProviders.linkAction')}
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
};

export default LinkedProvidersCard;
