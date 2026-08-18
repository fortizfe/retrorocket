import type { Page, Locator } from '@playwright/test';

/**
 * Returns the display-name text field on Mi Perfil / the landing page's first-time-setup
 * form, per 050-profile-redesign T019/T021. `UserProfileForm.tsx`'s selected-direction
 * rebuild (`ProfileDirectionB.tsx`'s `IdentityPanel` reference) gates the field on Mi
 * Perfil (`isFirstTime=false`) behind a persistent "Editar" control (data-model.md's
 * `Editable Field Operation State`: `view` -> `editing`) — the field is not directly
 * visible until that control is activated. On first-time setup (`isFirstTime=true`) the
 * field is shown directly, with no Edit gate.
 *
 * Falling back to "Editar" only when the field isn't already visible keeps every caller
 * correct against either structure, without weakening what it verifies. Shared by
 * `profile.spec.ts` and `accessibility.spec.ts` (050-profile-redesign T033/T036) so both
 * suites reveal the field identically instead of drifting.
 */
export async function getDisplayNameInput(page: Page): Promise<Locator> {
    const field = page.getByLabel('Nombre a mostrar', { exact: false });
    if (await field.isVisible().catch(() => false)) return field;

    await page.getByRole('button', { name: 'Editar' }).click();
    return page.getByLabel('Nombre a mostrar', { exact: false });
}
