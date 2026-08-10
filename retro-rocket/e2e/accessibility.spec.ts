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
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    const page = await context.newPage();
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Mobile Menu Keyboard Board');
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
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT, hasTouch: true });
    const page = await context.newPage();
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Mobile Menu Touch Board');
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
        const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Mobile Options ${theme}`);
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);

        await page.getByRole('button', { name: 'Opciones', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Opciones' })).toBeVisible();
        await expectNoViolations(page, `options menu mobile sheet (${theme})`);
        await context.close();
    });

    test(`Facilitator menu mobile entry point (Controls + Notes tabs) has no WCAG 2.1 AA violations (${theme})`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Mobile Facilitator ${theme}`);
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
        const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
        const page = await context.newPage();
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Mobile Non-Owner ${theme}`);
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
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Mobile Reduced Motion Board');
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
