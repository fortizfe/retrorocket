import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard, TEST_USER_DISPLAY_NAME } from './fixtures/auth-helpers';

/** Critical flow: export the board to PDF and to DOCX. */
test('user exports the board to PDF and to DOCX', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Export Test');

    // PDF export
    await page.getByText('Opciones', { exact: true }).click();
    await page.getByText('Exportar', { exact: true }).click();
    const [pdfDownload] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        page.getByRole('button', { name: 'Exportar PDF' }).click(),
    ]);
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);

    // Close the post-export success overlay before reopening the dialog
    // (there are two "Cerrar" buttons — the modal backdrop and the visible X icon;
    // only the icon button has a title attribute)
    await page.locator('button[title="Cerrar"]').click();
    await page.locator('button[title="Cerrar"]').waitFor({ state: 'hidden' });

    // DOCX export (reopen the export dialog for a fresh attempt)
    await page.getByText('Opciones', { exact: true }).click();
    await page.getByText('Exportar', { exact: true }).click();
    await page.getByText('DOCX', { exact: true }).click();
    const [docxDownload] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        page.getByRole('button', { name: /Exportar DOCX/ }).click(),
    ]);
    expect(docxDownload.suggestedFilename()).toMatch(/\.docx$/);
});

// 022-display-name-consistency, User Story 1: exported documents must show a resolved
// display name for every card author, never the raw internal uid (FR-005, SC-001).
// TXT is asserted directly here since its content is plain text; PDF/DOCX's equivalent
// author-resolution logic is unit-tested at the source (buildCardAuthorLine,
// buildCardMetadata) since parsing those binary formats in an E2E test would require a
// new dependency this feature doesn't otherwise need (Simplicity/YAGNI).
test('the exported TXT file shows the card author\'s display name, never the raw uid', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Export Author Test');

    const boardId = new URL(page.url()).pathname.split('/').pop();
    const createRes = await page.request.post(`/api/retrospectives/${boardId}/cards`, {
        data: { content: 'Card for export author check', column: 'helped' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { createdBy: authorUid } = (await createRes.json()) as { createdBy: string };
    await expect(page.getByText('Card for export author check')).toBeVisible({ timeout: 10_000 });

    await page.getByText('Opciones', { exact: true }).click();
    await page.getByText('Exportar', { exact: true }).click();
    await page.getByText('TXT', { exact: true }).click();
    const [txtDownload] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        page.getByRole('button', { name: /Exportar TXT/ }).click(),
    ]);
    expect(txtDownload.suggestedFilename()).toMatch(/\.txt$/);

    const path = await txtDownload.path();
    const content = readFileSync(path!, 'utf-8');
    expect(content).toContain(`Autor: ${TEST_USER_DISPLAY_NAME}`);
    expect(content).not.toContain(authorUid);
});

// ─── 036-options-facilitator-menus, User Story 1: new mobile entry point ───
// Before this feature, the options menu had no reachable path below the `md`
// breakpoint at all (FR-013a) — this is new coverage, not an update to
// existing coverage. At a real narrow viewport, only the mobile trigger is
// exposed to the accessibility tree (`hidden md:inline-flex` / `md:hidden`),
// so `getByRole` resolves unambiguously without extra disambiguation.
test('the options menu is reachable and fully usable from a narrow mobile viewport', async ({ browser }) => {
    // Sign in at the default viewport first — signInWithGoogle() waits for a
    // header element the app hides below the `md` breakpoint (same constraint
    // as board-responsive.spec.ts) — then resize down to the real narrow-phone
    // width before touching the board.
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInWithGoogle(page, context);
    await page.setViewportSize({ width: 390, height: 844 });

    const createRes = await page.request.post('/api/boards', {
        data: { templateId: 'default', title: 'E2E Mobile Options Board', locale: 'es' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { boardId } = (await createRes.json()) as { boardId: string };
    await page.goto(`/retro/${boardId}`);

    // Open — a genuine bottom sheet, not the desktop dropdown.
    await page.getByRole('button', { name: 'Opciones', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Opciones' });
    await expect(sheet).toBeVisible();

    // Every action is present and reachable via touch-sized targets.
    await expect(sheet.getByText('Exportar', { exact: true })).toBeVisible();
    await expect(sheet.getByText('Copiar ID', { exact: true })).toBeVisible();
    await expect(sheet.getByText('Compartir', { exact: true })).toBeVisible();
    await expect(sheet.getByText('Salir', { exact: true })).toBeVisible();

    // Copy ID: completes and confirms via toast, closing the sheet.
    await sheet.getByText('Copiar ID', { exact: true }).click();
    await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(sheet).not.toBeVisible();

    // Reopen and exit — navigates back to the dashboard.
    await page.getByRole('button', { name: 'Opciones', exact: true }).click();
    await page.getByRole('dialog', { name: 'Opciones' }).getByText('Salir', { exact: true }).click();
    await page.waitForURL(/\/(mis-tableros|dashboard)/, { timeout: 10_000 });

    await context.close();
});
