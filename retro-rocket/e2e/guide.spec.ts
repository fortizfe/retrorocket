import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './fixtures/board';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T037 (Phase 6: User
 * Story 4 — TDD red step, FR-008, spec.md Acceptance Scenarios US4.1/US4.2).
 *
 * NEW FILE, not an extension of `e2e/accessibility.spec.ts`: this check is a
 * responsive-layout/overlap assertion, not a WCAG axe scan, matching this
 * project's existing convention of dedicated `-responsive.spec.ts`-style
 * files (`board-responsive.spec.ts`, `profile-responsive.spec.ts`) kept
 * separate from `accessibility.spec.ts`'s axe-core scans. `tasks.md`'s own
 * Phase 7 already reserves `accessibility.spec.ts`'s extension for a
 * *different* task (T041, a WCAG axe scan of the guide overview/topic
 * surfaces) and separately anticipates this exact file, `e2e/guide.spec.ts`,
 * as the home for the guide's functional E2E coverage (T043, quickstart.md
 * Scenarios 1-4) — so this file is created now with the T037 responsive
 * check, and T043 extends it later with the functional scenarios rather
 * than colliding with a second same-named file.
 *
 * `/guide` requires no authentication (FR-002, spec.md Assumptions) — unlike
 * most specs in this suite there is no `signInWithGoogle()`/`createBoard()`
 * arrange step, which is the whole reason this story's independent test is
 * simpler than most of this project's other E2E coverage.
 *
 * EXPECTED TO FAIL right now: `GuideSideNav.tsx` has no mobile collapse
 * behavior yet — at a 375px-wide viewport `GuidePage.tsx`'s
 * `md:grid md:grid-cols-[240px_1fr]` falls back to plain block stacking
 * below the `md` breakpoint (not a collapsible drawer), so the nav renders
 * inline, unconditionally, above the content, and no collapse toggle button
 * exists for these tests to find. See
 * `src/test/features/guide/GuideSideNav.test.tsx`'s "GuideSideNav mobile
 * collapse" describe block (T036) for the exact, documented
 * aria-expanded/aria-controls/aria-hidden contract T039's implementation
 * must satisfy — this spec exercises the same contract end-to-end, in a
 * real browser, at a real 375px viewport (jsdom/Vitest cannot evaluate real
 * CSS breakpoints, which is why T036 alone isn't sufficient coverage for
 * FR-008/SC-004's "no overlapping or clipped content" requirement).
 */

const MOBILE_VIEWPORT = { width: 375, height: 812 };

/** Matches the `guide.navigation.toggleLabel` i18n key's expected English/Spanish
 *  copy once T039 adds it — kept loose (case-insensitive substring) so this
 *  spec doesn't need updating for minor copy wording changes. */
const TOGGLE_NAME_PATTERN = /menú|menu|temas|topics/i;

test.describe('Guide page — mobile viewport (spec 057 tasks.md T037, FR-008, US4)', () => {
    test('the side menu collapses behind a toggle instead of obscuring content, with no horizontal overflow', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/guide');

        const content = page.getByTestId('guide-page-content');
        await expect(content).toBeVisible();

        // The overview is the guide's default content (US1/US2 baseline) — it
        // must be immediately visible on a mobile viewport, not pushed below
        // an always-expanded side nav (US4 Acceptance Scenario 1).
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        // The collapse toggle (T036/T039's aria-expanded/aria-controls
        // contract) must be present and, on a mobile viewport, start
        // collapsed.
        const toggle = page.getByRole('button', { name: TOGGLE_NAME_PATTERN });
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        // While collapsed, the topic list must be genuinely out of the way —
        // not merely squeezed above the fold — so it cannot obscure or push
        // around the content area (FR-008, SC-004).
        await expect(page.getByRole('navigation')).toHaveCount(0);

        await expectNoHorizontalOverflow(page.locator('body'));
    });

    test('selecting a topic collapses the menu again so the content is fully readable', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/guide');

        const toggle = page.getByRole('button', { name: TOGGLE_NAME_PATTERN });
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');

        const nav = page.getByRole('navigation');
        await expect(nav).toBeVisible();

        const firstTopicLink = nav.getByRole('link').first();
        await firstTopicLink.click();

        // Selecting a topic on a mobile viewport must get the menu out of the
        // way again (US4 Acceptance Scenario 2) so the topic's content is
        // fully readable, not left open over it.
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByRole('navigation')).toHaveCount(0);

        const content = page.getByTestId('guide-page-content');
        await expect(content).toBeVisible();
        await expectNoHorizontalOverflow(page.locator('body'));
    });
});

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T043 (Phase 7: Polish).
 * Functional E2E coverage for quickstart.md Scenarios 1, 3, and 4 (Scenario 2 —
 * the authenticated header entry point — is exercised separately, see the
 * T041 comment above for why this file's own header comment reserved this
 * section for exactly these scenarios). `/guide` and `/guide/:topicSlug`
 * require no authentication (FR-002), so — like the mobile-collapse tests
 * above — none of these tests sign in.
 */
test.describe('Guide page — functional coverage (spec 057 tasks.md T043, quickstart.md Scenarios 1, 3, 4)', () => {
    test('landing page → guide entry point → guide loads without auth (Scenario 1)', async ({ page }) => {
        await page.goto('/');

        const entryPoint = page.getByRole('link', { name: 'Guía de uso' });
        await expect(entryPoint).toBeVisible();
        await entryPoint.click();

        await expect(page).toHaveURL(/\/guide$/);
        // The guide overview loads — not a login prompt.
        await expect(page.getByRole('heading', { level: 1, name: 'Bienvenido a la guía de RetroRocket' })).toBeVisible();
        await expect(page.getByText('Continuar con Google')).toHaveCount(0);

        // FR-011: a clear way back to the landing page is available.
        const backLink = page.getByRole('link', { name: 'Volver al inicio' });
        await expect(backLink).toBeVisible();
        await backLink.click();
        await expect(page).toHaveURL(/\/$/);
    });

    test('side-menu topic switching updates content and active state; a direct topic URL lands correctly (Scenario 3)', async ({ page }) => {
        await page.goto('/guide');

        const nav = page.getByRole('navigation', { name: 'Temas de la guía' });
        await expect(nav).toBeVisible();

        // Every category heading from data-model.md's registry is present.
        await expect(page.getByRole('heading', { name: 'Modo anónimo', level: 2 })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Exportación', level: 2 })).toBeVisible();

        // Selecting a topic updates the content area in place (no full reload)
        // and marks the side menu's active selection.
        const anonymousModeLink = nav.getByRole('link', { name: 'Modo anónimo' });
        await anonymousModeLink.click();
        await expect(page).toHaveURL(/\/guide\/anonymous-mode$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Modo anónimo' })).toBeVisible();
        await expect(anonymousModeLink).toHaveAttribute('aria-current', 'page');

        // Switching to a second topic updates both the content and which link
        // carries the active-state marker.
        const exportingLink = nav.getByRole('link', { name: 'Exportar tu retrospectiva' });
        await exportingLink.click();
        await expect(page).toHaveURL(/\/guide\/exporting$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Exportar tu retrospectiva' })).toBeVisible();
        await expect(exportingLink).toHaveAttribute('aria-current', 'page');
        await expect(anonymousModeLink).not.toHaveAttribute('aria-current', 'page');

        // A direct link to a specific topic (FR-005) lands on the correct topic
        // with the side menu already reflecting it as active.
        await page.goto('/guide/anonymous-mode');
        await expect(page.getByRole('heading', { level: 1, name: 'Modo anónimo' })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Temas de la guía' }).getByRole('link', { name: 'Modo anónimo' })).toHaveAttribute(
            'aria-current',
            'page',
        );
    });

    test("a topic's content is non-empty and readable (Scenario 4)", async ({ page }) => {
        await page.goto('/guide/anonymous-mode');

        const body = page.getByTestId('guide-topic-body');
        await expect(body).toBeVisible();
        const bodyText = (await body.textContent())?.trim() ?? '';
        expect(bodyText.length).toBeGreaterThan(100);
        // Plain-language content, not implementation jargon (FR-007) — a loose
        // smoke check, the exhaustive per-topic wording check belongs to the
        // Vitest unit suite (topics.test.ts).
        expect(bodyText.toLowerCase()).not.toMatch(/\b(api|firestore|endpoint|json)\b/);
    });

    test('the "Connecting AI Assistants" topic renders its external link (Scenario 4)', async ({ page }) => {
        await page.goto('/guide/connecting-ai-assistants');

        await expect(page.getByRole('heading', { level: 1, name: 'Conectar asistentes de IA' })).toBeVisible();

        const externalLink = page.getByRole('link', { name: /Abrir la guía completa del conector MCP/ });
        await expect(externalLink).toBeVisible();
        await expect(externalLink).toHaveAttribute('href', 'docs/mcp-guia-usuario.md');
        await expect(externalLink).toHaveAttribute('target', '_blank');
        await expect(externalLink).toHaveAttribute('rel', /noopener/);
    });
});
