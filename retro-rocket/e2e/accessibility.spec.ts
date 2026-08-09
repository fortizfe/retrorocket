import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInWithGoogle, createBoard, createBoardViaApi } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent, openReactionPicker } from './fixtures/board';
import { registerAndConnectMcpClient, revokeMcpConnectionsForClient } from './fixtures/mcp';

/**
 * WCAG 2.1 AA audit gate (FR-013 / SC-003).
 *
 * Runs axe-core against the primary surfaces in BOTH themes. Part of the
 * merge-blocking `e2e` job — do NOT disable rules to pass (Constitution
 * Principle VIII). See specs/009-wcag-theme-compliance/contracts/accessibility-audit.md.
 */

type Theme = 'light' | 'dark';
const THEMES: Theme[] = ['light', 'dark'];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Force a theme before the app's scripts run, so first paint is already themed. */
async function forceTheme(page: Page, theme: Theme): Promise<void> {
    await page.addInitScript((t) => {
        try {
            window.localStorage.setItem('theme', t);
        } catch {
            /* ignore */
        }
    }, theme);
}

/** Apply the theme class to the live document (covers runtime switches). */
async function applyThemeClass(page: Page, theme: Theme): Promise<void> {
    // Ensure no navigation is mid-flight before evaluating in the page context, otherwise
    // page.evaluate can fail with "Execution context was destroyed" if a late redirect
    // (e.g. an async post-login/board settle) fires at this instant.
    await page.waitForLoadState('load');
    await page.evaluate((t) => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        window.localStorage.setItem('theme', t);
    }, theme);
}

/** Wait until the board has rendered its default columns, so no navigation or
 *  late render is pending when we scan. */
async function waitForBoardReady(page: Page): Promise<void> {
    await expect(page.getByText('Qué me ayudó', { exact: true })).toBeVisible({ timeout: 15_000 });
}

/** Run axe and assert zero violations, with a readable failure message. */
async function expectNoViolations(page: Page, context: string): Promise<void> {
    // Deterministic pre-scan settle. Two sources of transient color otherwise
    // cause false color-contrast positives:
    //   1. Decorative *infinite* CSS animations (animate-float / animate-pulse-
    //      soft) continuously vary opacity — freeze all CSS animations/transitions.
    //   2. framer-motion *entrance* animations fade opacity 0 → 1 via JS inline
    //      styles which this CSS freeze cannot stop. On Landing they are staggered
    //      up to `delay: 1.2s`, so wait comfortably past the last one (~1.7s) for
    //      elements to reach their final opacity before axe reads computed colors.
    // NOTE: do NOT wait for 'networkidle' — authenticated pages hold open
    // Firestore real-time connections, so the network never goes idle.
    await page.addStyleTag({
        content: `
            *, *::before, *::after { animation: none !important; transition: none !important; }
            [style*="opacity"] { opacity: 1 !important; }
        `,
    });
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const summary = results.violations
        .map((v) => `  [${v.id}] ${v.help} (${v.nodes.length} node(s))`)
        .join('\n');
    expect(results.violations, `axe violations at ${context}:\n${summary}`).toEqual([]);
}

// --- Public surface: Landing, both themes (no auth) -------------------------

for (const theme of THEMES) {
    test(`Landing has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.goto('/');
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `/ (${theme})`);
    });
}

// --- Authenticated surfaces: Dashboard, Profile, Board (both themes) --------

for (const theme of THEMES) {
    test(`Dashboard & Profile have no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);

        await page.goto('/dashboard');
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `/dashboard (${theme})`);

        // Populate the Connected Apps list (origin label + last-used markup, US2 of
        // 023-fix-mcp-connection-management) so the real axe-core gate actually scans
        // that new UI, not an empty-state card.
        const mcpClientName = `A11y MCP Client ${theme}`;
        await registerAndConnectMcpClient(page, mcpClientName);

        await page.goto('/perfil');
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `/perfil (${theme})`);

        // Clean up immediately: this suite shares one Firestore Emulator instance and
        // test-login identity across every spec file (no per-spec isolation), so an
        // unrevoked connection here would otherwise leak into and break specs that run
        // later (e.g. mcp-connector.spec.ts's own connection-management assertions).
        await revokeMcpConnectionsForClient(page, mcpClientName);
    });

    test(`Board (cards/columns/voting) has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Board ${theme}`);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `board (${theme})`);
    });
}

// --- Error route states (both themes) — spec 028 Polish (T052) --------------
// Surfaced during the design-alignment audit: prior scans only ever exercised
// each route's `default` state. `dashboard-board-list` and `profile` both have
// a documented `error` state (data-model.md) with its own visible error text
// via `error.spec.ts`'s mocking pattern (page.route(...).abort('failed')) —
// scan that state too, since a real backend failure is exactly the moment a
// user most needs the error message to be legible/AA-compliant.

for (const theme of THEMES) {
    test(`Dashboard error state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await page.route('**/api/boards', (route) => route.abort('failed'));

        await page.goto('/dashboard');
        await applyThemeClass(page, theme);
        // Spec 031: the error copy no longer contains the literal word "error"
        // (better UX) — assert via the semantic role instead.
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
        await expectNoViolations(page, `/dashboard error state (${theme})`);
    });

    test(`Profile error state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await page.route('**/api/profile', (route) => route.abort('failed'));

        await page.goto('/perfil');
        await applyThemeClass(page, theme);
        await expect(page.getByText(/error/i).first()).toBeVisible({ timeout: 30_000 });
        await expectNoViolations(page, `/perfil error state (${theme})`);
    });
}

// --- Dashboard List State variants (both themes) — spec 031 FR-018/SC-003 ---
// data-model.md's "List State" entity: loaded (scanned above), loading,
// empty (zero boards), no-results (search matches nothing), and error
// (scanned above) are five mutually-exclusive states, each required to
// independently satisfy WCAG 2.1 AA — not just the happy path.

for (const theme of THEMES) {
    test(`Dashboard loading state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        // Hold the fetch open so the loading spinner stays visible long enough to scan.
        await page.route('**/api/boards', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await route.continue();
        });

        await page.goto('/dashboard');
        await applyThemeClass(page, theme);
        await expect(page.getByText('Cargando tus tableros...')).toBeVisible();
        await expectNoViolations(page, `/dashboard loading state (${theme})`);
    });

    test(`Dashboard zero-boards empty state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await page.route('**/api/boards', (route) => route.fulfill({ json: { boards: [] } }));

        await page.goto('/dashboard');
        await applyThemeClass(page, theme);
        await expect(page.getByText('Aún no tienes retrospectivas')).toBeVisible({ timeout: 15_000 });
        await expectNoViolations(page, `/dashboard empty state (${theme})`);
    });

    test(`Dashboard no-results state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        const createRes = await page.request.post('/api/boards', {
            data: { templateId: 'default', title: `A11y NoResults Board ${theme}`, locale: 'es' },
        });
        expect(createRes.ok()).toBeTruthy();

        await page.goto('/dashboard');
        await applyThemeClass(page, theme);
        await page.getByPlaceholder(/buscar|search/i).fill('this matches absolutely nothing at all');
        await expect(page.getByText('No se encontraron retrospectivas que coincidan con tu búsqueda')).toBeVisible({
            timeout: 15_000,
        });
        await expectNoViolations(page, `/dashboard no-results state (${theme})`);
    });
}

// --- Reaction picker surface (both themes) — US3 / FR-016 / SC-008 ----------

for (const theme of THEMES) {
    test(`open reaction picker has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Picker ${theme}`);
        await waitForBoardReady(page);
        await addCardToFirstColumn(page, 'Reactable card');
        const card = cardByContent(page, 'Reactable card');
        await openReactionPicker(page, card);
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `reaction picker (${theme})`);
    });
}

// --- Keyboard operability of board interactions — FR-018 / SC-008 -----------

test('board cards, voting, reactions and drag-and-drop are keyboard operable', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Keyboard Board');
    await waitForBoardReady(page);
    await addCardToFirstColumn(page, 'Keyboard card');

    const card = cardByContent(page, 'Keyboard card');

    // Reaction picker opens with the keyboard and closes on Escape.
    const trigger = card.locator('button[aria-haspopup="dialog"]').first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The like control is keyboard focusable.
    const like = card.getByRole('button', { name: /^\d+$/ });
    await like.focus();
    await expect(like).toBeFocused();

    // Drag-and-drop is keyboard operable: the sortable card exposes a keyboard
    // drag affordance (dnd-kit KeyboardSensor + sortable roledescription).
    const draggable = card.locator('[aria-roledescription]').first();
    await expect(draggable).toHaveAttribute('aria-roledescription', /.+/);
    await expect(draggable).toHaveAttribute('tabindex', '0');
});

// --- Runtime theme switch (T028a / FR-010) ----------------------------------

test('toggling theme mid-session keeps the board WCAG 2.1 AA compliant', async ({ page, context }) => {
    await forceTheme(page, 'light');
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Board toggle');
    await waitForBoardReady(page);

    await applyThemeClass(page, 'light');
    await expectNoViolations(page, 'board after switch → light');

    await applyThemeClass(page, 'dark');
    // No surface should retain prior-theme colors; a full axe pass proves it.
    await expectNoViolations(page, 'board after switch → dark');
});

// --- Reduced motion (FR-006 / SC-005) — spec 028 Polish (T053) --------------
// Automates what quickstart.md's check 5 previously documented as a manual
// DevTools walkthrough: emulate prefers-reduced-motion and prove the P1 core
// flow still completes with its result immediately visible (card appears,
// vote count updates), i.e. the root <MotionConfig reducedMotion="user">
// (T006) doesn't leave anything invisibly stuck mid-animation.

test('the P1 core flow (add card, vote, group) completes with prefers-reduced-motion enabled', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Reduced Motion Board');
    await waitForBoardReady(page);

    await addCardToFirstColumn(page, 'Reduced motion card');
    const card = cardByContent(page, 'Reduced motion card');
    await expect(card).toBeVisible();

    const like = card.getByRole('button', { name: /^\d+$/ });
    await expect(like).toBeVisible();
    const before = await like.textContent();
    await like.click();
    await expect(like).not.toHaveText(before ?? '');
});

// --- Reduced motion for the "Mis Tableros" table (spec 032 FR-006) ---------
// Same pattern as the P1-flow check above, applied to the table's own
// filter/sort/pagination interactions (research.md R4: MotionConfig already
// governs BoardRow's split transition app-wide, this proves nothing is left
// invisibly stuck mid-transition for this screen specifically).
test('scope-filter and sort changes on the dashboard table complete with prefers-reduced-motion enabled', async ({ page, context, request }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInWithGoogle(page, context);

    const createdTitle = `A11y RM Created Board ${Date.now()}`;
    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title: createdTitle, locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();

    const joinedTitle = `A11y RM Joined Board ${Date.now()}`;
    const joinedBoardId = await createBoardViaApi(request, 'a11y-rm-owner@example.com', 'A11y RM Owner', joinedTitle);
    const joinRes = await page.request.post(`/api/boards/${joinedBoardId}/join`);
    expect(joinRes.ok()).toBeTruthy();

    await page.goto('/dashboard');
    await expect(page.getByText(createdTitle)).toBeVisible();
    await expect(page.getByText(joinedTitle)).toBeVisible();

    await page.getByRole('radio', { name: /Creadas/ }).click();
    await expect(page.getByText(createdTitle)).toBeVisible();
    await expect(page.getByText(joinedTitle)).not.toBeVisible();

    await page.getByRole('radio', { name: /Todas/ }).click();
    await page.getByTitle('Nombre').click(); // sort — same shared path (research.md R5)
    await expect(page.getByText(createdTitle)).toBeVisible();
    await expect(page.getByText(joinedTitle)).toBeVisible();
});

// --- Keyboard focus visibility (T033 / SC-004) ------------------------------

/**
 * Inspect the currently focused element in the browser context. `:focus-visible`
 * is evaluated in-page (Chromium supports it) rather than via a Playwright
 * locator (whose selector engine does not resolve `:focus-visible`).
 */
async function inspectFocus(page: Page) {
    return page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body || el === document.documentElement) {
            return { focused: false as const };
        }
        const s = getComputedStyle(el);
        const hasOutline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth || '0') > 0;
        const hasBoxShadow = Boolean(s.boxShadow) && s.boxShadow !== 'none';
        return {
            focused: true as const,
            tag: el.tagName.toLowerCase(),
            hasIndicator: hasOutline || hasBoxShadow,
        };
    });
}

for (const theme of THEMES) {
    test(`focused elements are visibly indicated via keyboard (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.goto('/');
        await applyThemeClass(page, theme);
        // `load` (inside applyThemeClass) fires before the SPA has hydrated/lazy-loaded
        // its interactive controls — under CI's slower, cumulatively-loaded shared runner
        // (playwright.config.ts's own comment on this), Tab could start firing before any
        // focusable element exists yet, landing focus on <body> for all 8 presses and
        // failing the "at least one" assertion below. Wait for a known, always-present
        // landing control so the tab order is guaranteed to be populated first.
        await expect(page.getByText('Continuar con Google', { exact: true })).toBeVisible({ timeout: 15_000 });

        // Tab through the landing surface. Every element that actually receives
        // keyboard focus MUST show a visible indicator (outline or ring); the tab
        // order may return to the document after the last control, so we assert
        // that at least one interactive element was reached and indicated.
        let focusedElements = 0;
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab');
            const info = await inspectFocus(page);
            if (info.focused) {
                focusedElements++;
                expect(
                    info.hasIndicator,
                    `focused <${info.tag}> has a visible focus indicator (${theme})`,
                ).toBe(true);
            }
        }
        expect(
            focusedElements,
            `keyboard Tab reaches at least one indicated interactive element (${theme})`,
        ).toBeGreaterThan(0);
    });
}
