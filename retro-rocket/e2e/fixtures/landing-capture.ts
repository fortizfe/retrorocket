import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_PRESENTER, DEMO_DASHBOARD_BOARDS, DEMO_BOARD_TITLE, DEMO_CARDS } from './landing-demo-data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Media capture script (contracts/capture-script-contract.md, FR-015). Run
 * on demand — NOT part of the merge-blocking `npm run e2e` job (this file's
 * name deliberately doesn't match `*.spec.ts`, so Playwright's default glob
 * skips it; it only runs when explicitly targeted):
 *
 *   npm run emulators                                          # separate terminal
 *   npx playwright test e2e/fixtures/landing-capture.ts --config playwright.config.ts
 *
 * Produces public/landing-media/{capabilities,howItWorks,sentiment,technology}/
 * {light,dark}.png for src/features/landing/data/mediaAssets.ts. Runs exclusively against the
 * Firebase Emulator Suite via playwright.config.ts's webServer
 * (VITE_USE_FIREBASE_EMULATOR=true) — never a production project (FR-005).
 *
 * Wide screenshots are captured at exactly the 16:9 ratio LandingSection's
 * `mediaLayout="wide"` frame uses (`aspect-video`) — matching the display
 * frame's aspect ratio exactly is what avoids `object-cover` cropping real
 * content off the capture (a real bug found and fixed after the first
 * capture pass: the display frame and the capture's own aspect ratio must
 * agree, they can't be chosen independently).
 */

type Theme = 'light' | 'dark';
const THEMES: Theme[] = ['light', 'dark'];

const OUTPUT_DIR = path.resolve(__dirname, '../../public/landing-media');
// 16:9 — matches LandingSection's `aspect-video` "wide" display frame exactly.
const WIDE_VIEWPORT = { width: 1600, height: 900 };
// iPhone 12-ish — technology section's capture is tangible proof of the
// "Mobile First" / responsive-design claim; matches LandingSection's
// `mediaLayout="phone"` frame (`aspect-[390/844]`) exactly.
const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** Same forceTheme/applyThemeClass pattern as e2e/accessibility.spec.ts. */
async function forceTheme(page: Page, theme: Theme): Promise<void> {
    await page.addInitScript((t) => {
        try {
            window.localStorage.setItem('theme', t);
        } catch {
            /* ignore */
        }
    }, theme);
}

async function applyThemeClass(page: Page, theme: Theme): Promise<void> {
    await page.waitForLoadState('load');
    await page.evaluate((t) => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        window.localStorage.setItem('theme', t);
    }, theme);
}

function ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
}

/** Waits for the board's column layout to have rendered (join/render-
 * readiness signal — same wait target as e2e/accessibility.spec.ts's
 * waitForBoardReady), more robust than waiting on card text alone. */
async function waitForBoardReady(page: Page): Promise<void> {
    await page.getByText('Qué me ayudó', { exact: true }).waitFor({ timeout: 15_000 });
    await page.getByText(DEMO_CARDS.helped[0]).first().waitFor({ timeout: 15_000 });
}

test('capture real, theme-paired landing Media Assets from the seeded demo dataset', async ({ page }) => {
    test.setTimeout(240_000);
    // page.request (not the standalone `request` fixture) shares the browser
    // context's cookie jar with `page` — required for test-login's session
    // cookie to actually authenticate subsequent page.goto() navigation
    // (see e2e/fixtures/auth-helpers.ts's signInWithGoogle for the same pattern).
    const request = page.request;

    // 1. Sign in as the fictional demo presenter (emulator-only test-login — FR-005's
    // structural no-real-data guarantee comes from this endpoint only existing under
    // AUTH_TEST_MODE against the Firebase Emulator Suite).
    const loginRes = await request.post('/api/auth/test-login', {
        data: { email: DEMO_PRESENTER.email, displayName: DEMO_PRESENTER.displayName },
    });
    if (!loginRes.ok()) {
        throw new Error(`landing-capture: test-login failed: ${loginRes.status()} ${await loginRes.text()}`);
    }
    await page.goto('/');
    await page.waitForURL(/\/(mis-tableros|dashboard)/, { timeout: 30_000 });

    // 2. Seed two extra boards so the Dashboard capture shows a populated list
    // (contracts/capture-script-contract.md rule 3 — direct POST /api/boards, the
    // same convention already used inline in e.g. dashboard-list.spec.ts).
    for (const title of DEMO_DASHBOARD_BOARDS) {
        const res = await request.post('/api/boards', { data: { templateId: 'default', title, locale: 'es' } });
        if (!res.ok()) throw new Error(`landing-capture: failed to create board "${title}": ${res.status()}`);
    }

    // 3. Seed the main board (howItWorks/sentiment capture) with realistic,
    // emotionally-legible content — the sentiment section's capture depends on
    // the on-device model actually having positive/negative signal to detect.
    const mainBoardRes = await request.post('/api/boards', {
        data: { templateId: 'default', title: DEMO_BOARD_TITLE, locale: 'es' },
    });
    if (!mainBoardRes.ok()) {
        throw new Error(`landing-capture: failed to create main board: ${mainBoardRes.status()}`);
    }
    const { boardId: mainBoardId } = (await mainBoardRes.json()) as { boardId: string };

    for (const [column, cards] of Object.entries(DEMO_CARDS)) {
        for (const content of cards) {
            const res = await request.post(`/api/retrospectives/${mainBoardId}/cards`, { data: { content, column } });
            if (!res.ok()) throw new Error(`landing-capture: failed to create card "${content}": ${res.status()}`);
        }
    }

    for (const theme of THEMES) {
        // capabilities → Dashboard (populated board list)
        await page.setViewportSize(WIDE_VIEWPORT);
        await forceTheme(page, theme);
        await page.goto('/mis-tableros');
        await applyThemeClass(page, theme);
        await page.getByText(DEMO_BOARD_TITLE).first().waitFor({ timeout: 15_000 });
        const capabilitiesDir = path.join(OUTPUT_DIR, 'capabilities');
        ensureDir(capabilitiesDir);
        await page.screenshot({ path: path.join(capabilitiesDir, `${theme}.png`) });

        // howItWorks → the same board, mid-collaboration: a couple of cards
        // liked so the capture reads as a live session rather than an idle
        // empty-vote state.
        await page.goto(`/retro/${mainBoardId}`);
        await applyThemeClass(page, theme);
        await waitForBoardReady(page);
        const likeButtons = page.locator('[data-testid="draggable-card"]').getByRole('button', { name: /^\d+$/ });
        await likeButtons.nth(0).click();
        await likeButtons.nth(2).click();
        await likeButtons.nth(0).click();
        await page.waitForTimeout(400);
        const howItWorksDir = path.join(OUTPUT_DIR, 'howItWorks');
        ensureDir(howItWorksDir);
        await page.screenshot({ path: path.join(howItWorksDir, `${theme}.png`) });

        // sentiment → Facilitador → "Estado del Equipo" (Team Mood dashboard),
        // waited until the on-device model has actually finished analyzing
        // every card, not just reached its initial zeroed placeholder state.
        await page.goto(`/retro/${mainBoardId}`);
        await applyThemeClass(page, theme);
        await waitForBoardReady(page);
        await page.getByText('Facilitador', { exact: true }).click();
        await page.locator('button[title="Estado del Equipo"]').click();
        const totalCards = Object.values(DEMO_CARDS).flat().length;
        await page
            .getByText(`Basado en el análisis de ${totalCards} tarjetas`, { exact: true })
            .waitFor({ timeout: 60_000 });
        await page.waitForTimeout(400);
        const sentimentDir = path.join(OUTPUT_DIR, 'sentiment');
        ensureDir(sentimentDir);
        await page.screenshot({ path: path.join(sentimentDir, `${theme}.png`) });
        await page.keyboard.press('Escape');

        // technology → the same board, on a mobile viewport
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto(`/retro/${mainBoardId}`);
        await applyThemeClass(page, theme);
        await waitForBoardReady(page);
        await page.waitForTimeout(500);
        const technologyDir = path.join(OUTPUT_DIR, 'technology');
        ensureDir(technologyDir);
        await page.screenshot({ path: path.join(technologyDir, `${theme}.png`) });
    }
});
