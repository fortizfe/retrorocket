import { test, expect } from '@playwright/test';
import { signInWithGoogle, createBoard } from './fixtures/auth-helpers';

/** Critical flow: facilitator creates, starts, pauses, and removes the countdown timer. */
test('facilitator starts, pauses, and stops the countdown timer', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await createBoard(page, 'E2E Countdown Test');

    await page.getByText('Facilitador', { exact: true }).click();
    await expect(page.getByText('Temporizador', { exact: true })).toBeVisible();

    // Quick timer preset, then create
    await page.getByText('5min', { exact: true }).click();
    await page.getByText('Crear Temporizador', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Iniciar' })).toBeVisible();

    // Start
    await page.getByRole('button', { name: 'Iniciar' }).click();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reiniciar' })).toBeVisible();

    // Pause
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar' })).toBeVisible();

    // Stop (delete the timer)
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Crear Temporizador', { exact: true })).toBeVisible();
});
