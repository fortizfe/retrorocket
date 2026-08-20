import { render, screen, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import GuidePage from '@/features/guide/components/GuidePage';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T006 (Phase 2:
 * Foundational — TDD red step). `src/features/guide/components/GuidePage.tsx`
 * does not exist yet (only the empty `src/features/guide/components/`
 * directory from T001) — T007 creates the base layout shell that makes this
 * pass, per Constitution Principle I (NON-NEGOTIABLE TDD).
 *
 * This is intentionally minimal, matching this phase's scope ("just enough
 * for /guide to resolve to something" — tasks.md Phase 2 goal): it only
 * asserts GuidePage mounts without crashing and exposes an identifiable
 * page-frame/content-area container. User Story-specific behavior (overview
 * copy, side nav, topic content, mobile collapse, etc.) is covered by later
 * tests (T011, T020, T021, T036...) that extend this same file or add their
 * own, per tasks.md.
 *
 * Chosen, documented convention for "the page frame / content area" this
 * task asks for: GuidePage renders its content region as a semantic
 * `<main>` landmark (`role="main"`, satisfying Principle VIII's landmark/
 * keyboard-navigability expectations from the start) additionally tagged
 * `data-testid="guide-page-content"` for convenient, structure-stable
 * querying by this and future guide tests. Both are asserted below so
 * either convention is pinned down for T007's implementation.
 *
 * Wrapped in BrowserRouter + I18nextProvider, matching this repo's
 * established page-test convention (see src/test/pages/Dashboard.test.tsx's
 * renderWithProviders) since GuidePage is expected to use react-router-dom
 * (Link/useParams for deep-linkable topics, per plan.md) and react-i18next
 * (all guide copy) once fully built out in later tasks.
 *
 * Expected failure right now: `Cannot find module
 * '@/features/guide/components/GuidePage'` (the file doesn't exist).
 */

const renderWithProviders = () =>
    render(
        <BrowserRouter>
            <I18nextProvider i18n={i18n}>
                <GuidePage />
            </I18nextProvider>
        </BrowserRouter>
    );

describe('GuidePage', () => {
    it('renders without crashing', () => {
        renderWithProviders();
    });

    it('renders an identifiable page frame / content area (main landmark, data-testid="guide-page-content")', () => {
        renderWithProviders();

        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByTestId('guide-page-content')).toBeInTheDocument();
    });
});

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T011 (Phase 3: User
 * Story 1 — TDD red step). GuidePage does not yet render any overview copy
 * — T015 (after T014 adds the i18n keys) makes this pass, per Constitution
 * Principle I (NON-NEGOTIABLE TDD).
 *
 * Covers spec.md US1 Acceptance Scenario 2: "Given the visitor selects that
 * element, When the guide page loads, Then they see an overview of the
 * guide (not a login prompt)". At this point in the plan (Phase 3, before
 * US2's `/guide/:topicSlug` route and `useActiveGuideTopic` hook exist —
 * tasks.md T024/T028), "no topic selected" simply means the default render
 * of GuidePage at `/guide` with no route param, which is exactly what
 * `renderWithProviders` above already does (BrowserRouter with no route
 * matching, GuidePage rendered directly rather than through a
 * `/guide/:topicSlug` Route).
 *
 * Chosen, documented i18n keys (per the task's own suggested naming):
 * `guide.overview.title` and `guide.overview.description` — added to
 * `src/locales/en.json` / `es.json` by T014 alongside `guide.entryPoint.*`.
 *
 * `react-i18next` is NOT mocked in this file (unlike Header.test.tsx) —
 * it's wrapped in the real `I18nextProvider`/`i18n` config, but
 * src/test/setup.ts's *global* `vi.mock('react-i18next', ...)` (which
 * stubs `useTranslation`'s `t` to `(key) => key` and `I18nextProvider` to a
 * plain passthrough) still applies here since this file adds no
 * file-local override — so, same as every other test in this codebase
 * (e.g. src/test/pages/Landing.test.tsx's `landing.capabilities.subtitle`
 * assertions), this asserts on the key path itself, not translated prose.
 *
 * Expected failure right now: neither key's literal text is present —
 * GuidePage's `<main>` has no children at all yet.
 */
describe('GuidePage — overview copy (spec 057 FR-002/US1, guide.overview.*)', () => {
    it('renders the overview title and description when no topic is selected', () => {
        renderWithProviders();

        const main = screen.getByTestId('guide-page-content');
        expect(within(main).getByText('guide.overview.title')).toBeInTheDocument();
        expect(within(main).getByText('guide.overview.description')).toBeInTheDocument();
    });

    it('does not show a login prompt or require authentication to see the overview', () => {
        renderWithProviders();

        // No sign-in copy/CTA anywhere in the guide page — it's public (FR-002).
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });
});

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T029 (Phase 4: User
 * Story 2). Verifies the unknown-slug edge case end-to-end (spec.md Edge
 * Cases): an old or mistyped `/guide/:topicSlug` deep link falls back to
 * the overview instead of crashing or rendering a broken page. This relies
 * on `useActiveGuideTopic` (T024) returning `undefined` for a slug that
 * doesn't match any registered topic id, and `GuidePage` (T027) rendering
 * the same `guide.overview.*` welcome copy in that case — both already
 * covered individually by useActiveGuideTopic.test.ts and the "overview
 * copy" describe block above; this test confirms the two compose correctly
 * through the real `/guide/:topicSlug` route.
 */
const renderAtGuideRoute = (initialPath: string) =>
    render(
        <MemoryRouter initialEntries={[initialPath]}>
            <I18nextProvider i18n={i18n}>
                <Routes>
                    <Route path="/guide" element={<GuidePage />} />
                    <Route path="/guide/:topicSlug" element={<GuidePage />} />
                </Routes>
            </I18nextProvider>
        </MemoryRouter>
    );

describe('GuidePage — unknown topic slug fallback (spec 057 Edge Cases, T029)', () => {
    it('renders the overview (not a crash) for an unrecognized :topicSlug', () => {
        renderAtGuideRoute('/guide/not-a-real-topic');

        const main = screen.getByTestId('guide-page-content');
        expect(within(main).getByText('guide.overview.title')).toBeInTheDocument();
        expect(within(main).getByText('guide.overview.description')).toBeInTheDocument();
    });
});
