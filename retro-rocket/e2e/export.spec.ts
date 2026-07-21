import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';

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
