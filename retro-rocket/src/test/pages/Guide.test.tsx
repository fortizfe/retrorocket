import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Guide from '@/pages/Guide';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T004 (Phase 2:
 * Foundational — TDD red step). `src/pages/Guide.tsx` does not exist yet
 * (T005 creates it); this file is written first, per Constitution Principle
 * I (NON-NEGOTIABLE TDD).
 *
 * `Guide.tsx` is specced (plan.md's Project Structure) as a thin route
 * wrapper — matching the `Home.tsx` pattern already in this codebase — that
 * simply renders the feature-owned `GuidePage` layout component
 * (`src/features/guide/components/GuidePage.tsx`, itself covered by
 * `src/test/features/guide/GuidePage.test.tsx`, T006). `GuidePage` is
 * mocked out here so this test is scoped to what `Guide.tsx` itself is
 * responsible for — rendering `GuidePage` — not `GuidePage`'s own internals.
 *
 * Expected failure right now: `Cannot find module '@/pages/Guide'` (the
 * file doesn't exist). Once T005 creates `Guide.tsx` as
 * `export default () => <GuidePage />`, this test goes green with no
 * further changes needed here.
 */

vi.mock('@/features/guide/components/GuidePage', () => ({
    default: () => <div data-testid="guide-page" />,
}));

describe('Guide page', () => {
    it('renders the GuidePage layout component', () => {
        render(<Guide />);

        expect(screen.getByTestId('guide-page')).toBeInTheDocument();
    });

    /**
     * spec-kit feature 057-getting-started-guide, tasks.md T017 (Phase 3:
     * User Story 1). Confirms FR-002 ("The guide page MUST be reachable and
     * fully viewable without requiring the visitor to sign in") holds for
     * `Guide.tsx` itself: rendered with no `UserProvider`/auth context and
     * no `AuthWrapper` ancestor at all (matching how App.tsx registers
     * `/guide` outside of any `<AuthWrapper requireAuth={true}>`, unlike
     * `/mcp/consent`), it must render `GuidePage` directly rather than
     * redirecting or throwing.
     */
    it('renders without requiring authentication (no redirect/guard, FR-002)', () => {
        render(<Guide />);

        expect(screen.getByTestId('guide-page')).toBeInTheDocument();
        expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });
});
