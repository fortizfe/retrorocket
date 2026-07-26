import { test, expect } from '@playwright/test';
import { signInWithGoogle, TEST_USER_DISPLAY_NAME } from './fixtures/auth-helpers';

/**
 * Critical flow: authentication (feature 014 — backend-driven).
 *
 * The real "Continuar con Google" button now performs a full-page redirect to the backend
 * OAuth flow against real Google endpoints, which the Auth Emulator cannot serve. So this
 * spec verifies the backend session mechanism the app actually relies on: the backend
 * establishes the session (here via the emulator-only test-login endpoint) and issues a
 * Firebase custom token, and the SPA bootstraps into an authenticated dashboard, then can
 * sign out back to the landing page.
 */

test('the landing page offers backend-driven sign-in options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Continuar con Google', { exact: true })).toBeVisible();
    await expect(page.getByText('Continuar con GitHub', { exact: true })).toBeVisible();
});

test('a backend session reaches the authenticated dashboard', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await expect(page.getByText(TEST_USER_DISPLAY_NAME)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/mis-tableros/);
    await expect(page.getByText('Mis Retrospectivas')).toBeVisible();
});

test('the session cookie is httpOnly (not readable from document.cookie)', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    const documentCookies = await page.evaluate(() => document.cookie);
    expect(documentCookies).not.toContain('rr_session');
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === 'rr_session');
    expect(session?.httpOnly).toBe(true);
});

test('user can sign out back to the landing page', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.getByText(TEST_USER_DISPLAY_NAME).click();
    const signOut = page.getByRole('button', { name: /Cerrar sesión|Sign out/i });
    await signOut.first().click();
    await expect(page.getByText('Continuar con Google', { exact: true })).toBeVisible({ timeout: 10_000 });
});
