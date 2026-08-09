import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent, expectNoHorizontalOverflow } from './fixtures/board';

/**
 * Responsive-layout checks for the redesigned board (feature 033, T059,
 * FR-016). `useBoardGridColumns.ts` stacks columns (`grid-cols-1`) below the
 * `lg` breakpoint (1024px) and lays them out side-by-side (`lg:grid-cols-N`)
 * at or above it — these prove both ends of that range render usably, with
 * no forced horizontal scroll.
 */

test('columns stack vertically on a narrow mobile viewport, with no horizontal overflow', async ({ browser }) => {
    // Sign in and create the board at a default-sized viewport first: the
    // shared signInWithGoogle() helper waits for a header element the app
    // hides below the `md` breakpoint (same constraint noted in
    // dashboard-manage.spec.ts's own touch test) — resize down to a real
    // narrow-phone width only after those UI flows complete.
    const context = await browser.newContext();
    const page = await context.newPage();

    await signInWithGoogle(page, context);
    await createBoard(page, 'Responsive Narrow Board');
    await addCardToFirstColumn(page, 'Narrow viewport card');
    await page.setViewportSize({ width: 375, height: 812 });

    const helpedHeading = page.getByText('Qué me ayudó', { exact: true });
    const hinderedHeading = page.getByText('Qué me retrasó', { exact: true });
    await expect(helpedHeading).toBeVisible();
    await expect(hinderedHeading).toBeVisible();

    // Stacked (grid-cols-1) means the second column's heading sits below the
    // first's, not beside it.
    const helpedBox = await helpedHeading.boundingBox();
    const hinderedBox = await hinderedHeading.boundingBox();
    expect(helpedBox).not.toBeNull();
    expect(hinderedBox).not.toBeNull();
    expect(hinderedBox!.y).toBeGreaterThan(helpedBox!.y + helpedBox!.height);

    await expectNoHorizontalOverflow(page.locator('body'));
    const card = cardByContent(page, 'Narrow viewport card');
    await expect(card).toBeVisible();

    await context.close();
});

test('the board renders with no horizontal overflow on an ultra-wide desktop viewport', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
    const page = await context.newPage();

    await signInWithGoogle(page, context);
    await createBoard(page, 'Responsive Ultra-Wide Board');
    await addCardToFirstColumn(page, 'Ultra-wide viewport card');

    const helpedHeading = page.getByText('Qué me ayudó', { exact: true });
    const hinderedHeading = page.getByText('Qué me retrasó', { exact: true });
    await expect(helpedHeading).toBeVisible();
    await expect(hinderedHeading).toBeVisible();

    // Side-by-side (lg:grid-cols-N) means the columns share a row instead of
    // stacking — the second column's heading sits beside the first's, not below.
    const helpedBox = await helpedHeading.boundingBox();
    const hinderedBox = await hinderedHeading.boundingBox();
    expect(helpedBox).not.toBeNull();
    expect(hinderedBox).not.toBeNull();
    expect(Math.abs(hinderedBox!.y - helpedBox!.y)).toBeLessThan(10);

    await expectNoHorizontalOverflow(page.locator('body'));
    const card = cardByContent(page, 'Ultra-wide viewport card');
    await expect(card).toBeVisible();

    await context.close();
});

// The `lg` breakpoint boundary itself (1024px) is where the 4-column grid is
// at its narrowest — the exact width that surfaced a real 0px-collapsed
// column-title defect during T058 (GroupableColumn.tsx, fixed there). Pin it
// here so a regression shows up as a responsive-layout failure, not just an
// a11y one.
test('the column title remains visible (non-zero width) at the lg breakpoint boundary (1024px)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await context.newPage();

    await signInWithGoogle(page, context);
    await createBoard(page, 'Responsive Breakpoint Board');

    const helpedHeading = page.getByText('Qué me ayudó', { exact: true });
    await expect(helpedHeading).toBeVisible();
    const box = await helpedHeading.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);

    await expectNoHorizontalOverflow(page.locator('body'));

    await context.close();
});
