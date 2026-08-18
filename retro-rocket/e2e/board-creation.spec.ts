import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard, TEST_USER_DISPLAY_NAME } from './fixtures/auth-helpers';
import { expectNoHorizontalOverflow, addCardToFirstColumn, cardByContent } from './fixtures/board';
import { blockFirestoreRequests } from './fixtures/network';

/** Critical flow: an authenticated user creates a new retrospective board. */
test('authenticated user creates a new retrospective board', async ({ page, context }) => {
    await signInWithGoogle(page, context);

    await createBoard(page, 'E2E Board Creation Test');

    await expect(page).toHaveURL(/\/retro\//);
    await expect(page.getByText('E2E Board Creation Test')).toBeVisible();
    // Default template columns
    await expect(page.getByText('Qué me ayudó', { exact: true })).toBeVisible();
    await expect(page.getByText('Qué me retrasó', { exact: true })).toBeVisible();
    await expect(page.getByText('Qué podemos hacer mejor', { exact: true })).toBeVisible();
});

/** US2 / SC-002: columns fit without a horizontal scrollbar for 3 and 4 columns. */
test('board columns fit the viewport with no horizontal scroll (3 and 4 columns)', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E No Horizontal Scroll Test');

    const grid = page.getByTestId('board-grid');
    await expect(grid).toBeVisible();

    // 3 columns at two common desktop widths → no horizontal overflow.
    for (const width of [1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expectNoHorizontalOverflow(grid);
        await expectNoHorizontalOverflow(page.locator('body'));
    }

    // Enable the action-items column (4 columns) via the facilitator controls.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Controles de Facilitador' }).click();
    await page.getByText('Mostrar elementos de acción', { exact: true }).click();
    // Close the menu (press Escape) so it doesn't overlap measurements.
    await page.keyboard.press('Escape');

    // Still no horizontal overflow with four columns.
    await expectNoHorizontalOverflow(grid);
    await expectNoHorizontalOverflow(page.locator('body'));

    // Below the lg breakpoint, columns stack (single column) — still no h-scroll.
    await page.setViewportSize({ width: 800, height: 900 });
    await expectNoHorizontalOverflow(page.locator('body'));
});

/** 017 / SC-002: creating a board (for every template) reaches only /api/boards, never Firestore directly. */
for (const [templateLabel, title] of [
    ['Plantilla por defecto', 'E2E Create Default Template'],
    ['Mad, Sad, Glad', 'E2E Create Mad Sad Glad Template'],
    ['Start, Stop, Continue', 'E2E Create Start Stop Continue Template'],
] as const) {
    test(`creating a "${templateLabel}" board goes only through the backend`, async ({ page, context }) => {
        await signInWithGoogle(page, context);

        await page.getByText('Nuevo Tablero', { exact: true }).click();
        // Click the visible template label text (not the sr-only radio itself — the
        // motion.label wrapper animates and can intercept pointer events on the input).
        await page.getByText(templateLabel, { exact: true }).click();
        await page.getByText('Siguiente', { exact: true }).click();
        await page.locator('#boardTitle').fill(title);

        // FR-001: creating a board must not require any direct Firestore access.
        // Block the emulator and confirm the create request still succeeds through the
        // backend alone — more robust than recording requests and asserting none
        // occurred, since client-side navigation into the (out-of-scope) board detail
        // page can fire its own legitimate Firestore listeners essentially
        // simultaneously with the create response, racing unpredictably against any
        // attempt to stop recording at the network-event level.
        const unblock = await blockFirestoreRequests(page);
        const [createResponse] = await Promise.all([
            page.waitForResponse((res) => res.url().includes('/api/boards') && res.request().method() === 'POST'),
            page.getByRole('button', { name: 'Crear', exact: true }).click(),
        ]);
        expect(createResponse.ok()).toBeTruthy();
        await unblock();

        await page.waitForURL(/\/retro\//, { timeout: 30_000 });
        await expect(page.getByText(title)).toBeVisible();
    });
}

// 051-anonymous-board-mode, User Story 1 (T057): the create-board flow's "details"
// step offers an anonymity checkbox defaulted off; a board created without touching it
// opens non-anonymous (author names shown as today), and a board created with the
// checkbox switched on opens already anonymous (no author names, the persistent
// indicator visible) — quickstart.md §2, spec.md US1 Acceptance Scenarios 1-3
// (FR-001, FR-002, SC-001).
test('the create-board anonymity checkbox defaults off, and switching it on creates a board that opens already anonymous', async ({ page, context }) => {
    await signInWithGoogle(page, context);

    // --- Board 1: reach the "details" step and leave the checkbox at its default. ---
    await page.getByText('Nuevo Tablero', { exact: true }).click();
    await page.getByText('Siguiente', { exact: true }).click();

    const anonymityCheckbox = page.locator('#boardIsAnonymous');
    await expect(anonymityCheckbox).toBeVisible();
    await expect(anonymityCheckbox).not.toBeChecked();

    const namedTitle = `E2E Non-Anonymous Board ${Date.now()}`;
    await page.locator('#boardTitle').fill(namedTitle);
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await page.waitForURL(/\/retro\//, { timeout: 30_000 });
    await expect(page.getByText(namedTitle)).toBeVisible();

    // Not anonymous: no persistent indicator, and a card shows its author's name
    // exactly as today.
    await expect(page.getByText('Tablero anónimo')).toHaveCount(0);
    await addCardToFirstColumn(page, 'Named board card');
    await expect(cardByContent(page, 'Named board card').getByText(TEST_USER_DISPLAY_NAME)).toBeVisible();

    // --- Board 2: switch the checkbox on before creating. ---
    await page.goto('/dashboard');
    await page.getByText('Nuevo Tablero', { exact: true }).click();
    await page.getByText('Siguiente', { exact: true }).click();

    const anonTitle = `E2E Anonymous Board ${Date.now()}`;
    await page.locator('#boardTitle').fill(anonTitle);
    await page.locator('#boardIsAnonymous').check();
    await expect(page.locator('#boardIsAnonymous')).toBeChecked();
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await page.waitForURL(/\/retro\//, { timeout: 30_000 });
    await expect(page.getByText(anonTitle)).toBeVisible();

    // Opens already anonymous: the persistent indicator is visible from the start, and
    // a newly added card shows no author name at all.
    await expect(page.getByText('Tablero anónimo')).toBeVisible({ timeout: 10_000 });
    await addCardToFirstColumn(page, 'Anonymous board card');
    await expect(cardByContent(page, 'Anonymous board card').getByText(TEST_USER_DISPLAY_NAME)).toHaveCount(0);
});
