import { Page, BrowserContext } from '@playwright/test';

export const TEST_USER_EMAIL = 'e2e-google@example.com';
export const TEST_USER_DISPLAY_NAME = 'E2E Google User';

/**
 * Drives the app's real "Continuar con Google" button against the Auth Emulator's
 * fake-IDP consent popup (email/display-name form, no real Google network call),
 * then waits for the dashboard to render. Used by every spec — this is the one
 * mechanism verified end-to-end in this codebase (see research.md §3): a pre-minted
 * custom-token bypass was tried first but the Auth Emulator does not populate
 * `email` on the resulting user until a manual reload, which the app's profile-setup
 * code requires — the real popup flow has no such gap and is what production uses.
 */
export async function signInWithGoogle(page: Page, context: BrowserContext): Promise<void> {
    await page.goto('/');
    const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 10_000 }),
        page.getByText('Continuar con Google', { exact: true }).click(),
    ]);
    await popup.waitForLoadState();
    await popup.getByText('Add new account', { exact: true }).click();
    await popup.locator('#email-input').fill(TEST_USER_EMAIL);
    await popup.locator('#display-name-input').fill(TEST_USER_DISPLAY_NAME);
    await popup.getByRole('button', { name: /Sign in with Google/i }).click();
    await page.getByText(TEST_USER_DISPLAY_NAME).waitFor({ timeout: 10_000 });
}

/** Creates a new retrospective board from the dashboard and waits for it to load. */
export async function createBoard(page: Page, title: string): Promise<void> {
    await page.getByText('Nuevo Tablero', { exact: true }).click();
    await page.getByText('Siguiente', { exact: true }).click();
    await page.locator('#boardTitle').fill(title);
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await page.waitForURL(/\/retro\//, { timeout: 10_000 });
}
