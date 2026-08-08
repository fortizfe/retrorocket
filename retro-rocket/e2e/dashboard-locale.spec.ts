import { test, expect } from '@playwright/test';
import { signInWithGoogle, TEST_USER_DISPLAY_NAME } from './fixtures/auth-helpers';

/**
 * Spec 031 FR-016/SC-005 (corrects a pre-existing defect): board creation
 * dates must follow the viewer's active language, not be hardcoded to
 * Spanish. Switches the real running app's language via the header's user
 * menu and confirms the rendered date text actually changes.
 */
test('a board creation date re-renders when the active language changes', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    const title = `E2E Locale Date Board ${Date.now()}`;
    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title, locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();

    await page.goto('/dashboard');
    const row = page.locator('li', { has: page.getByText(title, { exact: true }) });
    await expect(row).toBeVisible();

    // App defaults to Spanish — capture the date text as shown today.
    const dateBefore = await row.getByTestId('board-date').innerText();

    // Switch language via the header's user menu → language list (English).
    await page.getByText(TEST_USER_DISPLAY_NAME).click();
    await page.getByRole('menuitemradio', { name: /english/i }).click();

    const dateAfter = await row.getByTestId('board-date').innerText();

    // Regression guard: a hardcoded 'es-ES' formatter would leave this
    // unchanged after switching to English.
    expect(dateAfter).not.toBe(dateBefore);
});
