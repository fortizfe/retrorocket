import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';
import { expectNoHorizontalOverflow } from './fixtures/board';

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
