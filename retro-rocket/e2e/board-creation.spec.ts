import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';

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
