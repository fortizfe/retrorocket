import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Rocket, Users, Zap, Shield,
    MessageSquare, Vote, Group, FileText,
    Palette, Smartphone, Github,
    Play, ArrowRight,
    Download, CheckCircle
} from 'lucide-react';
import { useUser } from '@/lib/contexts/useUserContext';
import { useLanguage } from '@/lib/hooks/useLanguage';
import AuthButtonGroup from '@/features/auth/components/AuthButtonGroup';
import UserProfileForm from '@/features/auth/components/UserProfileForm';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import ThemeToggle from '@/lib/components/ui/ThemeToggle';
import { AuthProviderType } from '@/features/auth/types/user';
import { APP_NAME } from '@/lib/utils/constants';

const LandingPage: React.FC = () => {
    const { signInWithGoogle, signInWithGithub, loading, user, userProfile, updateDisplayName } = useUser();
    const { t } = useLanguage();
    const [showProfileForm, setShowProfileForm] = useState(false);

    // Surface backend auth failures returned as ?auth_error=<code> on the redirect back
    // (FR-015), then clean the URL so a refresh doesn't re-show the message.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('auth_error');
        if (!code) return;
        const known = ['invalid_oauth_state', 'email_not_verified', 'access_denied', 'unauthenticated', 'auth_failed'];
        const key = known.includes(code) ? code : 'generic';
        toast.error(t(`auth.errors.${key}`), { duration: 6000, style: { maxWidth: '420px' } });
        params.delete('auth_error');
        const query = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }, [t]);

    const handleProviderSignIn = async (providerId: AuthProviderType) => {
        try {
            // A user arriving via the MCP connector's "needs_login" redirect
            // (GET /api/mcp/authorize -> server/src/http/routes/mcp.ts) carries the
            // original authorize URL as ?returnTo=... — thread it through so login lands
            // back there instead of defaulting to '/', which otherwise silently drops the
            // user before they ever see the consent screen (024 follow-up).
            const returnTo = new URLSearchParams(window.location.search).get('returnTo') ?? undefined;
            switch (providerId) {
                case 'google':
                    await signInWithGoogle(returnTo);
                    break;
                case 'github':
                    await signInWithGithub(returnTo);
                    break;
                default:
                    console.warn(`Provider ${providerId} not yet implemented`);
                    return;
            }
            // If this is first time (no displayName or default one), show profile form
            setShowProfileForm(true);
        } catch (error) {
            console.error(`Sign in with ${providerId} error:`, error);
        }
    };

    const handleProfileSave = async (displayName: string) => {
        await updateDisplayName(displayName);
        setShowProfileForm(false);
        // Navigate to dashboard will be handled by AuthWrapper
    };

    if (showProfileForm && user && userProfile) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center p-4 transition-colors duration-300">
                <div className="fixed top-6 right-6 z-50">
                    <ThemeToggle />
                </div>
                <div className="max-w-md w-full">
                    <UserProfileForm
                        userProfile={userProfile}
                        onSave={handleProfileSave}
                        isFirstTime={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface text-text-primary transition-colors duration-300">
            {/* Theme Toggle - Fixed position (FR-002: retained through the redesign) */}
            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <header className="mx-auto flex max-w-6xl items-center gap-2 px-6 pt-8">
                <Rocket className="h-5 w-5 text-action" aria-hidden="true" />
                <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
            </header>

            {/* Hero — Direction B (Editorial Grid), selected 2026-08-08. `hero-fade`
                loading pattern: plain mount-time opacity fade, not whileInView (the hero
                is always in the initial viewport), no skeleton/blank hold (FR-011). */}
            <main className="mx-auto grid min-h-[85vh] max-w-6xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-12">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="lg:col-span-7"
                >
                    <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.02em] md:text-6xl">
                        {t('landing.hero.tagline')}
                    </h1>
                    <p className="mt-6 max-w-lg text-lg leading-relaxed text-text-secondary">
                        {t('landing.hero.description')}
                    </p>

                    <div className="mt-10 max-w-sm border-t border-border-default pt-6">
                        <h2 className="mb-1 text-base font-semibold">
                            {t('landing.hero.cta.title')}
                        </h2>
                        <p className="mb-4 text-sm text-text-secondary">
                            {t('landing.hero.cta.subtitle')}
                        </p>

                        <AuthButtonGroup
                            onProviderSignIn={handleProviderSignIn}
                            loading={loading}
                        />

                        <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
                            <CheckCircle className="h-4 w-4 text-success-fg" />
                            <span>{t('landing.hero.cta.freeForever')}</span>
                            <span aria-hidden="true">&middot;</span>
                            <CheckCircle className="h-4 w-4 text-success-fg" />
                            <span>{t('landing.hero.cta.noLimits')}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Hero capability preview — a quick-glance teaser of 4 of the 6
                    capabilities detailed in the section below (icon + short label
                    only, still no product screenshots/mockups, FR-001). Replaces
                    an earlier purely-decorative empty version: seen live, empty
                    color blocks read as unfinished rather than intentional. */}
                <motion.ul
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-2 gap-3 lg:col-span-5"
                >
                    {[
                        { Icon: Users, key: 'realTimeCollab' },
                        { Icon: MessageSquare, key: 'cardSystem' },
                        { Icon: Group, key: 'smartGrouping' },
                        { Icon: FileText, key: 'export' },
                    ].map(({ Icon, key }, i) => (
                        <motion.li
                            key={key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.24) }}
                            className={`flex aspect-square flex-col justify-between rounded-xl border border-border-default p-4 ${i === 0 ? 'bg-action text-text-inverse' : 'bg-surface text-text-primary'}`}
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                            <span className="text-sm font-semibold leading-tight">
                                {t(`landing.capabilities.items.${key}.title`)}
                            </span>
                        </motion.li>
                    ))}
                </motion.ul>
            </main>

            <div className="mx-auto max-w-6xl px-6">
                <div className="border-t border-border-default" />
            </div>

            {/* Capabilities — merges the former "quick features" + "main features"
                sections into one editorial grid (content-inventory-contract.md
                categories 2-3; i18n-key-migration-contract.md). */}
            <section className="border-t border-border-default">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-[-0.01em] md:text-4xl">
                            {t('landing.capabilities.title')}
                        </h2>
                        <p className="mt-4 text-lg text-text-secondary">
                            {t('landing.capabilities.subtitle')}
                        </p>
                    </div>

                    <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border-default bg-border-default sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            { Icon: Shield, key: 'auth' },
                            { Icon: Users, key: 'realTimeCollab' },
                            { Icon: MessageSquare, key: 'cardSystem' },
                            { Icon: Group, key: 'smartGrouping' },
                            { Icon: FileText, key: 'export' },
                            { Icon: Palette, key: 'modernUI' },
                        ].map(({ Icon, key }, i) => (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-100px' }}
                                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.25) }}
                                className="bg-surface p-6"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <Icon className="h-5 w-5 text-action" aria-hidden="true" />
                                    <span className="text-xs font-medium text-text-muted">{`0${i + 1}`}</span>
                                </div>
                                <h3 className="mb-1 font-semibold text-text-primary">
                                    {t(`landing.capabilities.items.${key}.title`)}
                                </h3>
                                <p className="text-sm text-text-secondary">
                                    {t(`landing.capabilities.items.${key}.description`)}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="border-t border-border-default">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-[-0.01em] md:text-4xl">
                            {t('landing.howItWorks.title')}
                        </h2>
                        <p className="mt-4 text-lg text-text-secondary">
                            {t('landing.howItWorks.subtitle')}
                        </p>
                    </div>

                    <div className="mt-12 grid gap-10 md:grid-cols-3">
                        {[
                            { step: 'step1', Icon: Play, meta: t('landing.howItWorks.step1.time') },
                            { step: 'step2', Icon: Vote, meta: t('landing.howItWorks.step2.tip') },
                            { step: 'step3', Icon: Download, meta: t('landing.howItWorks.step3.tip') },
                        ].map(({ step, Icon, meta }, i) => (
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-100px' }}
                                transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.24) }}
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-text-secondary">{`0${i + 1}`}</span>
                                    <ArrowRight className="h-3 w-3 text-action" aria-hidden="true" />
                                </div>
                                <h3 className="mb-2 text-lg font-semibold">{t(`landing.howItWorks.${step}.title`)}</h3>
                                <p className="text-sm text-text-secondary">{t(`landing.howItWorks.${step}.description`)}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>{meta}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust signals — technology stack, slim strip (not heavy cards) */}
            <section className="border-t border-border-default">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-[-0.01em] md:text-4xl">
                            {t('landing.technology.title')}
                        </h2>
                        <p className="mt-4 text-lg text-text-secondary">
                            {t('landing.technology.subtitle')}
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.4 }}
                        className="mt-10 grid gap-8 border-t border-border-default pt-8 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        {[
                            { Icon: Zap, key: 'reactTypeScript' },
                            { Icon: Shield, key: 'firebase' },
                            { Icon: Palette, key: 'tailwind' },
                            { Icon: Smartphone, key: 'mobileFirst' },
                        ].map(({ Icon, key }) => (
                            <div key={key}>
                                <Icon className="mb-2 h-5 w-5 text-action" aria-hidden="true" />
                                <h4 className="font-semibold text-text-primary">{t(`landing.technology.${key}`)}</h4>
                                <p className="text-sm text-text-secondary">{t(`landing.technology.${key}_desc`)}</p>
                            </div>
                        ))}
                    </motion.div>

                    <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-success-bg px-4 py-2 text-success-fg">
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        <span className="text-sm font-medium">{t('landing.technology.openSource')}</span>
                    </div>
                </div>
            </section>

            {/* Closing message + footer */}
            <section className="border-t border-border-default">
                <div className="mx-auto max-w-6xl px-6 py-16 text-center">
                    <h2 className="text-xl font-bold text-text-primary">
                        {t('landing.finalMessage.title')}
                    </h2>
                    <p className="mt-2 text-text-secondary">
                        {t('landing.finalMessage.subtitle')}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-xs text-text-muted">
                        <Github className="h-3 w-3" aria-hidden="true" />
                        <span>{t('landing.finalMessage.githubLink')}</span>
                    </div>
                </div>
            </section>

            <div className="border-t border-border-default/40 bg-surface-raised/10">
                <div className="mx-auto max-w-6xl px-6 py-8 text-center text-text-secondary">
                    <p className="text-sm">
                        {t('landing.footer.copyright', { appName: APP_NAME })}
                    </p>
                </div>
            </div>
        </div>
    );
};

const Landing: React.FC = () => {
    return (
        <AuthWrapper requireAuth={false}>
            <LandingPage />
        </AuthWrapper>
    );
};

export default Landing;
