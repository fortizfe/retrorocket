import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';
import { LONG_URL, addCardToFirstColumn, cardByContent, expectNoHorizontalOverflow, openReactionPicker } from './fixtures/board';

/** Critical flow: add a card, like (vote on) a card, and group cards in a column. */
test('user adds cards, likes a card, and groups cards by creator', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Card Lifecycle Test');

    // Add first card
    await page.getByText('Agregar primera tarjeta').first().click();
    await page.locator('textarea').first().fill('Card one');
    await page.getByRole('button', { name: 'Crear tarjeta' }).click();
    // Scope to the rendered card's text span — while the create-card textarea is
    // still closing, its value also matches a plain getByText for the same string
    await expect(page.locator('span', { hasText: 'Card one' })).toBeVisible();

    // Like (vote on) the card — the app's modern replacement for the deprecated
    // numeric vote stepper, always visible once a card exists. Its `title` attribute
    // changes once liked (interpolates the liker's username), so it can't be used as
    // a stable locator across the click; instead, scope to the card container and
    // find the nested button whose accessible name is just the like count.
    const cardOne = page.getByRole('button', { name: /Card one/ });
    const likeButton = cardOne.getByRole('button', { name: /^\d+$/ });
    await expect(likeButton).toHaveText('0');
    await likeButton.click();
    await expect(likeButton).toHaveText('1', { timeout: 10_000 });

    // Add a second card to the same column so grouping has something to group
    await page.getByText('Agregar', { exact: true }).first().click();
    await page.locator('textarea').first().fill('Card two');
    await page.getByRole('button', { name: 'Crear tarjeta' }).click();
    await expect(page.locator('span', { hasText: 'Card two' })).toBeVisible();

    // Group cards by creator
    await page.locator('[aria-label="Grouping options"]').first().click();
    await page.getByText('Agrupar por usuario', { exact: true }).click();
    await expect(page.getByText('2 tarjetas')).toBeVisible();
});

/** US1 / SC-001: a card containing a very long URL wraps and does not overflow. */
test('a card with a long URL wraps without horizontal overflow and keeps the link', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Card Wrapping Test');

    await addCardToFirstColumn(page, `Check ${LONG_URL} please`);

    const card = cardByContent(page, LONG_URL.slice(0, 30));
    await expect(card).toBeVisible();

    // The card must not overflow its own box horizontally, and neither must the page.
    await expectNoHorizontalOverflow(card);
    await expectNoHorizontalOverflow(page.locator('body'));

    // The URL remains a working link opening in a new tab.
    const link = card.getByRole('link', { name: new RegExp(LONG_URL.slice(0, 20)) });
    await expect(link).toHaveAttribute('href', LONG_URL);
    await expect(link).toHaveAttribute('target', '_blank');
});

/** US3 / SC-003, SC-004, FR-009a: reaction picker is anchored, stays in-viewport,
 *  survives scroll/resize, and dismisses on Escape / outside click. */
test('reaction picker appears anchored, stays in viewport, and dismisses cleanly', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Reaction Picker Test');
    await addCardToFirstColumn(page, 'React to me');

    const card = cardByContent(page, 'React to me');
    const picker = await openReactionPicker(page, card);

    // The picker must be fully within the viewport (anchored + flip/shift).
    const vp = page.viewportSize()!;
    const box = await picker.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);

    // Scrolling / resizing while open keeps it anchored (still visible, still in viewport).
    await page.mouse.wheel(0, 120);
    await page.setViewportSize({ width: vp.width - 120, height: vp.height });
    await expect(picker).toBeVisible();
    const box2 = await picker.boundingBox();
    expect(box2!.x + box2!.width).toBeLessThanOrEqual(vp.width - 120 + 1);

    // Escape closes it.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Reopen and dismiss via outside click.
    await openReactionPicker(page, card);
    await page.mouse.click(5, 5);
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
