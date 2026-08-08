import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoardViaApi } from './fixtures/auth-helpers';

// FR-001/SC-002 (zero direct Firestore access) is verified statically and
// deterministically for the whole Dashboard, including rename/delete, by
// src/test/architecture/dashboard-no-firestore.test.ts, plus dynamically for the
// representative create flow in board-creation.spec.ts. This spec focuses on
// rename/delete's functional correctness, which E2E is better suited to verify.

/**
 * 017 / US3 / FR-015 (spec 031 — corrects a pre-existing defect): owner
 * renames and deletes a board via controls reachable by keyboard alone,
 * with no hover required at all. Pre-redesign, BoardCard.tsx's edit/delete
 * buttons only revealed on `:hover` (opacity-0 group-hover:opacity-100),
 * so this test used to have to `.hover()` the card before focusing —
 * BoardRow's rename/delete controls are always visible, so that workaround
 * is gone; focusing and activating by keyboard alone is now sufficient
 * proof of reachability.
 */
test('owner renames and deletes a board via keyboard alone, no hover required', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    const originalTitle = `E2E Manage Rename Target ${Date.now()}`;
    const renamedTitle = `E2E Manage Renamed ${Date.now()}`;
    // Set up via a direct API call, not the create-board UI (already covered by
    // board-creation.spec.ts) — this test's own focus is rename/delete.
    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title: originalTitle, locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();
    await page.goto('/dashboard');

    const row = page.locator('li', { has: page.getByText(originalTitle, { exact: true }) });
    await expect(row).toBeVisible();

    // No .hover() anywhere in this test: rename/delete are always-visible
    // (spec 031 FR-015), reachable via keyboard focus + Enter alone.
    await row.getByLabel('Editar tablero').focus();
    await page.keyboard.press('Enter');

    // Input's <label>/<input> are now programmatically associated (spec 031
    // fixed the pre-existing htmlFor gap) — getByLabel works directly.
    await page.getByLabel('Título', { exact: true }).fill(renamedTitle);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Tablero actualizado correctamente')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(renamedTitle)).toBeVisible();

    // Delete — same keyboard-only pattern, no hover.
    const renamedRow = page.locator('li', { has: page.getByText(renamedTitle, { exact: true }) });
    await renamedRow.getByLabel('Eliminar tablero').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByText(renamedTitle)).not.toBeVisible({ timeout: 30_000 });

    // Persists after reload.
    await page.reload();
    await expect(page.getByText(renamedTitle)).not.toBeVisible();
});

/**
 * Touch has no `:hover` concept at all — a touch-emulated viewport is the
 * most direct proof that rename/delete don't depend on it (spec 031 FR-015).
 */
test('owner reaches rename/delete on a touch-emulated viewport, with no prior hover event', async ({ browser }) => {
    // Tablet-sized (>=768px, the `md` breakpoint) rather than phone-sized: the
    // shared signInWithGoogle() helper waits for a header element the app
    // hides below `md` (unrelated to this test's own touch/hover concern) —
    // `hasTouch` alone is what actually matters here, not a narrow viewport.
    const context = await browser.newContext({
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
        isMobile: true,
    });
    const page = await context.newPage();

    await signInWithGoogle(page, context);
    const title = `E2E Manage Touch Target ${Date.now()}`;
    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title, locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();

    await page.goto('/dashboard');
    const row = page.locator('li', { has: page.getByText(title, { exact: true }) });
    await expect(row).toBeVisible();

    // .tap() dispatches touch events only — no mouseenter/hover is fired,
    // so this fails against a hover-only implementation and passes here.
    await row.getByLabel('Eliminar tablero').tap();
    await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toBeVisible();

    await context.close();
});

/** 017 / US4 AS-3: a non-owner has no rename/delete affordance on a board they only joined. */
test('a non-owner participant has no rename or delete affordance', async ({ page, context, request }) => {
    // A genuinely distinct owner identity, and the join itself, are both set up via
    // direct API calls — this test's own focus is the absence of rename/delete
    // affordances, not the create/join flows (covered elsewhere).
    const boardTitle = `E2E Manage Not My Board ${Date.now()}`;
    const boardId = await createBoardViaApi(request, 'e2e-manage-owner@example.com', 'E2E Manage Owner', boardTitle);

    await signInWithGoogle(page, context);
    const joinRes = await page.request.post(`/api/boards/${boardId}/join`);
    expect(joinRes.ok()).toBeTruthy();

    await page.goto('/dashboard');
    // Scope to this specific board's row — the shared test account may own many other
    // boards from earlier tests in this run, each with its own edit/delete buttons.
    const row = page.locator('li', { has: page.getByText(boardTitle, { exact: true }) });
    await expect(row).toBeVisible();
    await expect(row.getByLabel('Editar tablero')).toHaveCount(0);
    await expect(row.getByLabel('Eliminar tablero')).toHaveCount(0);
});
