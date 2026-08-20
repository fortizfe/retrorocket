import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInWithGoogle, signInAs, createBoard, createBoardViaApi } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent, openReactionPicker } from './fixtures/board';
import { registerAndConnectMcpClient, revokeMcpConnectionsForClient } from './fixtures/mcp';
import { getDisplayNameInput } from './fixtures/profile';

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

    // "Empty column" state — every column freshly created, zero cards. Distinct
    // from the "populated" state below: RetrospectiveBoard.tsx's per-column empty
    // placeholder ("Agregar primera tarjeta") is its own render path, not just an
    // absence of cards.
    test(`Board empty-column state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Board ${theme}`);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `board empty-column state (${theme})`);
    });
}

// --- /retro/:id theme × state matrix (feature 033, research.md §6) ---------
// Closes a gap found during planning: this route — the surface this entire
// feature redesigns — had no automated WCAG 2.1 AA regression gate at all
// beyond the empty-column scan above. Adds the three remaining states from
// data-model.md's "Board State" entity: populated (real cards, not just an
// empty shell — the DraggableCard/CardFooter/CardMenu DOM the empty-column
// scan above never exercises), loading, and error.

for (const theme of THEMES) {
    test(`Board populated state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Populated Board ${theme}`);
        await waitForBoardReady(page);
        await addCardToFirstColumn(page, 'Populated-state card');
        const card = cardByContent(page, 'Populated-state card');
        await card.getByRole('button', { name: /^\d+$/ }).click();
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `board populated state (${theme})`);
    });

    test(`Board loading state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Loading Board ${theme}`);
        const boardId = new URL(page.url()).pathname.split('/').pop();

        // Hold the board-state fetch open so the loading spinner stays visible
        // long enough to scan, mirroring the Dashboard-loading-state pattern above.
        await page.route(`**/api/retrospectives/${boardId}`, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await route.continue();
        });
        await page.reload();
        await applyThemeClass(page, theme);
        // Loading.tsx has no distinguishing role/testid; assert on the absence of
        // the board content that only renders once the fetch resolves.
        await expect(page.getByText('Qué me ayudó', { exact: true })).not.toBeVisible();
        await expectNoViolations(page, `board loading state (${theme})`);
    });

    test(`Board error state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Error Board ${theme}`);
        const boardId = new URL(page.url()).pathname.split('/').pop();

        // A network failure (not a 404) drives the generic error branch, distinct
        // from the board-deleted (`notFound`) branch already covered elsewhere.
        await page.route(`**/api/retrospectives/${boardId}`, (route) => route.abort('failed'));
        await page.reload();
        await applyThemeClass(page, theme);
        await expect(page.getByText('Retrospectiva no encontrada')).toBeVisible({ timeout: 15_000 });
        await expectNoViolations(page, `board error state (${theme})`);
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

// --- Profile View State variants: loading, and the display-name saving/save-error
// states (both themes) — spec 050-profile-redesign T033, data-model.md's `Profile View
// State`/`Editable Field Operation State`, contracts/accessibility-interaction-contract.md.
// `loaded` (above, "Dashboard & Profile...") and `error` (immediately above) were already
// covered before this feature; this closes the remaining variants the contract requires.

for (const theme of THEMES) {
    test(`Profile loading state has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        // Sign-in's own initial load already resolved GET /api/profile once (populating
        // UserContext); intercept it now so the *next* fetch — triggered by the full
        // browser navigation to /perfil below — stays pending long enough to scan, same
        // technique as the Dashboard/Board loading-state scans above.
        await page.route('**/api/profile', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await route.continue();
        });

        await page.goto('/perfil');
        await applyThemeClass(page, theme);
        // AuthWrapper.tsx (not Profile.tsx's own inner `if (!userProfile)` branch) is
        // what's actually visible here: it gates rendering Profile's children on a single
        // combined `loading` flag that only flips false once BOTH session-establishment
        // AND the profile fetch resolve together (UserContext.tsx's bootstrap effect sets
        // `userData` and `coreState.loading:false` in the same synchronous block on
        // success) — so there is no point during a normal navigation where AuthWrapper has
        // already let Profile's children render but `userProfile` is still null. Profile's
        // own loading branch is real and does independently satisfy FR-010/data-model.md's
        // Profile View State — exercised directly (context mocked past AuthWrapper) by
        // Profile.test.tsx — but it isn't reachable end-to-end via this navigation path
        // under the current architecture. This scan therefore verifies the branch a real
        // visitor actually sees during this window: AuthWrapper's own loading UI.
        await expect(page.getByText('Verificando autenticación...')).toBeVisible();
        await expectNoViolations(page, `/perfil loading state (${theme})`);
    });

    test(`Profile display-name saving state has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        // A dedicated identity, not the shared TEST_USER_EMAIL account: this test edits
        // the display name, and the PATCH below is deliberately left pending past the
        // test's own lifetime (never resolved), so reusing the shared account could leave
        // it in an ambiguous state for specs that run later in this suite's single shared
        // emulator session.
        const email = `e2e-a11y-profile-saving-${theme}@example.com`;
        await signInAs(page, email, `A11y Saving User ${theme}`);
        await page.goto('/perfil');
        await applyThemeClass(page, theme);

        const nameInput = await getDisplayNameInput(page);
        await nameInput.fill(`Saving State Name ${theme}`);

        // Hold the PATCH open so the inline "Guardando..." state stays visible long
        // enough to scan (never resolved — the test ends before this fires).
        await page.route('**/api/profile', async (route) => {
            if (route.request().method() === 'PATCH') {
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
            return route.continue();
        });
        await page.getByRole('button', { name: 'Guardar cambios' }).click();
        await expect(page.getByText('Guardando...')).toBeVisible();
        await expectNoViolations(page, `/perfil display-name saving state (${theme})`);
    });

    test(`Profile display-name save-error state has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        const email = `e2e-a11y-profile-saveerror-${theme}@example.com`;
        await signInAs(page, email, `A11y Save Error User ${theme}`);
        await page.goto('/perfil');
        await applyThemeClass(page, theme);

        const nameInput = await getDisplayNameInput(page);
        await nameInput.fill(`Save Error Name ${theme}`);

        await page.route('**/api/profile', (route) => {
            if (route.request().method() === 'PATCH') return route.abort('failed');
            return route.continue();
        });
        await page.getByRole('button', { name: 'Guardar cambios' }).click();
        await expect(page.getByText('Ocurrió un error al guardar tu nombre. Inténtalo de nuevo.')).toBeVisible({
            timeout: 15_000,
        });
        await expectNoViolations(page, `/perfil display-name save-error state (${theme})`);
    });
}

// --- Disabled account-action placeholders announced as unavailable, not merely
// visually muted — spec 050-profile-redesign T034, SC-007, FR-007. A dedicated
// DOM-level assertion, not folded into the loaded-state axe scan above: axe-core's own
// aria-describedby-related rules only confirm a referenced id resolves to *some* element
// in the DOM, not that the resolved element is visible and carries non-empty "not yet
// available" text — this checks the actual SC-007 contract directly, end-to-end against
// the real rendered app (data-model.md's `Account Action Placeholder` validation rules).

test('the disabled "Exportar Datos"/"Eliminar Cuenta" placeholders are announced as unavailable to assistive technology, in every automated run (SC-007)', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    for (const name of ['Exportar Datos', 'Eliminar Cuenta']) {
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toBeVisible();
        await expect(button).toBeDisabled();

        const describedBy = await button.getAttribute('aria-describedby');
        expect(describedBy, `"${name}" button has an aria-describedby association`).toBeTruthy();

        const description = page.locator(`#${describedBy}`);
        await expect(description).toBeVisible();
        const text = (await description.textContent())?.trim() ?? '';
        expect(text.length, `"${name}" button's aria-describedby resolves to non-empty visible text`).toBeGreaterThan(0);
    }
});

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

// --- Grouping-suggestions panel surface (spec 044) — anchored panel introduced to
// fix the reported top-left-corner positioning defect; verifies the new panel itself
// (not just its trigger) meets WCAG 2.1 AA in both themes, across its loading, result,
// and unavailable states, which must be distinguishable by more than color alone. -----

for (const theme of THEMES) {
    test(`open grouping-suggestions panel has no WCAG 2.1 AA violations (${theme})`, async ({ page, context, request }) => {
        const boardId = await createBoardViaApi(request, `e2e-a11y-suggestions-${theme}@example.com`, `A11y Suggestions ${theme}`, `A11y Suggestions Board ${theme}`);
        await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Necesitamos mejorar la comunicación del equipo', column: 'improve' } });
        await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Deberíamos comunicarnos mejor como equipo', column: 'improve' } });

        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await page.goto(`/retro/${boardId}`);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);

        const trigger = page.getByRole('button', { name: 'Opciones de agrupación' }).last();
        await trigger.click();
        await page.getByText('Agrupaciones sugeridas', { exact: true }).click();

        const panel = page.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
        await expect(panel).toBeVisible({ timeout: 15_000 });
        await expect(panel.getByText(/Grupo 1|No se encontraron sugerencias/)).toBeVisible({ timeout: 90_000 });

        await expectNoViolations(page, `grouping-suggestions panel, populated (${theme})`);
    });
}

test('the grouping-suggestions panel is keyboard-operable and returns focus to its trigger on Escape', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-a11y-suggestions-kbd@example.com', 'A11y Suggestions Kbd', 'A11y Suggestions Keyboard Board');
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card one', column: 'improve' } });
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card two', column: 'improve' } });

    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await waitForBoardReady(page);

    const trigger = page.getByRole('button', { name: 'Opciones de agrupación' }).last();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();

    // Select "Agrupaciones sugeridas" via keyboard, not a mouse click — focus the
    // actual `role="menuitem"` control (its `onClick`/keyboard handling live there),
    // not the plain text node inside it.
    await page.getByRole('menuitem', { name: /Agrupaciones sugeridas/ }).focus();
    await page.keyboard.press('Enter');

    const panel = page.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByText(/Grupo 1|No se encontraron sugerencias/)).toBeVisible({ timeout: 90_000 });

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    // Focus must return to the trigger (FloatingFocusManager), not get lost to <body>.
    await expect(trigger).toBeFocused();
});

test('the AI-unavailable state is distinguishable from loading/empty by more than color: distinct role, icon, and copy', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-a11y-suggestions-unavail@example.com', 'A11y Suggestions Unavail', 'A11y Suggestions Unavailable Board');
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card one', column: 'improve' } });
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card two', column: 'improve' } });

    // Sign in and reach the board before registering the network block — only the
    // model host needs to be blocked, and only once we're about to request suggestions.
    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await waitForBoardReady(page);
    await page.route('**huggingface.co/**', route => route.abort('failed'));

    const trigger = page.getByRole('button', { name: 'Opciones de agrupación' }).last();
    await trigger.click();
    await page.getByText('Agrupaciones sugeridas', { exact: true }).click();

    const panel = page.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
    await expect(panel).toBeVisible({ timeout: 15_000 });
    // `role="alert"` (an ARIA live region distinct from static content) plus icon and
    // copy — the distinction is encoded in accessible semantics, not merely a CSS color.
    const alert = panel.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(alert).toContainText('Análisis de IA no disponible');
    await expectNoViolations(page, 'grouping-suggestions panel, unavailable state');
});

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

// --- Keyboard operability of every board menu — feature 033 T058, ----------
// accessibility-interaction-contract.md's "100% of the board's menus and
// popovers ... reachable and operable via keyboard alone (Tab to reach,
// Enter/Space to activate, Escape to dismiss)". The reaction picker is
// already covered above; this covers the other five (the four menus
// consolidated onto `useBoardMenuOverlay`, plus the export popover they
// open into).

test('every board menu is keyboard-operable (Enter to open, Escape to dismiss)', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Menu Keyboard Board');
    await waitForBoardReady(page);
    await addCardToFirstColumn(page, 'Menu keyboard card');
    const card = cardByContent(page, 'Menu keyboard card');

    // Column header (grouping) menu.
    const groupingTrigger = page.getByRole('button', { name: 'Opciones de agrupación' }).first();
    await groupingTrigger.focus();
    await expect(groupingTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);

    // Card menu (convert to action item) — facilitator-only, but the test
    // user is the board owner/facilitator.
    const cardMenuTrigger = card.getByTitle('Convertir en elemento de acción');
    await cardMenuTrigger.focus();
    await expect(cardMenuTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Convertir en Elemento de Acción')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Convertir en Elemento de Acción')).not.toBeVisible();

    // Facilitator menu.
    const facilitatorTrigger = page.getByRole('button', { name: 'Controles de Facilitador' });
    await facilitatorTrigger.focus();
    await expect(facilitatorTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Controles de Facilitador' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Controles de Facilitador' })).toHaveCount(0);

    // Options menu, and the export popover it opens into.
    const optionsTrigger = page.getByRole('button', { name: 'Opciones', exact: true });
    await optionsTrigger.focus();
    await expect(optionsTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    const exportItem = page.getByRole('menuitem', { name: 'Exportar' });
    await expect(exportItem).toBeVisible();
    await exportItem.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

// --- Touch operability of every board menu — feature 033 T058 --------------
// Touch has no `:hover` concept at all (same rationale as spec 031's
// dashboard-manage.spec.ts touch check) — the most direct proof that no
// menu trigger depends on a prior hover/pointer-enter event (FR-012).

test('every board menu is reachable via touch, with no prior hover event', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 1024, height: 900 },
        hasTouch: true,
    });
    const page = await context.newPage();

    // Board + card created via API, not the UI create-flow: this test's own
    // focus is menu reachability under touch emulation, not board creation.
    await signInWithGoogle(page, context);
    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title: 'A11y Menu Touch Board', locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { boardId } = (await createRes.json()) as { boardId: string };
    const cardRes = await page.request.post(`/api/retrospectives/${boardId}/cards`, {
        data: { content: 'Menu touch card', column: 'helped' },
    });
    expect(cardRes.ok()).toBeTruthy();

    await page.goto(`/retro/${boardId}`);
    await waitForBoardReady(page);
    const card = cardByContent(page, 'Menu touch card');

    await page.getByRole('button', { name: 'Opciones de agrupación' }).first().tap();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');

    await card.getByTitle('Convertir en elemento de acción').tap();
    await expect(page.getByText('Convertir en Elemento de Acción')).toBeVisible();
    await page.keyboard.press('Escape');

    await card.locator('button[aria-haspopup="dialog"]').first().tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Controles de Facilitador' }).tap();
    await expect(page.getByRole('dialog', { name: 'Controles de Facilitador' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Opciones', exact: true }).tap();
    const exportItem = page.getByRole('menuitem', { name: 'Exportar' });
    await expect(exportItem).toBeVisible();
    await exportItem.tap();
    await expect(page.getByRole('dialog')).toBeVisible();

    await context.close();
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

// --- Reduced motion for the remaining primary flows — feature 033, T060 ----
// The P1-flow check above (spec 028) only ever exercised add-card and vote,
// despite its name — closes that gap for the flows this feature's redesign
// actually touched: keyboard drag-and-drop, grouping, every board menu, the
// export popover, and the countdown, per accessibility-interaction-contract.md's
// verification procedure step 4.

test('drag-and-drop, grouping, every board menu, export, and the countdown all complete with prefers-reduced-motion enabled', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Reduced Motion Board 2');
    await waitForBoardReady(page);
    await addCardToFirstColumn(page, 'Reduced motion drag card');
    const card = cardByContent(page, 'Reduced motion drag card');

    // Keyboard drag-and-drop (dnd-kit KeyboardSensor: Space to pick up, an
    // arrow key to move, Space to drop) completes with no stuck intermediate
    // state — the card remains visible throughout and after.
    const draggable = card.locator('[aria-roledescription]').first();
    await draggable.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(card).toBeVisible();

    // Grouping (select "group by user") reaches its result — a group header
    // appears — with no animation left mid-flight.
    await page.getByRole('button', { name: 'Opciones de agrupación' }).first().click();
    await page.getByRole('menuitem', { name: /Agrupar por usuario/ }).click();
    await expect(page.getByRole('heading', { name: 'E2E Google User', level: 4 })).toBeVisible();

    // Every board menu still opens and closes.
    for (const { trigger, closeKey } of [
        { trigger: page.getByRole('button', { name: 'Opciones de agrupación' }).first(), closeKey: true },
        { trigger: card.getByTitle('Convertir en elemento de acción'), closeKey: true },
        { trigger: page.getByRole('button', { name: 'Controles de Facilitador' }), closeKey: true },
        { trigger: page.getByRole('button', { name: 'Opciones', exact: true }), closeKey: true },
    ]) {
        await trigger.click();
        if (closeKey) await page.keyboard.press('Escape');
    }

    // Export popover reaches its open state.
    await page.getByRole('button', { name: 'Opciones', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Exportar' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Countdown start/pause both complete (mirrors facilitator-countdown.spec.ts).
    await page.getByRole('button', { name: 'Controles de Facilitador' }).click();
    await page.getByText('5min', { exact: true }).click();
    await page.getByText('Crear Temporizador', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();
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

// --- Board-specific focus visibility — feature 033, T066 --------------------
// The check above only ever exercised the Landing page's tab order; this
// closes the same evidence gap for the board's own menu triggers and a card
// action, per accessibility-interaction-contract.md's "every focusable
// element ... has a visible focus indicator".

test('board menu triggers and card actions are visibly indicated via keyboard focus', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Focus Board');
    await waitForBoardReady(page);
    await addCardToFirstColumn(page, 'Focus visibility card');
    const card = cardByContent(page, 'Focus visibility card');

    const targets = [
        page.getByRole('button', { name: 'Opciones de agrupación' }).first(),
        card.getByTitle('Convertir en elemento de acción'),
        page.getByRole('button', { name: 'Controles de Facilitador' }),
        page.getByRole('button', { name: 'Opciones', exact: true }),
        card.getByRole('button', { name: /^\d+$/ }),
    ];

    for (let i = 0; i < targets.length; i++) {
        // `.focus()` alone doesn't set Chromium's "last input was keyboard" flag,
        // so `:focus-visible` never matches even though the element genuinely has
        // focus — an immediate Tab/Shift+Tab round-trip (landing back on the same
        // element) forces real keyboard-focus semantics without needing to Tab
        // there from a known starting point (targets are scattered across
        // unrelated DOM regions).
        await targets[i].focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        const info = await inspectFocus(page);
        expect(info.focused, `target[${i}] actually received focus`).toBe(true);
        expect(info.hasIndicator, `target[${i}] focused <${info.focused ? info.tag : ''}> has a visible focus indicator`).toBe(true);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 036-options-facilitator-menus, User Story 5: the new mobile entry points
// (FR-013a) — genuinely new coverage below, not updates to existing tests.
// Before this feature neither menu was reachable below the `md` breakpoint
// at all, so none of this had anything to cover.
// ═══════════════════════════════════════════════════════════════════════════

const MOBILE_VIEWPORT = { width: 390, height: 844 };

// --- Keyboard operability of both mobile entry points (FR-009, SC-003) -----

test('both menus\' new mobile entry points are keyboard-operable (Enter to open, Escape to dismiss)', async ({ browser }) => {
    // Sign in and create the board at the context's default viewport first: the
    // shared signInWithGoogle() helper waits for a header element the app hides
    // below the `md` breakpoint (same constraint as board-responsive.spec.ts) —
    // resize down to the real narrow-phone width only after that flow completes.
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Mobile Menu Keyboard Board');
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForBoardReady(page);

    const facilitatorTrigger = page.getByRole('button', { name: 'Controles de Facilitador' });
    await facilitatorTrigger.focus();
    await expect(facilitatorTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Controles de Facilitador' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Controles de Facilitador' })).toHaveCount(0);

    const optionsTrigger = page.getByRole('button', { name: 'Opciones', exact: true });
    await optionsTrigger.focus();
    await expect(optionsTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Opciones' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Opciones' })).toHaveCount(0);

    await context.close();
});

// --- Touch operability of both mobile entry points (FR-009, SC-003) --------

test('both menus\' new mobile entry points are reachable via touch, with no prior hover event', async ({ browser }) => {
    // Same signInWithGoogle() viewport constraint as above — `hasTouch` must be
    // set at context creation, but the narrow viewport itself is applied after.
    const context = await browser.newContext({ hasTouch: true });
    const page = await context.newPage();
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Mobile Menu Touch Board');
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForBoardReady(page);

    await page.getByRole('button', { name: 'Controles de Facilitador' }).tap();
    await expect(page.getByRole('dialog', { name: 'Controles de Facilitador' })).toBeVisible();
    // Always-visible close button, not swipe-only (contracts/accessibility-interaction-contract.md).
    await page.getByRole('dialog', { name: 'Controles de Facilitador' }).getByRole('button', { name: 'Cerrar' }).tap();
    await expect(page.getByRole('dialog', { name: 'Controles de Facilitador' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Opciones', exact: true }).tap();
    const sheet = page.getByRole('dialog', { name: 'Opciones' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Cerrar' }).tap();
    await expect(sheet).toHaveCount(0);

    await context.close();
});

// --- Mobile-viewport WCAG 2.1 AA coverage (FR-011, SC-002, SC-008) ---------
// data-model.md's Board State entity lists every menu-open variant; this
// covers the mobile-specific ones a desktop-width scan can't reach —
// options-open-mobile, two representative facilitator tabs (Controls,
// Notes) via facilitator-open-mobile-{tab}, and facilitator-absent-non-owner
// re-verified at this viewport specifically.

for (const theme of THEMES) {
    test(`Options menu mobile entry point has no WCAG 2.1 AA violations (${theme})`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Mobile Options ${theme}`);
        await page.setViewportSize(MOBILE_VIEWPORT);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);

        await page.getByRole('button', { name: 'Opciones', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Opciones' })).toBeVisible();
        await expectNoViolations(page, `options menu mobile sheet (${theme})`);
        await context.close();
    });

    test(`Facilitator menu mobile entry point (Controls + Notes tabs) has no WCAG 2.1 AA violations (${theme})`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Mobile Facilitator ${theme}`);
        await page.setViewportSize(MOBILE_VIEWPORT);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);

        await page.getByRole('button', { name: 'Controles de Facilitador' }).click();
        const sheet = page.getByRole('dialog', { name: 'Controles de Facilitador' });
        await expect(sheet).toBeVisible();
        await expect(sheet.getByRole('tab', { name: /Controles/i, selected: true })).toBeVisible();
        await expectNoViolations(page, `facilitator menu mobile sheet, Controls tab (${theme})`);

        await sheet.getByRole('tab', { name: /Notas/i }).click();
        await expect(sheet.getByRole('tabpanel')).toBeVisible();
        await expectNoViolations(page, `facilitator menu mobile sheet, Notes tab (${theme})`);
        await context.close();
    });

    test(`Facilitator menu mobile entry point is absent for a non-owner, with no WCAG 2.1 AA violations (${theme})`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Mobile Non-Owner ${theme}`);
        await page.setViewportSize(MOBILE_VIEWPORT);
        const boardId = new URL(page.url()).pathname.split('/').pop();
        await context.close();

        const guestContext = await browser.newContext({ viewport: MOBILE_VIEWPORT });
        const guestPage = await guestContext.newPage();
        await forceTheme(guestPage, theme);
        await guestPage.request.post('/api/auth/test-login', {
            data: { email: `e2e-mobile-nonowner-a11y-${theme}@example.com`, displayName: 'A11y Mobile Non-Owner' },
        });
        await guestPage.goto(`/retro/${boardId}`);
        await waitForBoardReady(guestPage);
        await applyThemeClass(guestPage, theme);
        await expect(guestPage.getByRole('button', { name: 'Controles de Facilitador' })).toHaveCount(0);
        await expectNoViolations(guestPage, `board as non-owner, mobile viewport (${theme})`);
        await guestContext.close();
    });
}

// --- Reduced motion for both new mobile entry points (FR-012) --------------

test('both menus\' new mobile entry points, and switching facilitator tabs within one, complete with prefers-reduced-motion enabled', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Mobile Reduced Motion Board');
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForBoardReady(page);

    await page.getByRole('button', { name: 'Opciones', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Opciones' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Opciones' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Controles de Facilitador' }).click();
    const sheet = page.getByRole('dialog', { name: 'Controles de Facilitador' });
    await expect(sheet).toBeVisible();
    for (const tabName of [/Estado del Equipo/i, /IA/i, /Notas/i, /Controles/i]) {
        await sheet.getByRole('tab', { name: tabName }).click();
        await expect(sheet.getByRole('tabpanel')).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);

    await context.close();
});

// --- Export window (feature 038): WCAG 2.1 AA coverage, keyboard/touch
// operability of its own controls, reduced motion, and locale layout. The
// export dialog's OPEN state was previously exercised (lines above) but
// never axe-scanned, and had no mobile-viewport coverage at all —
// research.md §6's confirmed gap, closed here (FR-010, SC-002, T028).

for (const theme of THEMES) {
    test(`Export window (desktop anchored panel) has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Export Desktop ${theme}`);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);

        await page.getByRole('button', { name: 'Opciones', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Exportar' }).click();
        const dialog = page.getByRole('dialog', { name: 'Exportar Retrospectiva' });
        await expect(dialog).toBeVisible();
        // Board owner by default — the facilitator-only zone is present, exercising
        // that state alongside the rest of the panel's controls.
        await expect(page.getByText('Zona Exclusiva del Facilitador')).toBeVisible();
        await expectNoViolations(page, `export window, desktop anchored panel (${theme})`);
    });

    test(`Export window (mobile bottom sheet) has no WCAG 2.1 AA violations (${theme})`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Export Mobile ${theme}`);
        await page.setViewportSize(MOBILE_VIEWPORT);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);

        await page.getByRole('button', { name: 'Opciones', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Opciones' })).toBeVisible();
        await page.getByRole('button', { name: 'Exportar' }).click();
        await expect(page.getByRole('dialog', { name: 'Exportar Retrospectiva' })).toBeVisible();
        await expectNoViolations(page, `export window, mobile bottom sheet (${theme})`);
        await context.close();
    });

    test(`Export window's facilitator-only zone is absent for a non-owner, with no WCAG 2.1 AA violations (${theme})`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Export NonOwner ${theme}`);
        const boardId = new URL(page.url()).pathname.split('/').pop();
        await context.close();

        const guestContext = await browser.newContext();
        const guestPage = await guestContext.newPage();
        await forceTheme(guestPage, theme);
        await guestPage.request.post('/api/auth/test-login', {
            data: { email: `e2e-export-nonowner-a11y-${theme}@example.com`, displayName: 'A11y Export Non-Owner' },
        });
        await guestPage.goto(`/retro/${boardId}`);
        await waitForBoardReady(guestPage);
        await applyThemeClass(guestPage, theme);

        await guestPage.getByRole('button', { name: 'Opciones', exact: true }).click();
        await guestPage.getByRole('menuitem', { name: 'Exportar' }).click();
        await expect(guestPage.getByRole('dialog', { name: 'Exportar Retrospectiva' })).toBeVisible();
        await expect(guestPage.getByText('Zona Exclusiva del Facilitador')).toHaveCount(0);
        await expectNoViolations(guestPage, `export window, non-owner, facilitator zone absent (${theme})`);
        await guestContext.close();
    });
}

// --- Export window controls: keyboard and touch operability (FR-008, SC-003, T029) ---

test('every control inside the export window is keyboard-operable, desktop presentation', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Export Keyboard Board');
    await waitForBoardReady(page);

    const optionsTrigger = page.getByRole('button', { name: 'Opciones', exact: true });
    await optionsTrigger.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('menuitem', { name: 'Exportar' }).focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Exportar Retrospectiva' });
    await expect(dialog).toBeVisible();

    // Format buttons are reachable and activate via Enter, not just click.
    const txtButton = dialog.getByRole('button', { name: /^TXT/ });
    await txtButton.focus();
    await expect(txtButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(txtButton).toHaveAttribute('aria-pressed', 'true');

    // The document-title field is reachable and editable via keyboard.
    const titleField = dialog.getByLabel('Título personalizado');
    await titleField.focus();
    await page.keyboard.type(' (a11y)');
    await expect(titleField).toHaveValue(/\(a11y\)$/);

    // A checkbox toggles via Space.
    const logoCheckbox = dialog.getByRole('checkbox', { name: /Incluir logo/ });
    await logoCheckbox.focus();
    await expect(logoCheckbox).toBeChecked();
    await page.keyboard.press('Space');
    await expect(logoCheckbox).not.toBeChecked();

    // Escape dismisses the whole panel, no mouse involved anywhere above.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
});

test('every control inside the export window is reachable via touch, mobile presentation, with no prior hover event', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true });
    const page = await context.newPage();
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Export Touch Board');
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForBoardReady(page);

    await page.getByRole('button', { name: 'Opciones', exact: true }).tap();
    await page.getByRole('button', { name: 'Exportar' }).tap();

    const sheet = page.getByRole('dialog', { name: 'Exportar Retrospectiva' });
    await expect(sheet).toBeVisible();

    await sheet.getByRole('button', { name: /^DOCX/ }).tap();
    await expect(sheet.getByRole('button', { name: /^DOCX/ })).toHaveAttribute('aria-pressed', 'true');

    const actionItemsCheckbox = sheet.getByRole('checkbox', { name: /Elementos de Acción/ });
    await expect(actionItemsCheckbox).toBeChecked();
    await actionItemsCheckbox.tap();
    await expect(actionItemsCheckbox).not.toBeChecked();

    // Always-visible close control, not swipe-only.
    await sheet.getByRole('button', { name: 'Cerrar' }).tap();
    await expect(sheet).toHaveCount(0);

    await context.close();
});

// --- Export window: reduced motion (FR-011, T030) ---------------------------

test('the export window (both presentations) and its idle/exporting/success states complete with prefers-reduced-motion enabled', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Export Reduced Motion Board');
    await waitForBoardReady(page);

    // Desktop: open, switch format (exercises the T026 crossfade/tap-scale motion),
    // start and complete a real export, confirm the success banner and the
    // subsequent auto-close both still resolve with nothing stuck mid-animation.
    await page.getByRole('button', { name: 'Opciones', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Exportar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Exportar Retrospectiva' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: /^TXT/ }).click();
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        dialog.getByRole('button', { name: /Exportar TXT/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
    await expect(page.getByText('¡Exportación completada exitosamente!')).toBeVisible();
    // Auto-close (US1 Acceptance Scenario 3) still resolves, not stuck mid-fade.
    await expect(dialog).toHaveCount(0, { timeout: 5_000 });

    // Mobile: open/close the sheet, confirm it too completes with no stuck state.
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.getByRole('button', { name: 'Opciones', exact: true }).click();
    await page.getByRole('button', { name: 'Exportar' }).click();
    const sheet = page.getByRole('dialog', { name: 'Exportar Retrospectiva' });
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
});

// --- Export window: locale layout at narrow/ultra-wide viewports (FR-009, T031) ---
// Edge Cases (spec.md): differing English/Spanish text lengths must not break
// either presentation's layout. English strings run longer than Spanish for
// several of this panel's labels (e.g. "Include RetroRocket logo" vs "Incluir
// logo de RetroRocket"), so this specifically switches language, not just theme.

test('the export window layout holds in English at both a narrow mobile and an ultra-wide desktop viewport', async ({ page, context }) => {
    // Sign in and create the board in the default (Spanish) locale first — the
    // dashboard's create-board flow (auth-helpers.ts) is hardcoded to Spanish
    // copy, same as every other test in this suite. Switch language only after,
    // then reload so this test's own assertions run against English.
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Export Locale Board');
    await page.evaluate(() => window.localStorage.setItem('retrorocket-language', 'en'));
    await page.reload();
    await expect(page.getByText('What helped', { exact: true })).toBeVisible({ timeout: 15_000 });

    // Ultra-wide desktop: the two-column layout must not overflow its own panel.
    await page.setViewportSize({ width: 2200, height: 1000 });
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Export' }).click();
    const dialog = page.getByRole('dialog', { name: 'Export Retrospective' });
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Facilitator Exclusive Zone')).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    // Fixed panel width regardless of viewport — not stretched full-bleed, and
    // its own content never needs to exceed that fixed width to stay legible.
    expect(dialogBox!.width).toBeLessThan(700);
    await page.keyboard.press('Escape');

    // Narrow mobile: the sheet's content must not require horizontal scrolling.
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Export Retrospective' });
    await expect(sheet).toBeVisible();
    const sheetScrollWidth = await sheet.evaluate((el) => el.scrollWidth);
    const sheetClientWidth = await sheet.evaluate((el) => el.clientWidth);
    expect(sheetScrollWidth).toBeLessThanOrEqual(sheetClientWidth + 1); // +1: subpixel rounding
});

// --- Card color picker (spec 037): keyboard/touch operability, WCAG, and
// reduced motion. Trigger reads its accessible name from the currently
// applied color (colors.<slug>_aria, i18next); a brand-new card defaults to
// the neutral color ("Seleccionar color blanco").

test('the color picker (trigger + panel) is keyboard-operable on an existing card and the add-card form', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Color Picker Keyboard Board');
    await waitForBoardReady(page);
    await addCardToFirstColumn(page, 'Color picker keyboard card');
    const card = cardByContent(page, 'Color picker keyboard card');

    // Existing card: focus the trigger, open with Enter, arrow-navigate,
    // select with Enter, and confirm the card's color actually changed. The
    // trigger's accessible name tracks the card's *current* color, so it's
    // re-queried by role rather than captured once by a name that goes
    // stale the moment the color changes.
    const trigger = card.getByRole('button', { name: 'Seleccionar color blanco', exact: true });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(card).toHaveClass(/bg-blue-50/);

    // Escape dismisses without changing the color.
    const triggerNowBlue = card.getByRole('button', { name: 'Seleccionar color azul', exact: true });
    await triggerNowBlue.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card).toHaveClass(/bg-blue-50/);

    // Add-card form: same trigger, reachable and operable identically.
    // The "Agregar" label text is responsive-hidden below the `xl`
    // breakpoint (GroupableColumn.tsx) — target the button's accessible
    // name instead, which is present at every viewport width.
    await page.getByRole('button', { name: 'Agregar' }).first().click();
    const formTrigger = page.getByRole('button', { name: 'Seleccionar color blanco', exact: true }).first();
    await formTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the color picker is reachable via touch, with no prior hover event, on an existing card and the add-card form', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true });
    const page = await context.newPage();
    await signInWithGoogle(page, context);

    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title: 'A11y Color Picker Touch Board', locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { boardId } = (await createRes.json()) as { boardId: string };
    const cardRes = await page.request.post(`/api/retrospectives/${boardId}/cards`, {
        data: { content: 'Color picker touch card', column: 'helped' },
    });
    expect(cardRes.ok()).toBeTruthy();

    await page.goto(`/retro/${boardId}`);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForBoardReady(page);
    const card = cardByContent(page, 'Color picker touch card');

    // No hover/pointer-enter event is fired before this tap — the trigger
    // must already be visible and operable (FR-011a).
    await card.getByRole('button', { name: 'Seleccionar color blanco', exact: true }).tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Seleccionar color azul', exact: true }).tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card).toHaveClass(/bg-blue-50/);

    // "Agregar"'s text label is responsive-hidden below the `xl` breakpoint
    // (GroupableColumn.tsx) — the mobile viewport here relies on the
    // button's accessible name instead.
    await page.getByRole('button', { name: 'Agregar' }).first().tap();
    await page.getByRole('button', { name: 'Seleccionar color blanco', exact: true }).first().tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await context.close();
});

// --- Touch-viewport WCAG 2.1 AA coverage for the color picker (FR-009, SC-002) ---
// No prior coverage exists at a touch viewport for this control — the
// trigger was undiscoverable there before this feature (research.md §2).

for (const theme of THEMES) {
    test(`Color picker panel (open, on an existing card) has no WCAG 2.1 AA violations, touch viewport (${theme})`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Color Picker Mobile ${theme}`);
        await page.setViewportSize(MOBILE_VIEWPORT);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);
        await addCardToFirstColumn(page, `Color picker a11y card ${theme}`);
        const card = cardByContent(page, `Color picker a11y card ${theme}`);

        await card.getByRole('button', { name: 'Seleccionar color blanco', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectNoViolations(page, `color picker panel open, mobile viewport (${theme})`);
        await context.close();
    });
}

// --- Reduced motion (FR-010) ------------------------------------------------

test('opening the color picker and selecting a color complete with prefers-reduced-motion enabled', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Color Picker Reduced Motion Board');
    await waitForBoardReady(page);
    await addCardToFirstColumn(page, 'Reduced motion color card');
    const card = cardByContent(page, 'Reduced motion color card');

    await card.getByRole('button', { name: 'Seleccionar color blanco', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Seleccionar color azul', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card).toHaveClass(/bg-blue-50/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Mi Perfil keyboard-only operability — spec 050-profile-redesign, T036,
// contracts/accessibility-interaction-contract.md: "edit/save display name, sign out,
// link a provider, revoke a connected app ... Tab to reach, Enter/Space to activate,
// with no mouse involved." No `.click()`/`.tap()` appears anywhere below — only
// `.focus()`, `.press('Tab'|'Shift+Tab'|'Enter')`, and `page.keyboard.type()` (real
// per-character key events, unlike `.fill()`, which sets the DOM value programmatically
// without dispatching keyboard events).
//
// `.focus()` reaches each target directly (this file's own established idiom for
// scattered controls — see "board menu triggers and card actions are visibly indicated
// via keyboard focus" above) rather than blind sequential Tabbing through an unspecified
// order; each target is then round-tripped through a real Tab/Shift+Tab pair, which is
// necessary for Chromium's `:focus-visible` keyboard-input flag and also proves the
// element is genuinely reachable within the page's tab order, not merely focusable via
// script.
//
// Split into four separate tests rather than one: sign-out and provider-linking both
// end with a real full-page navigation (session end / OAuth redirect respectively),
// which would prevent continuing to exercise the remaining capabilities on the same
// page afterward. Each test gets Playwright's own fresh page/context by default, so
// splitting introduces no ordering dependency between them.
// ═══════════════════════════════════════════════════════════════════════════

test('editing and saving the display name on Mi Perfil is keyboard-only operable', async ({ page }) => {
    // A dedicated identity: this test permanently renames whoever it signs in as, and
    // every other spec in this suite's single shared emulator run reuses TEST_USER_EMAIL.
    const email = `e2e-a11y-kbd-name-${Date.now()}@example.com`;
    const displayName = 'A11y Keyboard Name User';
    await signInAs(page, email, displayName);
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible();

    // Reach the persistent "Editar" control and activate it with Enter.
    const editButton = page.getByRole('button', { name: 'Editar' });
    await editButton.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(editButton).toBeFocused();
    await page.keyboard.press('Enter');

    // UserProfileForm.tsx moves focus into the field itself once the inline form opens
    // (T021's imperative focus effect) — confirms the reveal is keyboard-reachable too,
    // not just its trigger.
    const nameInput = page.getByLabel('Nombre a mostrar', { exact: false });
    await expect(nameInput).toBeFocused();

    // Replace the field's contents via real keyboard input only (select-all, then type).
    await page.keyboard.press('Control+a');
    const newName = `Renamed via Keyboard ${Date.now()}`;
    await page.keyboard.type(newName);

    // Tab to the Save button and activate with Enter.
    const saveButton = page.getByRole('button', { name: 'Guardar cambios' });
    await saveButton.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Nombre guardado')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(newName).first()).toBeVisible();
});

test('revoking a connected app on Mi Perfil is keyboard-only operable', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    // Seeding a connection uses registerAndConnectMcpClient's real consent-screen click
    // (a setup step, not the interaction under test — the same precedent this file
    // already uses elsewhere, e.g. createBoard()/addCardToFirstColumn() ahead of the
    // board keyboard-operability tests above). Only the revoke action itself, below, is
    // keyboard-only.
    const clientName = `A11y Keyboard Revoke Client ${Date.now()}`;
    await registerAndConnectMcpClient(page, clientName);
    await page.goto('/perfil');

    const revokeButton = page.getByRole('button', { name: `Revocar ${clientName}` });
    await revokeButton.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(revokeButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByText(clientName)).toHaveCount(0, { timeout: 15_000 });
});

test('linking a provider on Mi Perfil is keyboard-only operable, up to triggering the OAuth redirect', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    // startLinkProvider() is a synchronous window.location.assign to this app's own
    // /api/auth/link/:provider endpoint, which itself 302-redirects to the real
    // provider's consent screen — per the task's own scope ("up to triggering the
    // redirect — you don't need to complete the OAuth flow"), intercept that first
    // same-origin hop and fulfill it locally instead of letting the browser actually
    // leave for github.com. This proves the keyboard activation reached and triggered
    // the real redirect flow without depending on an external provider's UI.
    let linkRequestUrl: string | null = null;
    await page.route('**/api/auth/link/github**', async (route) => {
        linkRequestUrl = route.request().url();
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>link-redirect-stub</body></html>' });
    });

    // GitHub is the only provider the shared TEST_USER_EMAIL account hasn't linked
    // (profile.spec.ts's own regression test relies on the same fact).
    const githubRow = page.getByRole('listitem').filter({ hasText: 'GitHub' });
    const linkButton = githubRow.getByRole('button', { name: 'Vincular' });
    await linkButton.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(linkButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect.poll(() => linkRequestUrl, { timeout: 10_000 }).toContain('/api/auth/link/github');
});

test('signing out from Mi Perfil is keyboard-only operable', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    const signOutButton = page.getByRole('button', { name: 'Cerrar Sesión' });
    await signOutButton.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(signOutButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Continuar con Google', { exact: true })).toBeVisible({ timeout: 15_000 });
});

// --- Teams: empty state (T045) and read-only roster view (T044) ------------
// 054-team-management, T047 — closes the gap the rest of this file's own comments
// establish as the pattern: every new state introduced by a feature needs its own
// axe-core scan in both themes, not just the happy path. Neither /teams' zero-teams
// empty state nor /teams/:id's non-owner read-only view had any WCAG coverage before
// this task; both are newly built or newly text-bearing (the empty state's CTA, the
// read-only notice) as of T044-T046, so an inherited pass from a differently-shaped
// predecessor state can't be assumed.

async function createTeamViaApiForA11y(page: Page, name: string): Promise<string> {
    const res = await page.request.post('/api/teams', { data: { name } });
    if (!res.ok()) {
        throw new Error(`create team failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { teamId: string };
    return body.teamId;
}

for (const theme of THEMES) {
    test(`Teams overview zero-teams empty state has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        // A fresh, never-used identity per theme — genuinely zero team memberships,
        // not an assumption about shared-account state (same rationale as
        // team-management.spec.ts's own empty-state E2E test).
        await signInAs(page, `e2e-a11y-teams-empty-${theme}@example.com`, `A11y Teams Empty ${theme}`);

        await page.goto('/teams');
        await applyThemeClass(page, theme);
        await expect(page.getByText('Todavía no perteneces a ningún equipo.')).toBeVisible({ timeout: 15_000 });
        await expectNoViolations(page, `/teams empty state (${theme})`);
    });

    test(`TeamDetail read-only roster view (non-owner member) has no WCAG 2.1 AA violations (${theme})`, async ({ browser }) => {
        const ownerContext = await browser.newContext();
        const ownerPage = await ownerContext.newPage();
        const ownerEmail = `e2e-a11y-team-owner-${theme}@example.com`;
        const memberEmail = `e2e-a11y-team-member-${theme}@example.com`;

        // The member's own profile doc must exist before the owner can add them by
        // email (findUserByEmail only matches profiles created by an actual login) —
        // sign them in once first, in their own context, same as
        // team-management.spec.ts's loginViaApi step.
        const memberContext = await browser.newContext();
        const memberPage = await memberContext.newPage();
        await signInAs(memberPage, memberEmail, `A11y Team Member ${theme}`);

        await signInAs(ownerPage, ownerEmail, `A11y Team Owner ${theme}`);
        const teamId = await createTeamViaApiForA11y(ownerPage, `A11y Read-Only Roster ${theme}`);
        const addRes = await ownerPage.request.post(`/api/teams/${teamId}/members`, { data: { email: memberEmail } });
        if (!addRes.ok()) {
            throw new Error(`add member failed: ${addRes.status()} ${await addRes.text()}`);
        }
        await ownerContext.close();

        await forceTheme(memberPage, theme);
        await memberPage.goto(`/teams/${teamId}`);
        // Read-only notice (T044/T046) proves the non-owner branch actually rendered,
        // not just that the page loaded.
        await expect(
            memberPage.getByText('Eres miembro de este equipo. Solo el propietario puede añadir o eliminar miembros.'),
        ).toBeVisible({ timeout: 15_000 });
        await applyThemeClass(memberPage, theme);
        await expectNoViolations(memberPage, `/teams/:id read-only roster view (${theme})`);

        await memberContext.close();
    });
}

// --- Guide: overview and a topic page (both themes) — 057-getting-started-guide,
// tasks.md T041 (Phase 7: Polish, Constitution Principle VIII, NON-NEGOTIABLE).
// `/guide` and `/guide/:topicSlug` are public surfaces reachable without sign-in
// (FR-002) — no auth fixture needed here, same rationale as the Landing scan at
// the top of this file. Covers both the no-topic-selected overview state
// (GuidePage.tsx's default branch) and a real topic page (GuideTopicContent.tsx),
// so the side nav's category headings/links and the topic body/heading structure
// are both exercised by axe, not just the overview shell.

for (const theme of THEMES) {
    test(`Guide overview has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.goto('/guide');
        await applyThemeClass(page, theme);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoViolations(page, `/guide overview (${theme})`);
    });

    test(`Guide topic page (Anonymous Mode) has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.goto('/guide/anonymous-mode');
        await applyThemeClass(page, theme);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoViolations(page, `/guide/anonymous-mode (${theme})`);
    });
}
