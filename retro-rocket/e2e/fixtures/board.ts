import { Page, Locator, expect } from '@playwright/test';

/**
 * A ~200-char single-token URL used to prove card content wraps instead of
 * overflowing its column (User Story 1 / FR-001, FR-002, SC-001).
 */
export const LONG_URL =
    'https://example.com/' + 'a'.repeat(180) + '?x=1';

/**
 * Adds a card to the first column on the board. Assumes a board is already open
 * (see `createBoard` in `auth-helpers.ts`). Uses the column "add" affordance,
 * fills the textarea, and submits. Selectors mirror the working card-lifecycle spec.
 */
export async function addCardToFirstColumn(page: Page, content: string): Promise<void> {
    // First card in an empty column uses "Agregar primera tarjeta"; subsequent
    // cards use the column header "Agregar" button.
    const firstCardBtn = page.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtn.isVisible().catch(() => false)) {
        await firstCardBtn.click();
    } else {
        await page.getByText('Agregar', { exact: true }).first().click();
    }
    await page.locator('textarea').first().fill(content);
    await page.getByRole('button', { name: 'Crear tarjeta' }).click();
    await expect(page.locator('span', { hasText: content.slice(0, 40) }).first()).toBeVisible({
        timeout: 10_000,
    });
}

/** Returns the card element whose content includes the given text. */
export function cardByContent(page: Page, content: string): Locator {
    return page.locator('[data-testid="draggable-card"]', { hasText: content }).first();
}

/**
 * Opens the emoji reaction picker for the given card and returns the picker dialog
 * locator. The trigger is the button with aria-haspopup="dialog" (i18n-agnostic);
 * the picker renders in a FloatingPortal with role="dialog".
 */
export async function openReactionPicker(page: Page, card: Locator) {
    await card.locator('button[aria-haspopup="dialog"]').first().click();
    const picker = page.getByRole('dialog');
    await expect(picker).toBeVisible();
    return picker;
}

/**
 * Asserts an element (or the page body) does not overflow horizontally:
 * scrollWidth must not exceed clientWidth by more than a 1px rounding tolerance.
 */
export async function expectNoHorizontalOverflow(locator: Locator): Promise<void> {
    const { scrollW, clientW } = await locator.evaluate((el) => ({
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
    }));
    expect(scrollW).toBeLessThanOrEqual(clientW + 1);
}
