import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';

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
