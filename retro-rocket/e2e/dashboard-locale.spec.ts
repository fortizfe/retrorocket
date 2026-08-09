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
    // unchanged after switching to English. We assert against the actual
    // expected formatting per locale (day/month/year, 2-digit) rather than
    // just "changed": es-ES (DD/MM) and en-US (MM/DD) legitimately render
    // identical text on "mirror" dates where day === month (e.g. 08/08), so
    // a bare inequality check is flaky ~12 days a year regardless of whether
    // the formatter is correct.
    const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const today = new Date();
    const expectedEs = new Intl.DateTimeFormat('es-ES', dateOptions).format(today);
    const expectedEn = new Intl.DateTimeFormat('en-US', dateOptions).format(today);

    expect(dateBefore).toBe(expectedEs);
    expect(dateAfter).toBe(expectedEn);
});
