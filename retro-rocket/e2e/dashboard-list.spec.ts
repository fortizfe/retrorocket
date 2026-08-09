import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoardViaApi } from './fixtures/auth-helpers';
import { seedBoards, boardTitleAt } from './fixtures/seedBoards';
import { expectNoHorizontalOverflow } from './fixtures/board';

// FR-001/SC-002 (zero direct Firestore access) is verified statically and
// deterministically for the whole Dashboard, including this list screen, by
// src/test/architecture/dashboard-no-firestore.test.ts, plus dynamically for the
// representative create flow in board-creation.spec.ts. This spec focuses on the list
// screen's functional correctness, which E2E is better suited to verify.

/** 017 / US1: the Dashboard lists boards the user created and boards they joined. */
test('dashboard lists a user’s created and joined boards, correctly categorized', async ({ page, context, request }) => {
    await signInWithGoogle(page, context);

    // Both boards are set up via direct API calls, with no UI or extra browser context:
    // this test verifies the list screen's rendering, not the create/join flows
    // themselves (covered by board-creation.spec.ts and board-join.spec.ts), so keeping
    // its own footprint small avoids adding to this suite's shared, cumulative load
    // (playwright.config.ts: one dev server/emulator/browser worker for the whole run).
    const createdTitle = `E2E List Created Board ${Date.now()}`;
    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title: createdTitle, locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();

    // A genuinely distinct second identity creates a board and the default test user
    // joins it, so the list also exercises the "joined" category, not just "created".
    const joinedTitle = `E2E List Joined Board ${Date.now()}`;
    const joinedBoardId = await createBoardViaApi(request, 'e2e-list-owner@example.com', 'E2E List Owner', joinedTitle);

    const joinRes = await page.request.post(`/api/boards/${joinedBoardId}/join`);
    expect(joinRes.ok()).toBeTruthy();

    await page.goto('/dashboard');
    await expect(page.getByText(createdTitle)).toBeVisible();
    await expect(page.getByText(joinedTitle)).toBeVisible();

    // Role badges scoped to each specific row (dashboard.boardCard.creator / .joined) —
    // the shared test account may own/have joined other boards from earlier tests.
    // Spec 031: BoardCard/.group (grid-only) replaced by a single-layout BoardRow (<li>).
    const createdRow = page.locator('li', { has: page.getByText(createdTitle, { exact: true }) });
    const joinedRow = page.locator('li', { has: page.getByText(joinedTitle, { exact: true }) });
    await expect(createdRow.getByText('Creador', { exact: true })).toBeVisible();
    await expect(joinedRow.getByText('Unido', { exact: true })).toBeVisible();
});

/** 017 / FR-008: a backend/network failure while loading boards surfaces a clear error, not a silent empty list. */
test('a failed board list request shows an error state, not a silently empty dashboard', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.route('**/api/boards', (route) => route.abort('failed'));

    await page.goto('/dashboard');

    // Spec 031: the error copy no longer contains the literal word "error"
    // (better UX copy) — assert via the semantic role instead.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
});

/**
 * Spec 031 / FR-012 (corrects a pre-existing defect): every board must stay
 * reachable regardless of count — previously, boards beyond page 1 were
 * unreachable in the default grid view because pagination only rendered in
 * list view. The redesign has a single layout with pagination always
 * rendered, so this must hold at real scale (SC-001's 200+-board target).
 */
test('a board far beyond the first page remains reachable and openable at 200+ boards', async ({ page, context }) => {
    test.setTimeout(120_000);
    await signInWithGoogle(page, context);
    const ids = await seedBoards(page, 210, { titlePrefix: 'Reachability Board' });
    const lastTitle = boardTitleAt(209, 'Reachability Board');

    await page.goto('/dashboard');
    await expect(page.getByPlaceholder(/buscar|search/i)).toBeVisible({ timeout: 30_000 });

    // Scope to just the 210 seeded boards — the shared test account may
    // carry boards over from earlier tests/specs in this run. The scope
    // segmented control's counts always reflect the *unfiltered* total
    // (by design — data-model.md's Board List Query), so assert the
    // filtered count via the pagination "showing X of Y" text instead.
    await page.getByPlaceholder(/buscar|search/i).fill('Reachability Board');
    await expect(page.getByText(/210/).first()).toBeVisible({ timeout: 15_000 });

    // Sort by name ascending so the seeded, zero-padded titles are in a
    // known order, then page forward until the last one is reachable.
    await page.getByTitle('Nombre').click();
    await expect(page.getByText(lastTitle)).not.toBeVisible();

    let opened = false;
    for (let i = 0; i < 30 && !opened; i++) {
        if (await page.getByText(lastTitle).isVisible().catch(() => false)) {
            opened = true;
            break;
        }
        const nextButton = page.getByRole('button', { name: /siguiente|next/i }).last();
        if (!(await nextButton.isEnabled().catch(() => false))) break;
        await nextButton.click();
    }

    await expect(page.getByText(lastTitle)).toBeVisible();
    await page.getByText(lastTitle).click();
    await page.waitForURL(new RegExp(`/retro/${ids[209]}`));
});

/** Spec 031 FR-020: the redesigned dashboard stays legible and usable at both viewport extremes. */
for (const [label, viewport] of [
    ['narrow mobile', { width: 360, height: 740 }],
    ['ultra-wide desktop', { width: 2560, height: 1440 }],
] as const) {
    test(`dashboard remains usable with no horizontal overflow on a ${label} viewport`, async ({ page, context }) => {
        // Sign in at the default (desktop-width) viewport first — the shared
        // signInWithGoogle() helper waits for a header element the app hides
        // below the `md` breakpoint, unrelated to this test's own concern —
        // then resize down/up to the target viewport before navigating.
        await signInWithGoogle(page, context);
        await page.setViewportSize(viewport);
        const title = `E2E Responsive Board ${Date.now()}`;
        const createRes = await page.request.post('/api/boards', {
            data: { templateId: 'default', title, locale: 'es' },
        });
        expect(createRes.ok()).toBeTruthy();

        await page.goto('/dashboard');
        await expect(page.getByText(title)).toBeVisible();
        await expectNoHorizontalOverflow(page.locator('body'));

        // Core capabilities remain reachable — not just "not visibly broken".
        await expect(page.getByPlaceholder(/buscar|search/i)).toBeVisible();
        const row = page.locator('li', { has: page.getByText(title, { exact: true }) });
        await expect(row.getByLabel('Editar tablero')).toBeVisible();
        await expect(row.getByLabel('Eliminar tablero')).toBeVisible();
    });
}
