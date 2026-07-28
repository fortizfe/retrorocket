import { test, expect } from '@playwright/test';
import { signInWithGoogle, signInAs, createBoard } from './fixtures/auth-helpers';

// FR-001/SC-002 (zero direct Firestore access) is verified statically and
// deterministically for the whole Dashboard, including this list screen, by
// src/test/architecture/dashboard-no-firestore.test.ts, plus dynamically for the
// representative create flow in board-creation.spec.ts. This spec focuses on the list
// screen's functional correctness, which E2E is better suited to verify.

/** 017 / US1: the Dashboard lists boards the user created and boards they joined. */
test('dashboard lists a user’s created and joined boards, correctly categorized', async ({ page, context, browser }) => {
    await signInWithGoogle(page, context);

    const createdTitle = `E2E List Created Board ${Date.now()}`;
    await createBoard(page, createdTitle);

    // A genuinely distinct second identity creates a board and the default test user
    // joins it (via a direct API call — this test verifies the list screen, not the
    // join flow itself, covered by board-join.spec.ts), so the list also exercises the
    // "joined" category, not just "created".
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await signInAs(secondPage, 'e2e-list-owner@example.com', 'E2E List Owner');
    const joinedTitle = `E2E List Joined Board ${Date.now()}`;
    await createBoard(secondPage, joinedTitle);
    const joinedBoardId = secondPage.url().split('/retro/')[1];
    await secondContext.close();

    const joinRes = await page.request.post(`/api/boards/${joinedBoardId}/join`);
    expect(joinRes.ok()).toBeTruthy();

    await page.goto('/dashboard');
    await expect(page.getByText(createdTitle)).toBeVisible();
    await expect(page.getByText(joinedTitle)).toBeVisible();

    // Role badges scoped to each specific card (dashboard.boardCard.creator / .joined) —
    // the shared test account may own/have joined other boards from earlier tests.
    const createdCard = page.locator('.group', { has: page.getByText(createdTitle, { exact: true }) });
    const joinedCard = page.locator('.group', { has: page.getByText(joinedTitle, { exact: true }) });
    await expect(createdCard.getByText('Creador', { exact: true })).toBeVisible();
    await expect(joinedCard.getByText('Unido', { exact: true })).toBeVisible();
});

/** 017 / FR-008: a backend/network failure while loading boards surfaces a clear error, not a silent empty list. */
test('a failed board list request shows an error state, not a silently empty dashboard', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.route('**/api/boards', (route) => route.abort('failed'));

    await page.goto('/dashboard');

    await expect(page.getByText(/error/i).first()).toBeVisible({ timeout: 10_000 });
});
