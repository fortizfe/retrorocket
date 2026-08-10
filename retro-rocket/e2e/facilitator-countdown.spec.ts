import { test, expect } from '@playwright/test';
import { signInWithGoogle, signInAs, createBoard } from './fixtures/auth-helpers';

/** Critical flow: facilitator creates, starts, pauses, and removes the countdown timer. */
test('facilitator starts, pauses, and stops the countdown timer', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Countdown Test');

    await page.getByText('Facilitador', { exact: true }).click();
    await expect(page.getByText('Temporizador', { exact: true })).toBeVisible();

    // Quick timer preset, then create
    await page.getByText('5min', { exact: true }).click();
    await page.getByText('Crear Temporizador', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();

    // Start
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reiniciar' })).toBeVisible();

    // Pause
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();

    // Stop (delete the timer)
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Crear Temporizador', { exact: true })).toBeVisible();
});

// ─── 036-options-facilitator-menus, User Story 2: new mobile entry point ───
// Before this feature, the facilitator menu had no reachable path below the
// `md` breakpoint at all (FR-013a) — this is new coverage. At a real narrow
// viewport, only the mobile trigger is exposed to the accessibility tree, so
// `getByRole`/`getByLabelText` resolve unambiguously without disambiguation.
test('the facilitator menu is reachable from a narrow mobile viewport, defaults to Controls, and stays absent for a non-owner', async ({ browser }) => {
    const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ownerPage = await ownerContext.newPage();
    await signInWithGoogle(ownerPage, ownerContext);
    await createBoard(ownerPage, 'E2E Mobile Facilitator Board');
    const boardId = new URL(ownerPage.url()).pathname.split('/').pop();

    // Owner: mobile entry point opens a bottom sheet defaulting to Controls,
    // and a full timer create/start cycle works through it.
    await ownerPage.getByRole('button', { name: 'Controles de Facilitador' }).click();
    const sheet = ownerPage.getByRole('dialog', { name: 'Controles de Facilitador' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('tab', { name: /Controles/i, selected: true })).toBeVisible();

    await sheet.getByText('5min', { exact: true }).click();
    await sheet.getByText('Crear Temporizador', { exact: true }).click();
    await expect(sheet.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();
    await sheet.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(sheet.getByRole('button', { name: 'Pausar' })).toBeVisible();

    // Switch tabs within the sheet (Notes), confirming the shared tab list works on mobile too.
    await sheet.getByRole('tab', { name: /Notas/i }).click();
    await expect(sheet.getByRole('tabpanel')).toBeVisible();

    await ownerContext.close();

    // Non-owner (a genuinely distinct identity, not the same TEST_USER_EMAIL
    // account signInWithGoogle always uses), same narrow viewport: the
    // trigger is absent entirely, not just hidden.
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guestPage = await guestContext.newPage();
    await signInAs(guestPage, 'e2e-mobile-facilitator-guest@example.com', 'E2E Mobile Facilitator Guest');
    await guestPage.goto(`/retro/${boardId}`);
    await expect(guestPage.getByRole('button', { name: 'Controles de Facilitador' })).toHaveCount(0);
    await guestContext.close();
});

// ─── 036-options-facilitator-menus, User Story 4: Notes reachable via the
// mobile entry point (FR-013a) ──────────────────────────────────────────
test('a facilitator can add, edit, and delete a private note through the mobile entry point', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    // `window.confirm` (NotesTab.tsx's delete confirmation, FR-007) is a
    // real native browser dialog — accept every one for this test.
    page.on('dialog', (dialog) => dialog.accept());

    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Mobile Notes Board');

    await page.getByRole('button', { name: 'Controles de Facilitador' }).click();
    const sheet = page.getByRole('dialog', { name: 'Controles de Facilitador' });
    await sheet.getByRole('tab', { name: /Notas/i }).click();

    // Add
    await sheet.getByRole('button', { name: 'Nueva' }).click();
    await sheet.getByPlaceholder('Escribe tu nota aquí...').fill('Mobile note content');
    await sheet.getByRole('button', { name: 'Guardar' }).click();
    await expect(sheet.getByText('Mobile note content')).toBeVisible({ timeout: 10_000 });

    // Edit
    await sheet.getByRole('button', { name: 'Editar nota' }).click();
    await sheet.getByPlaceholder('Editar nota...').fill('Mobile note edited');
    await sheet.getByRole('button', { name: 'Guardar' }).click();
    await expect(sheet.getByText('Mobile note edited')).toBeVisible({ timeout: 10_000 });

    // Delete (confirmation auto-accepted above)
    await sheet.getByRole('button', { name: 'Eliminar nota' }).click();
    await expect(sheet.getByText('Mobile note edited')).not.toBeVisible({ timeout: 10_000 });

    await context.close();
});
