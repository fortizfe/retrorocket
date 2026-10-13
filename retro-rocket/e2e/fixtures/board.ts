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
 *
 * Scoped to the first `[data-card-column]` root (058-card-owner-action-hub, T016)
 * rather than an unscoped page-wide text search: an unscoped `getByText('Agregar
 * primera tarjeta').first()` matches *any* still-empty column, not necessarily the
 * one earlier calls in the same test already added a card to — once that first
 * column has its own card, a *different*, still-empty column (e.g. "hindered")
 * would be the first "Agregar primera tarjeta" in DOM order and would silently
 * receive the next card instead. Found via card-owner-actions.spec.ts (T018),
 * which calls this helper three times in one test and asserts same-column focus
 * handoff after delete — a second/third card landing in the wrong column broke
 * `getPostDeleteFocusTarget`'s sibling lookup, not production code.
 *
 * The decide-then-click step below (prefer "Agregar primera tarjeta" when
 * visible, else the column header's "Agregar" button) is wrapped in
 * `expect(...).toPass()` rather than being a plain one-shot check-then-click, so
 * the *whole decision* retries instead of a single stale click target.
 * concurrent-board-network.spec.ts (10 participants on one board) exposed why that
 * distinction matters: with multiple sessions viewing the same column, another
 * participant's card can arrive over the realtime relay and flip this column from
 * empty to populated *between* the `isVisible()` check and the `.click()`,
 * detaching "Agregar primera tarjeta" mid-click — a plain click-retry on that same
 * now-gone locator has nothing left to resolve to and times out instead of falling
 * back to the "Agregar" header button. `toPass()` re-runs the visibility check on
 * every retry, so it picks the header button on the next attempt instead.
 *
 * This is deliberately NOT a single combined `column.getByText(A).or(getByText(B))`
 * locator: the header "Agregar" button's label span is unconditionally in the DOM
 * (`GroupableColumn.tsx`, `<span className="hidden xl:inline">`) — only CSS-hidden
 * below the `xl` breakpoint — so on a touch-viewport test with a genuinely empty
 * column, `.or(...).first()` picks by DOM order and resolves to that *hidden* header
 * span (it precedes the empty-state's "Agregar primera tarjeta" in the JSX tree)
 * and then hangs forever waiting for a span that can never become visible at that
 * viewport. Explicitly checking `isVisible()` first avoids that trap.
 */
export async function addCardToFirstColumn(page: Page, content: string): Promise<void> {
    const column = page.locator('[data-card-column]').first();
    // First card in an empty column uses "Agregar primera tarjeta"; subsequent
    // cards use the column header "Agregar" button.
    const firstCardBtn = column.getByText('Agregar primera tarjeta').first();
    const headerAddBtn = column.getByText('Agregar', { exact: true }).first();
    await expect(async () => {
        if (await firstCardBtn.isVisible().catch(() => false)) {
            await firstCardBtn.click({ timeout: 2_000 });
        } else {
            await headerAddBtn.click({ timeout: 2_000 });
        }
    }).toPass({ timeout: 15_000 });

    // Confirm the click actually opened the create-card form rather than, say,
    // landing on neither trigger and silently no-op'ing — a clearer failure than
    // letting a stale textarea from a previous call pass the fill below.
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    await textarea.fill(content);
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
