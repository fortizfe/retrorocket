import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import GuideSideNav from '@/features/guide/components/GuideSideNav';
import { guideCategories, guideTopics } from '@/features/guide/content/topics';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T020 (Phase 4: User
 * Story 2 — TDD red step). `src/features/guide/components/GuideSideNav.tsx`
 * does not exist yet (T025 creates it, per research.md Decision 3 — a
 * `<nav>` landmark of grouped `<Link>`s using `aria-current="page"`, NOT a
 * WAI-ARIA `tablist`); this file is written first, per Constitution
 * Principle I (NON-NEGOTIABLE TDD).
 *
 * Expected failure right now: BOTH imports fail (`GuideSideNav` doesn't
 * exist, and neither does `topics.ts` until T022) — `Cannot find module
 * '@/features/guide/components/GuideSideNav'` is the first one Vitest will
 * report.
 *
 * ---
 *
 * CHOSEN, DOCUMENTED PROPS CONTRACT (T025's implementation MUST match
 * this):
 *
 *   interface GuideSideNavProps {
 *     activeTopicId?: string; // GuideTopic.id of the currently open topic,
 *                             // or undefined for "no topic active" (overview)
 *   }
 *
 * `GuideSideNav` is deliberately a "dumb"/presentational component: it
 * reads the full registry itself (`guideCategories`/`guideTopics` from
 * `src/features/guide/content/topics.ts`) and renders every topic, but the
 * *active* one is passed in as a prop rather than the component calling
 * `useActiveGuideTopic()` itself — per tasks.md T027 ("Wire GuideSideNav
 * and GuideTopicContent into GuidePage.tsx ... driven by
 * useActiveGuideTopic"), `GuidePage.tsx` is the single call site of that
 * hook and passes the resolved topic id down to both `GuideSideNav` and
 * `GuideTopicContent`. This keeps `GuideSideNav` testable without a
 * `/guide/:topicSlug` route context (a plain `<MemoryRouter>` is enough
 * here since only `<Link>`'s `to` prop needs router context, not
 * `useParams`).
 *
 * Structure asserted: one `<nav>` landmark; each category rendered with an
 * `<h2>`-or-similar heading whose text is `t(category.labelKey)` (under
 * this repo's global react-i18next mock — see src/test/setup.ts — `t`
 * returns the key itself, so heading text equals the labelKey string
 * verbatim); every topic rendered as a `<Link to={"/guide/" + topic.id}>`
 * whose accessible name is `t(topic.titleKey)`.
 */

const renderNav = (activeTopicId?: string) =>
    render(
        <MemoryRouter>
            <GuideSideNav activeTopicId={activeTopicId} />
        </MemoryRouter>
    );

describe('GuideSideNav (spec 057 research.md Decision 3, FR-003/FR-004)', () => {
    it('renders a single <nav> landmark', () => {
        renderNav();

        expect(screen.getAllByRole('navigation')).toHaveLength(1);
    });

    it('renders every topic from the registry, grouped under its category heading', () => {
        renderNav();

        const nav = screen.getByRole('navigation');

        // Every category label appears as heading text within the nav.
        for (const category of guideCategories) {
            expect(within(nav).getByText(category.labelKey)).toBeInTheDocument();
        }

        // Every topic is rendered as a link to its deep-linkable URL
        // (research.md Decision 2: /guide/:topicSlug).
        for (const topic of guideTopics) {
            const link = within(nav).getByRole('link', { name: topic.titleKey });
            expect(link).toHaveAttribute('href', `/guide/${topic.id}`);
        }

        expect(within(nav).getAllByRole('link')).toHaveLength(guideTopics.length);
    });

    it('marks the active topic\'s link with aria-current="page" and no others', () => {
        const activeTopic = guideTopics[0];
        renderNav(activeTopic.id);

        const nav = screen.getByRole('navigation');
        const activeLink = within(nav).getByRole('link', { name: activeTopic.titleKey });
        expect(activeLink).toHaveAttribute('aria-current', 'page');

        const otherTopics = guideTopics.filter((topic) => topic.id !== activeTopic.id);
        for (const topic of otherTopics) {
            const link = within(nav).getByRole('link', { name: topic.titleKey });
            expect(link).not.toHaveAttribute('aria-current');
        }
    });

    it('marks no link as current when activeTopicId is undefined (overview state)', () => {
        renderNav(undefined);

        const nav = screen.getByRole('navigation');
        for (const topic of guideTopics) {
            const link = within(nav).getByRole('link', { name: topic.titleKey });
            expect(link).not.toHaveAttribute('aria-current');
        }
    });
});

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T036 (Phase 6: User
 * Story 4 — TDD red step, FR-008, spec.md Acceptance Scenario US4.1).
 * `GuideSideNav.tsx` currently has NO mobile-responsive collapse behavior —
 * it always renders the same `<nav>` regardless of viewport — so every test
 * below is expected to FAIL against the current implementation. T039
 * implements the toggle/collapse behavior to make these pass; this file is
 * written first per Constitution Principle I (NON-NEGOTIABLE TDD).
 *
 * ---
 *
 * WHY THIS SHAPE, NOT A REAL CSS BREAKPOINT ASSERTION:
 *
 * These Vitest component tests run in jsdom, which does not apply Tailwind's
 * compiled stylesheet or evaluate `@media` breakpoints — a `hidden md:block`
 * class pair looks identical to jsdom whether the "viewport" is 375px or
 * 1024px, so asserting on CSS class names here would be a no-op test that
 * could never fail. Real breakpoint-driven visual behavior (no
 * overlapping/clipped content on a real mobile viewport) is covered by the
 * Playwright spec instead (T037, e2e/guide.spec.ts).
 *
 * What jsdom *can* verify is a JS-driven state contract, so that's the
 * contract T039's implementation MUST follow — mirroring the existing
 * `window.innerWidth` + `resize`-listener pattern this codebase already uses
 * for JS-based responsive behavior (see
 * `src/features/boards/participants/components/ResponsiveParticipantDisplay.tsx`
 * and its test), rather than inventing a new pattern:
 *
 *   - `GuideSideNav` reads `window.innerWidth` on mount (lazy `useState`
 *     initializer) to decide its initial collapsed/expanded state, using the
 *     same `768px` cutoff as Tailwind's `md` breakpoint used elsewhere in
 *     this component (`GuidePage.tsx`'s `md:grid-cols-[240px_1fr]`):
 *       - `window.innerWidth < 768` (mobile)  -> starts COLLAPSED
 *       - `window.innerWidth >= 768` (desktop) -> starts EXPANDED
 *     jsdom's default `window.innerWidth` is >= 768 (desktop-sized), which is
 *     exactly why every pre-existing test above (none of which touch
 *     `window.innerWidth`) keeps passing unmodified once this behavior
 *     ships: they run in the implicit "desktop" case and see the nav
 *     expanded, same as today.
 *
 *   - It renders a toggle `<button type="button">` whose accessible name is
 *     `t('guide.navigation.toggleLabel')` (a NEW i18n key T039 must add to
 *     `src/locales/en.json` / `es.json` — under this repo's i18n mock, `t`
 *     returns the key verbatim, so the tests below match on the literal
 *     string `'guide.navigation.toggleLabel'`), carrying:
 *       - `aria-expanded={isOpen}` reflecting the collapse state
 *       - `aria-controls="guide-side-nav-panel"` pointing at the panel below
 *
 *   - The existing `<nav>` (unchanged: still the single landmark, still every
 *     topic link, still `aria-current="page"` on the active one — none of
 *     that structure changes) is wrapped in a container:
 *       `<div id="guide-side-nav-panel" aria-hidden={!isOpen}>...<nav>...</nav>...</div>`
 *     `aria-hidden="true"` on that wrapper is what pulls the `<nav>` and its
 *     links out of the accessibility tree (and therefore out of
 *     `getByRole`/`queryByRole` results, which respect ancestor
 *     `aria-hidden` by default) while collapsed — satisfying "collapsed (not
 *     visible / aria-hidden or similar) by default" without deleting or
 *     conditionally-mounting the `<nav>` itself, so the DOM structure
 *     pre-existing tests rely on stays intact once expanded.
 *
 *   - Activating the toggle flips `isOpen`, updating both the button's
 *     `aria-expanded` and the panel's `aria-hidden` in lockstep.
 *
 * This keeps the collapse behavior fully additive: at jsdom's default
 * (desktop) width every pre-existing GuideSideNav test keeps passing as-is,
 * while these new tests exercise the mobile-width path by explicitly
 * overriding `window.innerWidth` before rendering, the same way
 * `ResponsiveParticipantDisplay.test.tsx` does.
 */
describe('GuideSideNav mobile collapse (spec 057 tasks.md T036, FR-008, US4)', () => {
    const MOBILE_WIDTH = 375; // narrower than Tailwind's `md` (768px) breakpoint
    const DESKTOP_WIDTH = 1024; // matches jsdom's default window.innerWidth

    let originalInnerWidth: number;

    const setViewportWidth = (width: number) => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
        });
    };

    beforeEach(() => {
        originalInnerWidth = window.innerWidth;
    });

    afterEach(() => {
        setViewportWidth(originalInnerWidth);
    });

    it('renders a collapse/expand toggle button wired to the topic panel', () => {
        setViewportWidth(MOBILE_WIDTH);
        renderNav();

        const toggle = screen.getByRole('button', { name: 'guide.navigation.toggleLabel' });
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveAttribute('aria-controls', 'guide-side-nav-panel');
    });

    it('collapses the topic-list panel by default at a mobile viewport width (< 768px)', () => {
        setViewportWidth(MOBILE_WIDTH);
        renderNav();

        const toggle = screen.getByRole('button', { name: 'guide.navigation.toggleLabel' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        // The panel must be out of the accessibility tree while collapsed —
        // not merely visually de-emphasized — so both assistive tech and
        // getByRole (which excludes aria-hidden content by default) agree
        // it isn't there to interact with.
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

        const panel = document.getElementById('guide-side-nav-panel');
        expect(panel).not.toBeNull();
        expect(panel).toHaveAttribute('aria-hidden', 'true');
    });

    it('expands the panel and flips aria-expanded when the toggle is activated', async () => {
        setViewportWidth(MOBILE_WIDTH);
        const user = userEvent.setup();
        renderNav();

        const toggle = screen.getByRole('button', { name: 'guide.navigation.toggleLabel' });
        await user.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('navigation')).toBeInTheDocument();

        const panel = document.getElementById('guide-side-nav-panel');
        expect(panel).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('leaves the panel expanded by default at a desktop viewport width (>= 768px)', () => {
        setViewportWidth(DESKTOP_WIDTH);
        renderNav();

        const toggle = screen.getByRole('button', { name: 'guide.navigation.toggleLabel' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
});
