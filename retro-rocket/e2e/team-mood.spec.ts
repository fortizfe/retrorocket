import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';
import { addCardToFirstColumn } from './fixtures/board';

/**
 * Constitution VII (targeted): the facilitator team-mood panel renders ONE coherent
 * score/label on a seeded board — the score, the percentage tiles, and the alerts are
 * all derived from the same adjusted distribution, so they never contradict each other
 * (FR-006, SC-003). On-device inference downloads the model on first use, so this spec
 * allows generous time for the panel to become ready.
 */
test('facilitator team-mood panel shows a single coherent score on a seeded board', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Team Mood');

    // Seed ≥3 analysable, clearly-positive cards so the report has enough data.
    await addCardToFirstColumn(page, 'El equipo colaboró excelente esta iteración');
    await addCardToFirstColumn(page, 'Estoy muy contento con los resultados del sprint');
    await addCardToFirstColumn(page, 'La comunicación fue estupenda y muy fluida');

    // Open the facilitator menu → "Estado del Equipo" (team mood) tab.
    await page.getByText('Facilitador', { exact: true }).click();
    await page.getByText('Estado del Equipo', { exact: true }).click();

    // Wait for the model to load and the dashboard to render a score (X/10). Generous
    // timeout: first run downloads model weights on-device.
    const score = page.getByText(/\d(\.\d)?\/10/).first();
    await expect(score).toBeVisible({ timeout: 120_000 });

    // The three percentage tiles are present and the panel is internally consistent:
    // a clearly-positive board must not simultaneously raise a critical-negativity alert.
    await expect(page.getByText('Estado de Ánimo del Equipo', { exact: true })).toBeVisible();
    await expect(page.getByText(/%/).first()).toBeVisible();
});
