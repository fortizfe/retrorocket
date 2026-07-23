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
