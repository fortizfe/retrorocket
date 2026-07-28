import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoardViaApi } from './fixtures/auth-helpers';

// FR-001/SC-002 (zero direct Firestore access) is verified statically and
// deterministically for the whole Dashboard, including this join flow, by
// src/test/architecture/dashboard-no-firestore.test.ts, plus dynamically for the
// representative create flow in board-creation.spec.ts. This spec focuses on the join
// flow's functional correctness, which E2E is better suited to verify.

/** 017 / US3: joining a board by ID via the backend works, and a re-join is a no-op. */
test('a user joins a board by ID, and a re-join is a no-op', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-join-owner@example.com', 'E2E Join Owner', 'E2E Join Target Board');

    await signInWithGoogle(page, context);
    await page.goto('/dashboard');

    await page.getByText('Unirse a Retrospectiva', { exact: true }).first().click();
    await page.getByLabel('ID del Tablero').fill(boardId);
    const [joinResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes(`/api/boards/${boardId}/join`)),
        page.getByRole('button', { name: 'Unirse', exact: true }).click(),
    ]);
    expect(joinResponse.ok()).toBeTruthy();
    await page.waitForURL(new RegExp(`/retro/${boardId}`), { timeout: 30_000 });

    // Re-join the same board: no duplicate membership, still lands in the board.
    await page.goto('/dashboard');
    await page.getByText('Unirse a Retrospectiva', { exact: true }).first().click();
    await page.getByLabel('ID del Tablero').fill(boardId);
    const [rejoinResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes(`/api/boards/${boardId}/join`)),
        page.getByRole('button', { name: 'Unirse', exact: true }).click(),
    ]);
    expect(rejoinResponse.ok()).toBeTruthy();
    await page.waitForURL(new RegExp(`/retro/${boardId}`), { timeout: 30_000 });
});

/** 017 / US3 AS-2: an invalid/nonexistent board ID shows a clear, visible error. */
test('joining a nonexistent board id shows a visible error', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.goto('/dashboard');

    await page.getByText('Unirse a Retrospectiva', { exact: true }).first().click();
    await page.getByLabel('ID del Tablero').fill('this-board-does-not-exist');
    await page.getByRole('button', { name: 'Unirse', exact: true }).click();

    await expect(page.getByText(/no existe|no disponible/i).first()).toBeVisible({ timeout: 30_000 });
});
