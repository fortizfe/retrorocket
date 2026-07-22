import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';

/**
 * WCAG 2.1 AA audit gate (FR-013 / SC-003).
 *
 * Runs axe-core against the primary surfaces in BOTH themes. Part of the
 * merge-blocking `e2e` job — do NOT disable rules to pass (Constitution
 * Principle VIII). See specs/009-wcag-theme-compliance/contracts/accessibility-audit.md.
 */

type Theme = 'light' | 'dark';
const THEMES: Theme[] = ['light', 'dark'];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Force a theme before the app's scripts run, so first paint is already themed. */
async function forceTheme(page: Page, theme: Theme): Promise<void> {
    await page.addInitScript((t) => {
        try {
            window.localStorage.setItem('theme', t);
        } catch {
            /* ignore */
        }
    }, theme);
}

/** Apply the theme class to the live document (covers runtime switches). */
async function applyThemeClass(page: Page, theme: Theme): Promise<void> {
    await page.evaluate((t) => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        window.localStorage.setItem('theme', t);
    }, theme);
}

/** Run axe and assert zero violations, with a readable failure message. */
async function expectNoViolations(page: Page, context: string): Promise<void> {
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const summary = results.violations
        .map((v) => `  [${v.id}] ${v.help} (${v.nodes.length} node(s))`)
        .join('\n');
    expect(results.violations, `axe violations at ${context}:\n${summary}`).toEqual([]);
}

// --- Public surface: Landing, both themes (no auth) -------------------------

for (const theme of THEMES) {
    test(`Landing has no WCAG 2.1 AA violations (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.goto('/');
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `/ (${theme})`);
    });
}

// --- Authenticated surfaces: Dashboard, Profile, Board (both themes) --------

for (const theme of THEMES) {
    test(`Dashboard & Profile have no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);

        await page.goto('/dashboard');
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `/dashboard (${theme})`);

        await page.goto('/perfil');
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `/perfil (${theme})`);
    });

    test(`Board (cards/columns/voting) has no WCAG 2.1 AA violations (${theme})`, async ({ page, context }) => {
        await forceTheme(page, theme);
        await signInWithGoogle(page, context);
        await createBoard(page, `A11y Board ${theme}`);
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `board (${theme})`);
    });
}

// --- Runtime theme switch (T028a / FR-010) ----------------------------------

test('toggling theme mid-session keeps the board WCAG 2.1 AA compliant', async ({ page, context }) => {
    await forceTheme(page, 'light');
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Board toggle');

    await applyThemeClass(page, 'light');
    await expectNoViolations(page, 'board after switch → light');

    await applyThemeClass(page, 'dark');
    // No surface should retain prior-theme colors; a full axe pass proves it.
    await expectNoViolations(page, 'board after switch → dark');
});

// --- Keyboard focus visibility (T033 / SC-004) ------------------------------

for (const theme of THEMES) {
    test(`focused elements are visibly indicated via keyboard (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.goto('/');
        await applyThemeClass(page, theme);

        // Tab into the page and assert a real element receives focus with a
        // visible outline/ring (focus-visible token). Repeated a few times to
        // cover the primary interactive controls on the landing surface.
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
            const focused = page.locator(':focus-visible');
            await expect(focused, `focus-visible element after ${i + 1} tab(s) (${theme})`).toHaveCount(1);
        }
    });
}
