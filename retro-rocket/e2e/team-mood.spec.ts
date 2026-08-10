import { test, expect, type Page } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';

/**
 * Robustly adds a card to the first column and waits for its create composer to fully
 * close before returning, so seeding several cards in a row never leaves two composers
 * open at once (which would make the "Crear tarjeta" button ambiguous).
 */
async function seedCard(page: Page, content: string): Promise<void> {
    const firstCardBtn = page.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtn.isVisible().catch(() => false)) {
        await firstCardBtn.click();
    } else {
        await page.getByText('Agregar', { exact: true }).first().click();
    }
    const createBtn = page.getByRole('button', { name: 'Crear tarjeta' });
    await createBtn.waitFor();
    await page.locator('textarea').first().fill(content);
    await createBtn.click();
    await expect(page.locator('span', { hasText: content.slice(0, 40) }).first()).toBeVisible({ timeout: 10_000 });
    // Wait for the composer to close so the next add opens a single, unambiguous one.
    await expect(page.getByRole('button', { name: 'Crear tarjeta' })).toHaveCount(0);
}

/**
 * Constitution VII (targeted): the facilitator can open the team-mood panel on a
 * seeded board and it renders ONE coherent, non-error state. On-device inference
 * downloads the model on first use, which is heavy/unreliable in headless CI, so this
 * spec asserts the panel reaches a coherent state (a score, the initializing state, or
 * an explicit insufficient-data state) rather than gambling on the model download — the
 * per-report self-consistency of the score/percentages/alerts is proven by the unit
 * suite (useTeamMood + moodDistribution + moodScore), FR-006/SC-003.
 */
test('facilitator team-mood panel opens and renders a coherent state on a seeded board', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Team Mood');

    // Seed ≥3 analysable cards so the report has enough data.
    await seedCard(page, 'El equipo colaboró excelente esta iteración');
    await seedCard(page, 'Estoy muy contento con los resultados del sprint');
    await seedCard(page, 'La comunicación fue estupenda y muy fluida');

    // Open the facilitator menu → team-mood tab. The tab shows the compact label
    // "Equipo"; its stable full label lives on the button's `title` attribute.
    await page.getByText('Facilitador', { exact: true }).click();
    await page.locator('button[title="Estado del Equipo"]').click();

    // The panel must reach a coherent state (never the disabled/crash state): a mood
    // score X/10, the model-initializing state, or an explicit insufficient-data state.
    const coherentState = page
        .getByText(/\d(\.\d)?\/10/)
        .or(page.getByText('Inicializando Análisis', { exact: true }))
        .or(page.getByText('Datos insuficientes', { exact: true }));
    await expect(coherentState.first()).toBeVisible({ timeout: 30_000 });
});

// ─── 036-options-facilitator-menus, User Story 3: reachable via the new
// mobile entry point (FR-013a) ───────────────────────────────────────────
// Sentiment and Team Mood are tab *content*, unchanged by this feature
// (T028/T029 found both already opaque/Direction-B-conformant — no restyle
// needed); what's new is reaching them through the mobile sheet at all.
test('the Sentiment and Team Mood tabs are reachable through the facilitator menu\'s mobile entry point', async ({ browser }) => {
    // Sign in and create the board at the default viewport first — signInWithGoogle()
    // waits for a header element the app hides below the `md` breakpoint (same
    // constraint as board-responsive.spec.ts) — then resize down to the real
    // narrow-phone width before touching the board.
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Mobile Sentiment Team Mood');
    await page.setViewportSize({ width: 390, height: 844 });

    await seedCard(page, 'El equipo colaboró excelente esta iteración');
    await seedCard(page, 'Estoy muy contento con los resultados del sprint');
    await seedCard(page, 'La comunicación fue estupenda y muy fluida');

    await page.getByRole('button', { name: 'Controles de Facilitador' }).click();
    const sheet = page.getByRole('dialog', { name: 'Controles de Facilitador' });
    await expect(sheet).toBeVisible();

    // Sentiment tab: the enable/disable control renders (no model download wait).
    await sheet.getByRole('tab', { name: /IA/i }).click();
    await expect(sheet.getByRole('tabpanel')).toBeVisible();

    // Team Mood tab: reaches the same coherent state as the desktop flow.
    await sheet.getByRole('tab', { name: /Equipo/i }).click();
    const coherentState = sheet
        .getByText(/\d(\.\d)?\/10/)
        .or(sheet.getByText('Inicializando Análisis', { exact: true }))
        .or(sheet.getByText('Datos insuficientes', { exact: true }));
    await expect(coherentState.first()).toBeVisible({ timeout: 30_000 });

    await context.close();
});
