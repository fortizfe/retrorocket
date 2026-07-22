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

/** Wait until the board has rendered its default columns, so no navigation or
 *  late render is pending when we scan. */
async function waitForBoardReady(page: Page): Promise<void> {
    await expect(page.getByText('Qué me ayudó', { exact: true })).toBeVisible({ timeout: 15_000 });
}

/** Run axe and assert zero violations, with a readable failure message. */
async function expectNoViolations(page: Page, context: string): Promise<void> {
    // Deterministic pre-scan settle. Two sources of transient color otherwise
    // cause false color-contrast positives:
    //   1. Decorative *infinite* CSS animations (animate-float / animate-pulse-
    //      soft) continuously vary opacity — freeze all CSS animations/transitions.
    //   2. framer-motion *entrance* animations fade opacity 0 → 1 via JS inline
    //      styles which this CSS freeze cannot stop. On Landing they are staggered
    //      up to `delay: 1.2s`, so wait comfortably past the last one (~1.7s) for
    //      elements to reach their final opacity before axe reads computed colors.
    // NOTE: do NOT wait for 'networkidle' — authenticated pages hold open
    // Firestore real-time connections, so the network never goes idle.
    await page.addStyleTag({
        content: `
            *, *::before, *::after { animation: none !important; transition: none !important; }
            [style*="opacity"] { opacity: 1 !important; }
        `,
    });
    await page.waitForTimeout(400);
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
        await waitForBoardReady(page);
        await applyThemeClass(page, theme);
        await expectNoViolations(page, `board (${theme})`);
    });
}

// --- Runtime theme switch (T028a / FR-010) ----------------------------------

test('toggling theme mid-session keeps the board WCAG 2.1 AA compliant', async ({ page, context }) => {
    await forceTheme(page, 'light');
    await signInWithGoogle(page, context);
    await createBoard(page, 'A11y Board toggle');
    await waitForBoardReady(page);

    await applyThemeClass(page, 'light');
    await expectNoViolations(page, 'board after switch → light');

    await applyThemeClass(page, 'dark');
    // No surface should retain prior-theme colors; a full axe pass proves it.
    await expectNoViolations(page, 'board after switch → dark');
});

// --- Keyboard focus visibility (T033 / SC-004) ------------------------------

/**
 * Inspect the currently focused element in the browser context. `:focus-visible`
 * is evaluated in-page (Chromium supports it) rather than via a Playwright
 * locator (whose selector engine does not resolve `:focus-visible`).
 */
async function inspectFocus(page: Page) {
    return page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body || el === document.documentElement) {
            return { focused: false as const };
        }
        const s = getComputedStyle(el);
        const hasOutline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth || '0') > 0;
        const hasBoxShadow = Boolean(s.boxShadow) && s.boxShadow !== 'none';
        return {
            focused: true as const,
            tag: el.tagName.toLowerCase(),
            hasIndicator: hasOutline || hasBoxShadow,
        };
    });
}

for (const theme of THEMES) {
    test(`focused elements are visibly indicated via keyboard (${theme})`, async ({ page }) => {
        await forceTheme(page, theme);
        await page.goto('/');
        await applyThemeClass(page, theme);

        // Tab through the landing surface. Every element that actually receives
        // keyboard focus MUST show a visible indicator (outline or ring); the tab
        // order may return to the document after the last control, so we assert
        // that at least one interactive element was reached and indicated.
        let focusedElements = 0;
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab');
            const info = await inspectFocus(page);
            if (info.focused) {
                focusedElements++;
                expect(
                    info.hasIndicator,
                    `focused <${info.tag}> has a visible focus indicator (${theme})`,
                ).toBe(true);
            }
        }
        expect(
            focusedElements,
            `keyboard Tab reaches at least one indicated interactive element (${theme})`,
        ).toBeGreaterThan(0);
    });
}
