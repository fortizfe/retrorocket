import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoardViaApi } from './fixtures/auth-helpers';

// FR-001/SC-002 (zero direct Firestore access) is verified statically and
// deterministically for the whole Dashboard, including rename/delete, by
// src/test/architecture/dashboard-no-firestore.test.ts, plus dynamically for the
// representative create flow in board-creation.spec.ts. This spec focuses on
// rename/delete's functional correctness, which E2E is better suited to verify.

/** 017 / US4: owner renames and deletes a board via the backend. */
test('owner renames and deletes a board', async ({ page, context }) => {
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

    // The edit/delete buttons only reveal on hover (opacity-0 group-hover:opacity-100,
    // transition-opacity duration-200, in BoardCard.tsx). A mouse click here — even
    // force:true — is unreliable: the click can land while the card's own CSS
    // transition/transform is still settling, so it's dispatched but never reaches
    // React's delegated handler. Focus + keyboard activation sidesteps that entirely.
    const card = page.locator('.group', { has: page.getByText(originalTitle, { exact: true }) });
    await card.hover();

    // Rename. Note: EditRetrospectiveModal's title field uses Input's own `label` prop,
    // which renders a <label> with no htmlFor (pre-existing, unrelated a11y gap) — so
    // getByLabel() can't find it; getByPlaceholder is used instead.
    await card.getByLabel('Editar tablero').focus();
    await page.keyboard.press('Enter');
    await page.getByPlaceholder('Título de la retrospectiva').fill(renamedTitle);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Tablero actualizado correctamente')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(renamedTitle)).toBeVisible();

    // Delete.
    const renamedCard = page.locator('.group', { has: page.getByText(renamedTitle, { exact: true }) });
    await renamedCard.hover();
    await renamedCard.getByLabel('Eliminar tablero').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByText(renamedTitle)).not.toBeVisible({ timeout: 30_000 });

    // Persists after reload.
    await page.reload();
    await expect(page.getByText(renamedTitle)).not.toBeVisible();
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
    // Scope to this specific board's card — the shared test account may own many other
    // boards from earlier tests in this run, each with its own edit/delete buttons.
    const card = page.locator('.group', { has: page.getByText(boardTitle, { exact: true }) });
    await expect(card).toBeVisible();
    await expect(card.getByLabel('Editar tablero')).toHaveCount(0);
    await expect(card.getByLabel('Eliminar tablero')).toHaveCount(0);
});
