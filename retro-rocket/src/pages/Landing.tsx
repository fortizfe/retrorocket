import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    Shield, Users, MessageSquare, Vote, Group, FileText,
    Palette, Smartphone, Zap, Github, Play, ArrowRight,
    Download, CheckCircle, Brain, Gauge, Lightbulb
} from 'lucide-react';
import { useUser } from '@/lib/contexts/useUserContext';
import { useLanguage } from '@/lib/hooks/useLanguage';
import UserProfileForm from '@/features/auth/components/UserProfileForm';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import ThemeToggle from '@/lib/components/ui/ThemeToggle';
import { AuthProviderType } from '@/features/auth/types/user';
import { APP_NAME } from '@/lib/utils/constants';
import LandingHero from '@/features/landing/components/LandingHero';
import LandingSection from '@/features/landing/components/LandingSection';
import SectionBackground, { SectionTone } from '@/features/landing/components/SectionBackground';
import { LANDING_SECTIONS } from '@/features/landing/data/sections';
import { getMediaAsset } from '@/features/landing/data/mediaAssets';

// Alternates between exactly two tones by section order (1st, 2nd, 1st,
// 2nd, ...) rather than a distinct color per section, per resolved feedback.
const TONE_CYCLE: SectionTone[] = ['blue', 'emerald'];
function toneForSection(order: number): SectionTone {
    return TONE_CYCLE[order % TONE_CYCLE.length];
}

const LandingPage: React.FC = () => {
    const { signInWithGoogle, signInWithGithub, loading, user, userProfile, updateDisplayName } = useUser();
    const { t } = useLanguage();
    const [showProfileForm, setShowProfileForm] = useState(false);

    // Surface backend auth failures returned as ?auth_error=<code> on the redirect back
    // (FR-008), then clean the URL so a refresh doesn't re-show the message.
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
        <div className="bg-surface text-text-primary transition-colors duration-300">
            {/* Theme Toggle - Fixed position (FR-008: retained through the redesign) */}
            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <LandingHero onProviderSignIn={handleProviderSignIn} loading={loading} />

            {LANDING_SECTIONS.map((section) => {
                const asset = section.mediaAssetKey ? getMediaAsset(section.mediaAssetKey) : undefined;
                const tone = toneForSection(section.order);

                if (section.key === 'capabilities') {
                    const items = [
                        { Icon: Shield, key: 'auth' },
                        { Icon: Users, key: 'realTimeCollab' },
                        { Icon: MessageSquare, key: 'cardSystem' },
                        { Icon: Group, key: 'smartGrouping' },
                        { Icon: FileText, key: 'export' },
                        { Icon: Palette, key: 'modernUI' },
                    ];
                    return (
                        <LandingSection
                            key={section.key}
                            config={section}
                            asset={asset}
                            mediaAlt={t('landing.capabilities.title')}
                            title={t('landing.capabilities.title')}
                            subtitle={t('landing.capabilities.subtitle')}
                            tone={tone}
                        >
                            <ul className="grid grid-cols-2 gap-3">
                                {items.map(({ Icon, key }) => (
                                    <li
                                        key={key}
                                        className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-raised p-3"
                                    >
                                        <Icon className="h-4 w-4 shrink-0 text-action" aria-hidden="true" />
                                        <span className="text-sm font-medium leading-tight">
                                            {t(`landing.capabilities.items.${key}.title`)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </LandingSection>
                    );
                }

                if (section.key === 'howItWorks') {
                    const steps = [
                        { step: 'step1', Icon: Play, meta: t('landing.howItWorks.step1.time') },
                        { step: 'step2', Icon: Vote, meta: t('landing.howItWorks.step2.tip') },
                        { step: 'step3', Icon: Download, meta: t('landing.howItWorks.step3.tip') },
                    ];
                    return (
                        <LandingSection
                            key={section.key}
                            config={section}
                            asset={asset}
                            mediaAlt={t('landing.howItWorks.title')}
                            title={t('landing.howItWorks.title')}
                            subtitle={t('landing.howItWorks.subtitle')}
                            tone={tone}
                        >
                            <ol className="space-y-4">
                                {steps.map(({ step, Icon, meta }, i) => (
                                    <li key={step} className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-action text-xs font-semibold text-text-inverse">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="font-semibold">{t(`landing.howItWorks.${step}.title`)}</p>
                                            <p className="text-sm text-text-secondary">
                                                {t(`landing.howItWorks.${step}.description`)}
                                            </p>
                                            <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                                <span>{meta}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </LandingSection>
                    );
                }

                if (section.key === 'sentiment') {
                    const items = [
                        { Icon: Brain, key: 'autoDetection' },
                        { Icon: Gauge, key: 'teamScore' },
                        { Icon: Lightbulb, key: 'insights' },
                    ];
                    return (
                        <LandingSection
                            key={section.key}
                            config={section}
                            asset={asset}
                            mediaAlt={t('landing.sentiment.title')}
                            title={t('landing.sentiment.title')}
                            subtitle={t('landing.sentiment.subtitle')}
                            tone={tone}
                        >
                            <div className="grid gap-6 sm:grid-cols-3">
                                {items.map(({ Icon, key }) => (
                                    <div key={key}>
                                        <Icon className="mx-auto mb-2 h-5 w-5 text-action" aria-hidden="true" />
                                        <p className="font-semibold text-text-primary">
                                            {t(`landing.sentiment.items.${key}.title`)}
                                        </p>
                                        <p className="text-sm text-text-secondary">
                                            {t(`landing.sentiment.items.${key}.description`)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </LandingSection>
                    );
                }

                if (section.key === 'technology') {
                    const techItems = [
                        { Icon: Zap, key: 'reactTypeScript' },
                        { Icon: Shield, key: 'firebase' },
                        { Icon: Palette, key: 'tailwind' },
                        { Icon: Smartphone, key: 'mobileFirst' },
                    ];
                    return (
                        <LandingSection
                            key={section.key}
                            config={section}
                            asset={asset}
                            mediaAlt={t('landing.technology.title')}
                            title={t('landing.technology.title')}
                            subtitle={t('landing.technology.subtitle')}
                            tone={tone}
                            mediaLayout="phone"
                        >
                            <div className="grid grid-cols-2 gap-6">
                                {techItems.map(({ Icon, key }) => (
                                    <div key={key}>
                                        <Icon className="mb-2 h-5 w-5 text-action" aria-hidden="true" />
                                        <p className="font-semibold text-text-primary">{t(`landing.technology.${key}`)}</p>
                                        <p className="text-sm text-text-secondary">{t(`landing.technology.${key}_desc`)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-success-bg px-4 py-2 text-success-fg">
                                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                                <span className="text-sm font-medium">{t('landing.technology.openSource')}</span>
                            </div>
                        </LandingSection>
                    );
                }

                // finalMessage — purely typographic closing section, centered.
                return (
                    <section
                        key={section.key}
                        className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden border-t border-border-default px-6 text-center"
                    >
                        <SectionBackground tone={tone} intensity={section.parallaxIntensity} />
                        <div className="mx-auto max-w-xl">
                            <h2 className="text-3xl font-bold tracking-[-0.01em] md:text-4xl">
                                {t('landing.finalMessage.title')}
                            </h2>
                            <p className="mt-4 text-lg text-text-secondary">{t('landing.finalMessage.subtitle')}</p>
                            <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-text-muted">
                                <Github className="h-4 w-4" aria-hidden="true" />
                                <span>{t('landing.finalMessage.githubLink')}</span>
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </div>
                        </div>
                    </section>
                );
            })}

            {/* Closing footer strip — not a Landing Section, per FR-002's footer exception. */}
            <div className="border-t border-border-default/40 bg-surface-raised/10">
                <div className="mx-auto max-w-6xl px-6 py-8 text-center text-text-secondary">
                    <p className="text-sm">{t('landing.footer.copyright', { appName: APP_NAME })}</p>
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
