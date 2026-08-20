import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { AuthContext } from '@/lib/contexts/useUserContext';
import { useActiveGuideTopic } from '@/features/guide/hooks/useActiveGuideTopic';
import GuideSideNav from '@/features/guide/components/GuideSideNav';
import GuideTopicContent from '@/features/guide/components/GuideTopicContent';

/**
 * `/guide` page shell — spec-kit feature 057-getting-started-guide,
 * tasks.md T007 (Phase 2: Foundational), extended by T015/T016 (Phase 3:
 * User Story 1) and T027/T029 (Phase 4: User Story 2).
 *
 * The `<main role="main">` landmark (satisfying Principle VIII's landmark-
 * navigability expectation) is tagged `data-testid="guide-page-content"`
 * for stable querying by this and future guide tests, per
 * `src/test/features/guide/GuidePage.test.tsx`.
 *
 * Topic-aware rendering (T027, FR-003/FR-004/FR-005): `useActiveGuideTopic`
 * resolves the active topic from the `/guide/:topicSlug` route param.
 * `GuideSideNav` (passed the resolved `activeTopicId`) renders alongside
 * either `GuideTopicContent` for that topic, or — when the hook returns
 * `undefined`, both for the bare `/guide` route and for an unknown/mistyped
 * `:topicSlug` (spec.md Edge Case, T029) — the same `guide.overview.*`
 * welcome copy from User Story 1.
 *
 * Back affordance (T016, FR-011): links back to the landing page ("/") for
 * a signed-out visitor, or to "/mis-tableros" for a signed-in user —
 * mirroring the same `isAuthenticated` check Header.tsx already uses to
 * decide what a user can reach. Reads the raw `AuthContext` via
 * `useContext` (rather than the `useAuthContext()` hook, which throws
 * outside a `UserProvider`) because this page is intentionally reachable
 * without sign-in (FR-002) and must render correctly even when no
 * `UserProvider` ancestor is present — treating "no provider" the same as
 * "signed out" is the correct default here.
 */
const GuidePage: React.FC = () => {
    const { t } = useTranslation();
    const authContext = useContext(AuthContext);
    const isAuthenticated = authContext?.isAuthenticated ?? false;
    const activeTopic = useActiveGuideTopic();

    const backHref = isAuthenticated ? '/mis-tableros' : '/';
    const backLabel = isAuthenticated
        ? t('guide.navigation.backToApp')
        : t('guide.navigation.backToLanding');

    return (
        <div className="min-h-screen bg-surface text-text-primary transition-colors duration-300">
            <main role="main" data-testid="guide-page-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <Link
                    to={backHref}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {backLabel}
                </Link>

                <div className="mt-8 gap-8 md:grid md:grid-cols-[240px_1fr]">
                    <GuideSideNav activeTopicId={activeTopic?.id} />

                    <div className="mt-8 min-w-0 md:mt-0">
                        {activeTopic ? (
                            <GuideTopicContent topic={activeTopic} />
                        ) : (
                            <div className="max-w-2xl">
                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                                    {t('guide.overview.title')}
                                </h1>
                                <p className="mt-4 text-lg leading-relaxed text-text-secondary">
                                    {t('guide.overview.description')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GuidePage;
