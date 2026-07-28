import { Page, BrowserContext } from '@playwright/test';

export const TEST_USER_EMAIL = 'e2e-google@example.com';
export const TEST_USER_DISPLAY_NAME = 'E2E Google User';

/**
 * Establishes an authenticated session via the backend's emulator-only test-login
 * endpoint (POST /api/auth/test-login, mounted when AUTH_TEST_MODE=true), then loads the
 * app so UserContext.bootstrapSession picks up the session cookie and signs into the Auth
 * Emulator with the returned custom token. This replaces the old fake-IDP popup: after the
 * feature-014 refactor the real "Continuar con Google" button performs a full-page redirect
 * to the backend OAuth flow (real Google endpoints), which the emulator cannot serve. The
 * custom-token path that previously failed (emulator didn't populate `email` until reload)
 * is now fine because the app reads email/providers from the backend session, not the
 * Firebase user. `page.request` shares the browser context cookie jar with `page`.
 */
export async function signInWithGoogle(page: Page, _context: BrowserContext): Promise<void> {
    const res = await page.request.post('/api/auth/test-login', {
        data: { email: TEST_USER_EMAIL, displayName: TEST_USER_DISPLAY_NAME },
    });
    if (!res.ok()) {
        throw new Error(`test-login failed: ${res.status()} ${await res.text()}`);
    }
    await page.goto('/');
    await page.getByText(TEST_USER_DISPLAY_NAME).waitFor({ timeout: 10_000 });
    // Wait for the post-login redirect ('/' → authenticated home) to fully settle before
    // returning. bootstrapSession does an extra /api/auth/session round-trip on load, so the
    // redirect fires asynchronously; if a caller proceeds while it is still pending, a later
    // page.evaluate() can hit "Execution context was destroyed" mid-navigation.
    await page.waitForURL(/\/(mis-tableros|dashboard)/, { timeout: 10_000 });
}

/**
 * Like signInWithGoogle, but for a second, genuinely distinct identity — e.g. testing
 * "board owner" vs. "joining participant" across two browser contexts. signInWithGoogle
 * always authenticates the fixed TEST_USER_EMAIL account, so scenarios needing two real
 * users must use this instead for at least one of them.
 */
export async function signInAs(page: Page, email: string, displayName: string): Promise<void> {
    const res = await page.request.post('/api/auth/test-login', { data: { email, displayName } });
    if (!res.ok()) {
        throw new Error(`test-login failed: ${res.status()} ${await res.text()}`);
    }
    await page.goto('/');
    await page.getByText(displayName).waitFor({ timeout: 10_000 });
    await page.waitForURL(/\/(mis-tableros|dashboard)/, { timeout: 10_000 });
}

/** Creates a new retrospective board from the dashboard and waits for it to load. */
export async function createBoard(page: Page, title: string): Promise<void> {
    await page.getByText('Nuevo Tablero', { exact: true }).click();
    await page.getByText('Siguiente', { exact: true }).click();
    await page.locator('#boardTitle').fill(title);
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await page.waitForURL(/\/retro\//, { timeout: 10_000 });
}
