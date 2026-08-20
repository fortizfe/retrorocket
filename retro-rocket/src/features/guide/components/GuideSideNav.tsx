import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronDown, Menu } from 'lucide-react';
import { guideCategories, guideTopics } from '@/features/guide/content/topics';

export interface GuideSideNavProps {
    /** GuideTopic.id of the currently open topic, or undefined for "no
     * topic active" (overview). */
    activeTopicId?: string;
}

/** Matches Tailwind's `md` breakpoint, and `GuidePage.tsx`'s
 * `md:grid-cols-[240px_1fr]` two-column layout. */
const DESKTOP_BREAKPOINT = 768;

const isDesktopViewport = () =>
    typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT;

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T025 (Phase 4: User
 * Story 2), per research.md Decision 3: a plain `<nav>` landmark of
 * category-grouped `<Link>`s marked `aria-current="page"` on the active
 * topic — NOT a WAI-ARIA `tablist` pattern, since guide topics are
 * independently URL-addressable (FR-005) and the tabs pattern is reserved
 * for same-page, non-navigable panel switching per the WAI-ARIA APG.
 *
 * Deliberately presentational/"dumb": it reads the full registry itself
 * (`guideCategories`/`guideTopics`) but the *active* topic is passed in as a
 * prop rather than calling `useActiveGuideTopic()` itself — `GuidePage.tsx`
 * (T027) is the single call site of that hook and passes the resolved id
 * down to both this component and `GuideTopicContent`.
 *
 * Native `<Link>`s are fully keyboard-operable with no custom key handling
 * needed (Principle VIII), and `aria-current="page"` pairs the active state
 * with a semantic attribute rather than color alone.
 *
 * --- Mobile collapse (tasks.md T036/T038/T039/T040, Phase 6: User Story 4,
 * FR-008, Constitution Principle IX) ---
 *
 * DESIGN DECISION (T038, via the `apple-design`/`emil-design-eng` skills):
 * this panel is an in-page ACCORDION/DISCLOSURE that pushes the page's own
 * content down when open and collapses out of the accessibility tree
 * (`aria-hidden`) when closed — NOT a modal/overlay takeover like
 * `FacilitatorMenu.tsx`'s `BottomSheet`. Reasoning: `BottomSheet` exists for
 * *transient action* menus (facilitator controls) that legitimately want a
 * scrim and focus-trap because they interrupt the user's current task. This
 * panel is primary WAYFINDING content — every topic is independently
 * deep-linkable (FR-005), and the guide's own overview content must be
 * immediately visible on load without the user opening the nav first (the
 * QA-authored e2e spec asserts the `<h1>` is visible before any toggle
 * interaction). A modal takeover would (a) hide that overview behind a
 * scrim on first paint, contradicting Apple HIG's "deference" (chrome
 * shouldn't compete with or block content) and "wayfinding" (never trap the
 * user — a modal is one more state to escape from just to read the page),
 * and (b) misrepresent navigation as a one-off action. An inline disclosure
 * keeps the panel in normal document flow, stays consistent with the
 * always-visible desktop nav (same component, same DOM shape, just
 * collapsed), and matches "familiarity" — this is the same
 * `window.innerWidth` + resize-listener shape already used by
 * `ResponsiveParticipantDisplay.tsx` for JS-driven responsive state.
 *
 * MOTION DECISION (T039, via the `animate` skill): the toggle is an
 * "occasional" action (opened at most a few times per guide visit, not a
 * high-frequency control), and its purpose is STATE INDICATION + preventing
 * a jarring teleport of content sliding under/over the toggle. `height` is
 * normally off-limits (it's not GPU-composited like `transform`/`opacity`)
 * but is the one tolerated exception for accordions, where there's no
 * transform equivalent that reflows sibling content correctly. Duration
 * 250ms sits in the "dropdowns/small panels" band (150-250ms) and stays
 * under the 300ms UI ceiling; `ease-out` (a strong custom curve, not the
 * built-in CSS one) is used for both expand and collapse so the panel
 * exits along the same path it entered (spatial consistency) rather than
 * decelerating on the way in and accelerating on the way out. A spring was
 * considered and rejected: nothing here is gesture/drag-driven or carries
 * release velocity (the two conditions the `animate` skill reserves springs
 * for), so a spring would add unpredictability with no benefit. Framer
 * Motion's `animate` prop retargets from the live value rather than
 * restarting from zero, so rapid repeated clicks stay smooth. Reduced
 * motion is handled for free by `App.tsx`'s `<MotionConfig
 * reducedMotion="user">` wrapper. The chevron's rotation is a separate,
 * cheap CSS `transition-transform` (a state toggle driven by a class, the
 * correct tool per the `animate` skill's tool-selection table) rather than
 * another Framer Motion animation.
 */
const GuideSideNav: React.FC<GuideSideNavProps> = ({ activeTopicId }) => {
    const { t } = useTranslation();

    // Lazy initializer reads window.innerWidth once on mount (same pattern
    // as ResponsiveParticipantDisplay.tsx): starts collapsed below the `md`
    // breakpoint, expanded at/above it.
    const [isOpen, setIsOpen] = useState(isDesktopViewport);
    const wasDesktopRef = useRef(isDesktopViewport());

    useEffect(() => {
        const handleResize = () => {
            const desktop = isDesktopViewport();
            // Only force the open/closed state when crossing the
            // mobile/desktop boundary, so resizing within the same tier
            // never clobbers a manual toggle the user already made.
            if (desktop !== wasDesktopRef.current) {
                wasDesktopRef.current = desktop;
                setIsOpen(desktop);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const sortedCategories = [...guideCategories].sort((a, b) => a.order - b.order);

    // T040 (FR-008 Acceptance Scenario US4.2): selecting a topic on a
    // narrow/mobile viewport collapses the panel again so the topic's
    // content is fully visible. Desktop keeps the nav always visible, so
    // this is a no-op there.
    const handleTopicSelect = () => {
        if (!isDesktopViewport()) {
            setIsOpen(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-controls="guide-side-nav-panel"
                className="mb-4 inline-flex items-center gap-2 rounded-md border border-border-default bg-surface-raised px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:hidden"
            >
                <Menu className="h-4 w-4" aria-hidden="true" />
                {t('guide.navigation.toggleLabel')}
                <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            <div id="guide-side-nav-panel" aria-hidden={!isOpen} style={{ overflow: 'hidden' }}>
                <motion.div
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                >
                    <nav aria-label={t('guide.navigation.topicsLabel')} className="space-y-6 pt-1 md:pt-0">
                        {sortedCategories.map((category) => {
                            const topicsInCategory = guideTopics
                                .filter((topic) => topic.categoryId === category.id)
                                .sort((a, b) => a.order - b.order);

                            if (topicsInCategory.length === 0) {
                                return null;
                            }

                            return (
                                <div key={category.id}>
                                    <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                        {t(category.labelKey)}
                                    </h2>
                                    <ul className="mt-2 space-y-1">
                                        {topicsInCategory.map((topic) => {
                                            const isActive = topic.id === activeTopicId;

                                            return (
                                                <li key={topic.id}>
                                                    <Link
                                                        to={`/guide/${topic.id}`}
                                                        aria-current={isActive ? 'page' : undefined}
                                                        onClick={handleTopicSelect}
                                                        className={`block rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                                                            isActive
                                                                ? 'bg-surface-raised font-semibold text-text-primary'
                                                                : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                                                        }`}
                                                    >
                                                        {t(topic.titleKey)}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })}
                    </nav>
                </motion.div>
            </div>
        </div>
    );
};

export default GuideSideNav;
