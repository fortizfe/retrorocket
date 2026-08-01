import { test, expect } from '@playwright/test';
import { signInWithGoogle, signInAs, createBoard, TEST_USER_DISPLAY_NAME } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent } from './fixtures/board';

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

// 022-display-name-consistency, User Story 3: a brand-new account connecting for the
// first time immediately has a meaningful display name — sourced from the connected
// provider — with zero manual setup before creating a card (FR-008, FR-009, SC-004).
// The Auth Emulator can't serve a real Google/GitHub OAuth code exchange (see this
// file's top comment), so — consistent with every other spec here — the test-login
// endpoint stands in for "arrived from the provider already carrying this name";
// GoogleOAuthAdapter/GithubOAuthAdapter's own provider-name-extraction logic is
// covered separately at the unit level (server/test/adapters/oauth/oauth.test.ts).
test('a brand-new account shows its provider-derived name immediately on a freshly created card and on the Profile page, with no setup step', async ({ page }) => {
    const email = `e2e-new-user-${Date.now()}@example.com`;
    const displayName = 'Brand New User';
    await signInAs(page, email, displayName);

    await createBoard(page, 'E2E New User Default Name Board');
    await addCardToFirstColumn(page, 'Card from a brand-new user');
    await expect(cardByContent(page, 'Card from a brand-new user').getByText(displayName)).toBeVisible({ timeout: 10_000 });

    await page.goto('/perfil');
    await expect(page.getByText(displayName).first()).toBeVisible();
});
