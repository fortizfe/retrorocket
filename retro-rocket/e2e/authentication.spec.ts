import { test, expect } from '@playwright/test';
import { TEST_USER_DISPLAY_NAME, TEST_USER_EMAIL } from './fixtures/auth-helpers';

/**
 * Critical flow: authentication. Drives the app's real "Sign in with Google" button
 * against the Auth Emulator's fake-IDP consent popup — the real signInWithPopup code
 * path, not a shortcut — since this is the one spec where login is the thing under test.
 */
test('user can sign in with Google and reach the authenticated dashboard', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByText('Continuar con Google', { exact: true })).toBeVisible();

    const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 10_000 }),
        page.getByText('Continuar con Google', { exact: true }).click(),
    ]);
    await popup.waitForLoadState();

    await popup.getByText('Add new account', { exact: true }).click();
    await popup.locator('#email-input').fill(TEST_USER_EMAIL);
    await popup.locator('#display-name-input').fill(TEST_USER_DISPLAY_NAME);
    await popup.getByRole('button', { name: /Sign in with Google/i }).click();

    await expect(page.getByText(TEST_USER_DISPLAY_NAME)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/mis-tableros/);
    await expect(page.getByText('Mis Retrospectivas')).toBeVisible();
});
