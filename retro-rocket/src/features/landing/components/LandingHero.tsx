import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import AuthButtonGroup from '@/features/auth/components/AuthButtonGroup';
import { AuthProviderType } from '@/features/auth/types/user';

interface LandingHeroProps {
    onProviderSignIn: (providerId: AuthProviderType) => void;
    loading: boolean;
}

/**
 * Minimalist single-viewport hero (FR-001): one dominant visual (a large,
 * abstract gradient field — no product screenshot, keeping the hero
 * uncluttered per data-model.md's hero exclusion), minimal copy, and the
 * primary sign-in CTA. Built per the `apple-design`/`emil-design-eng`
 * skills (Constitution Principle IX) — restraint over density, a single
 * clear focal point, generous negative space.
 *
 * Animation decision (Constitution Principle IX, `animate` skill): purpose
 * is a calm entrance that reinforces "arrival," not attention-grabbing —
 * a single mount-time fade + small upward drift on `opacity`/`transform`
 * only (compositor-friendly), ~400ms, no stagger beyond the CTA panel
 * following slightly behind the headline. No interruption case (it never
 * re-runs after mount) and no exit (the hero doesn't unmount while visible).
 * MotionConfig at the app root already disables this under
 * prefers-reduced-motion (src/App.tsx).
 */
const LandingHero: React.FC<LandingHeroProps> = ({ onProviderSignIn, loading }) => {
    const { t } = useLanguage();

    return (
        <section
            data-testid="landing-hero"
            className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden px-6"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                    background: [
                        'radial-gradient(circle 420px at 50% 38%, rgb(var(--color-action) / 0.55), transparent 70%)',
                        'radial-gradient(ellipse 90% 60% at 50% 45%, rgb(var(--color-action) / 0.22), transparent 75%)',
                    ].join(', '),
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mx-auto max-w-2xl text-center"
            >
                <h1 className="text-5xl font-bold leading-[1.05] tracking-[-0.02em] md:text-7xl">
                    {t('landing.hero.tagline')}
                </h1>
                <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-text-secondary md:text-xl">
                    {t('landing.hero.description')}
                </p>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.12 }}
                    className="mx-auto mt-10 max-w-sm"
                >
                    <AuthButtonGroup onProviderSignIn={onProviderSignIn} loading={loading} />

                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-muted">
                        <CheckCircle className="h-4 w-4 text-success-fg" aria-hidden="true" />
                        <span>{t('landing.hero.cta.freeForever')}</span>
                        <span aria-hidden="true">&middot;</span>
                        <CheckCircle className="h-4 w-4 text-success-fg" aria-hidden="true" />
                        <span>{t('landing.hero.cta.noLimits')}</span>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default LandingHero;
