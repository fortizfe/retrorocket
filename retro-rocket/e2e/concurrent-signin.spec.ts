import { test, expect } from '@playwright/test';
import { signInAs } from './fixtures/auth-helpers';

/**
 * User Story 1 (021-backend-realtime-updates): a team member's sign-in must never fail
 * because of how many other legitimate teammates are already signed in.
 *
 * This spec confirms the functional outcome — several distinct identities can all reach the
 * authenticated dashboard concurrently. The specific "the shared bucket cannot 429 a distinct
 * identity" guarantee is exercised against the *real* rate limiter at the server-integration
 * level (server/test/http/routes/authLogin.test.ts), since this project's E2E suite
 * deliberately runs with AUTH_TEST_MODE on, which skips authLimiter entirely (auth.ts) so the
 * suite's own cumulative request volume across many spec files never trips it — see that
 * file's existing comment. An E2E assertion of "zero 429s" here would therefore be unable to
 * ever fail, regardless of whether the fix works.
 */
test('8 distinct teammates signing in within the same short window all reach the authenticated dashboard', async ({ browser }) => {
    const identities = Array.from({ length: 8 }, (_, i) => ({
        email: `e2e-concurrent-signin-${i}@example.com`,
        displayName: `E2E Concurrent User ${i}`,
    }));

    const results = await Promise.all(
        identities.map(async ({ email, displayName }) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            await signInAs(page, email, displayName);
            return { page, context, displayName };
        }),
    );

    try {
        for (const { page, displayName } of results) {
            await expect(page.getByText(displayName)).toBeVisible({ timeout: 15_000 });
            await expect(page).toHaveURL(/\/(mis-tableros|dashboard)/);
        }
    } finally {
        await Promise.all(results.map(({ context }) => context.close()));
    }
});
