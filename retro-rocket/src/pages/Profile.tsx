import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, LogOut, AlertTriangle, Download, Trash2, type LucideIcon } from 'lucide-react';
import { useUser } from '@/lib/contexts/useUserContext';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import UserProfileForm from '@/features/auth/components/UserProfileForm';
import LinkedProvidersCard from '@/features/auth/components/LinkedProvidersCard';
import ConnectedAppsCard from '@/features/auth/components/ConnectedAppsCard';
import Button from '@/lib/components/ui/Button';
import Loading from '@/lib/components/ui/Loading';

/**
 * Strong ease-out used for every quiet, "preventing a jarring change" mount-time fade
 * on this page (spec 050, tasks.md T017) — matches `ProfileDirectionB.tsx`'s
 * (the selected direction's build reference) already-decided `EASE_OUT` curve exactly.
 * Reused verbatim (not re-derived) for the page header, the Access & Security section,
 * the Edit Profile Form column, and Account Actions (T028/T029/T030/T031): each is the
 * same class of moment T017 already ran through the `animate` skill for, so per that
 * skill's own "extend the codebase's tokens, don't fork them" rule, this is an
 * application of an existing decision, not a new one.
 */
const ENTRANCE_EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

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

interface ProfileAvatarProps {
    photoURL: string | null;
    displayName: string;
    alt: string;
}

/**
 * Avatar with an initials fallback when no `photoURL` is available (FR-002 —
 * previously `Profile.tsx` rendered nothing at all in that case). Modeled on
 * `ProfileDirectionB.tsx`'s `Avatar` component.
 */
const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ photoURL, displayName, alt }) => {
    if (photoURL) {
        return (
            <img
                src={photoURL}
                alt={alt}
                className="h-20 w-20 shrink-0 rounded-full border-4 border-border-default object-cover shadow-soft sm:h-24 sm:w-24"
            />
        );
    }
    const initials = displayName.trim().slice(0, 1).toUpperCase() || '?';
    return (
        <div
            role="img"
            aria-label={alt}
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-border-default bg-surface text-2xl font-semibold text-text-secondary shadow-soft sm:h-24 sm:w-24"
        >
            {initials}
        </div>
    );
};

interface ActionPlaceholderRowProps {
    icon: LucideIcon;
    title: string;
    description: string;
    unavailableLabel: string;
    idPrefix: string;
    tone?: 'default' | 'danger';
}

/**
 * One "Exportar mis datos"/"Eliminar cuenta" placeholder row (spec 050, tasks.md T031,
 * data-model.md's `Account Action Placeholder`, FR-007's accessibility fix). Modeled on
 * `ProfileDirectionB.tsx`'s `ActionPlaceholderRow` (the build reference).
 *
 * Fixes the real gap `Profile.test.tsx` (T026) found in the pre-rebuild version: the
 * button kept its native `disabled` attribute (already correct) but had no
 * `aria-describedby` at all, and its own accessible name *was* the "coming soon" copy —
 * losing the actual action's name for assistive technology. Now the button's own name
 * is the real action (`title`, e.g. "Export Data"), and a separate, persistently
 * visible `<span>` (not a `title` tooltip, which isn't reliably exposed to touch/AT
 * users) carries the "not yet available" status, associated via `aria-describedby` so
 * screen readers announce both together.
 */
const ActionPlaceholderRow: React.FC<ActionPlaceholderRowProps> = ({
    icon: Icon,
    title,
    description,
    unavailableLabel,
    idPrefix,
    tone = 'default',
}) => {
    const labelId = `${idPrefix}-unavailable-label`;
    return (
        <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone === 'danger' ? 'bg-error-bg text-error-fg' : 'bg-surface text-text-secondary'
                        }`}
                >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className={`text-sm font-semibold ${tone === 'danger' ? 'text-error-fg' : 'text-text-primary'}`}>{title}</p>
                    <p className={`text-xs ${tone === 'danger' ? 'text-error-fg' : 'text-text-secondary'}`}>{description}</p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <span id={labelId} className="rounded-full border border-border-default px-2 py-0.5 text-xs font-medium text-text-muted">
                    {unavailableLabel}
                </span>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled
                    aria-describedby={labelId}
                    className={tone === 'danger' ? 'border-error-fg text-error-fg' : undefined}
                >
                    {title}
                </Button>
            </div>
        </li>
    );
};

const ProfilePage: React.FC = () => {
    const { userProfile, updateDisplayName, signOut, error, refreshUserProfile } = useUser();
    const { t, currentLanguage } = useLanguage();
    const reducedMotion = useReducedMotion();
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleSignOut = async () => {
        // FR-004: error feedback on failure is unchanged from before this rebuild —
        // UserContext.signOut() already fires a toast.error() itself on failure
        // (research.md §5: no production change needed to that pre-existing catch), so
        // this local catch only needs to keep the UI from getting stuck (clear the
        // loading state) and log for diagnostics, not duplicate the visible error.
        setIsSigningOut(true);
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            setIsSigningOut(false);
        }
    };

    // Fixed (spec 050, tasks.md T015): previously hardcoded to 'es-ES' regardless of
    // the active UI language. Now follows the active i18next language, consistent
    // with FR-011 and every other date formatter added since (e.g. ConnectedAppsCard).
    const formatDate = (date: Date) =>
        new Intl.DateTimeFormat(currentLanguage, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);

    // Profile View State (spec 050, data-model.md; FR-010): `loading` while the
    // profile fetch is still in flight, `error` if it failed, `loaded` (the render
    // below) otherwise. Neither state existed before this rebuild — a missing
    // profile previously fell through to the full page shell with blank fields.
    if (!userProfile) {
        if (error) {
            return (
                <div className="flex min-h-screen items-center justify-center px-4">
                    <div
                        role="alert"
                        className="w-full max-w-md rounded-xl border border-error-fg/30 bg-error-bg px-6 py-10 text-center"
                    >
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
                            <AlertTriangle className="h-7 w-7 text-error-fg" aria-hidden="true" />
                        </div>
                        <h2 className="text-lg font-semibold text-error-fg">{t('profile.error.title')}</h2>
                        <p className="mt-1 text-sm text-error-fg">{t('profile.error.loadMessage')}</p>
                        <Button variant="outline" className="mt-6" onClick={() => void refreshUserProfile()}>
                            {t('common.retry')}
                        </Button>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loading text={t('common.loading')} />
            </div>
        );
    }

    return (
        // data-testid (not a semantic <main> — Layout.tsx already renders one around every
        // routed page): scopes E2E queries to this page's own content, away from the app
        // Header's same-name-text user-menu span (`hidden md:block` below `md`, which a
        // bare page-wide getByText(...).first() would otherwise match first in DOM order).
        <div className="min-h-screen" data-testid="profile-content">
            <div className="container mx-auto px-2 py-8">
                {/* Header (spec 050 T028): no longer carries the Sign Out control — that's
                    now a proper Access & Security row below, matching the selected
                    direction's Settings-row vocabulary instead of a header-level button. */}
                <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: ENTRANCE_EASE }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                        <User className="w-8 h-8 text-info-fg" />
                        {t('profile.title')}
                    </h1>
                    <p className="text-text-secondary mt-2">
                        {t('profile.subtitle')}
                    </p>
                </motion.div>

                {/* `grid-cols-1` (not just the bare `grid` the pre-rebuild markup had) is
                    required, not cosmetic: without an explicit base track count, a CSS grid
                    container's implicit single column sizes to its widest child's
                    max-content width instead of `minmax(0, 1fr)`, letting long untranslated
                    content (e.g. "Métodos de inicio de sesión") force the whole grid wider
                    than the viewport below `lg` — the real cause of a horizontal-overflow
                    regression the T035 responsive E2E check caught on a 375px viewport. */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Info */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Identity panel (spec 050 T014/T015): avatar with fallback, display
                            name, primary-provider + member-since caption, read-only email row —
                            rebuilt per the selected "Structured Account Pane" direction
                            (ProfileDirectionB.tsx's Identity section is the build reference).
                            Entrance motion decided via the `animate` skill (T017): a single quiet
                            opacity+8px fade, 0.24s, strong ease-out, fully skipped under
                            `useReducedMotion()` — reused verbatim from the selected direction's
                            own already-approved decision for this exact kind of moment. */}
                        <motion.div
                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: ENTRANCE_EASE }}
                            className="rounded-xl border border-border-default bg-surface-raised p-6 glass"
                        >
                            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                                <ProfileAvatar
                                    photoURL={userProfile.photoURL}
                                    displayName={userProfile.displayName}
                                    alt={t('profile.identity.avatarAlt', { name: userProfile.displayName })}
                                />
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-xl font-semibold text-text-primary">
                                        {userProfile.displayName}
                                    </h2>
                                    <p className="mt-1 text-sm text-text-secondary">
                                        {t('profile.primaryProvider')}:{' '}
                                        <span className="font-medium text-text-primary">
                                            {getProviderName(userProfile.primaryProvider)}
                                        </span>
                                        <span className="mx-1.5 text-text-muted" aria-hidden="true">
                                            ·
                                        </span>
                                        {t('profile.memberSince')}{' '}
                                        <span className="font-medium text-text-primary">
                                            {formatDate(userProfile.createdAt)}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3 rounded-lg border border-border-default bg-surface px-4 py-3">
                                <Mail className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="text-xs font-medium text-text-muted">{t('auth.userProfileForm.email')}</p>
                                    <p className="truncate text-sm font-semibold text-text-primary">{userProfile.email}</p>
                                </div>
                                <span className="shrink-0 rounded-full border border-border-default px-2 py-0.5 text-xs font-medium text-text-muted">
                                    {t('auth.userProfileForm.emailNotEditable')}
                                </span>
                            </div>
                        </motion.div>

                        {/* Access & Security (spec 050 T028/T029/T030): sign-out, linked
                            providers, and connected AI assistants, grouped under one explicit
                            heading — the selected direction's "clarity-forward" Settings-pane
                            organization (ProfileDirectionB.tsx's AccessSecuritySection is the
                            build reference). Sign-out is now its own Settings-row (leading icon,
                            primary/secondary text, trailing action with a loading indicator)
                            instead of a header-level button; LinkedProvidersCard/ConnectedAppsCard
                            keep their own bordered cards below it. */}
                        <motion.div
                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: ENTRANCE_EASE }}
                            className="space-y-6"
                        >
                            <section
                                aria-labelledby="profile-access-security-heading"
                                className="rounded-xl border border-border-default bg-surface-raised p-6 glass"
                            >
                                <h3 id="profile-access-security-heading" className="text-lg font-semibold text-text-primary mb-1">
                                    {t('profile.accessSecurity.heading')}
                                </h3>
                                <p className="text-sm text-text-secondary mb-4">{t('profile.accessSecurity.description')}</p>
                                <ul className="divide-y divide-border-default rounded-lg border border-border-default">
                                    <li className="flex items-center gap-3 px-4 py-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-bg text-error-fg">
                                            <LogOut className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-text-primary">{t('profile.signOut')}</p>
                                            <p className="text-xs text-text-secondary">{t('profile.accessSecurity.signOutDescription')}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleSignOut}
                                            variant="secondary"
                                            size="sm"
                                            loading={isSigningOut}
                                            className="shrink-0 border-error-fg text-error-fg hover:bg-error-bg"
                                        >
                                            {t('profile.signOut')}
                                        </Button>
                                    </li>
                                </ul>
                            </section>

                            <LinkedProvidersCard className="glass border border-border-default/50" />
                            <ConnectedAppsCard className="glass border border-border-default/50" />
                        </motion.div>
                    </div>

                    {/* Edit Profile Form */}
                    <motion.div
                        initial={reducedMotion ? false : { opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: ENTRANCE_EASE }}
                        className="lg:col-span-2"
                    >
                        <UserProfileForm
                            userProfile={userProfile}
                            onSave={updateDisplayName}
                            isFirstTime={false}
                            className="glass border border-border-default/50"
                        />
                    </motion.div>
                </div>

                {/* Account Actions (spec 050 T031): "Exportar mis datos"/"Eliminar cuenta"
                    disabled placeholders, rebuilt as ActionPlaceholderRow (FR-007's
                    accessibility fix — see that component's own doc comment). */}
                <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: ENTRANCE_EASE, delay: 0.06 }}
                    className="mt-8"
                >
                    <section
                        aria-labelledby="profile-account-actions-heading"
                        className="rounded-xl border border-border-default bg-surface-raised p-6 glass"
                    >
                        <h3 id="profile-account-actions-heading" className="text-lg font-semibold text-text-primary mb-4">
                            {t('profile.accountActions.title')}
                        </h3>
                        <ul className="divide-y divide-border-default rounded-lg border border-border-default">
                            <ActionPlaceholderRow
                                icon={Download}
                                title={t('profile.accountActions.exportData.title')}
                                description={t('profile.accountActions.exportData.description')}
                                unavailableLabel={t('profile.accountActions.notAvailableLabel')}
                                idPrefix="profile-export-data"
                            />
                            <ActionPlaceholderRow
                                icon={Trash2}
                                title={t('profile.accountActions.deleteAccount.title')}
                                description={t('profile.accountActions.deleteAccount.description')}
                                unavailableLabel={t('profile.accountActions.notAvailableLabel')}
                                idPrefix="profile-delete-account"
                                tone="danger"
                            />
                        </ul>
                    </section>
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
