import { test, expect, type Page, type Locator } from '@playwright/test';
import { signInAs, createBoardViaApi } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent } from './fixtures/board';

/**
 * 058-card-owner-action-hub: the card owner action hub (trigger → Edit/Colour/Delete)
 * replaces the old always-hover-only Edit/Delete buttons and header colour swatch.
 * Covers quickstart.md scenarios #1, #2, #3, #4, #6, #7, #8, #12 and #14.
 * Contract: specs/058-card-owner-action-hub/contracts/owner-action-menu.md.
 *
 * Follows the two-identity pattern established in concurrent-board-session.spec.ts /
 * retrospective-board.spec.ts's anonymity test: a facilitator (board owner, "A") and a
 * distinct participant ("B"), each `signInAs` on their own browser context, both
 * looking at the same live board.
 */

const HELPED_COLUMN_TITLE = 'Qué me ayudó';

/** The "helped" column's own root element, carrying `data-card-column`
 * (contracts/owner-action-menu.md §6). Scoping to it disambiguates the
 * `data-add-card-trigger` "Agregar" button from every other column's. */
function helpedColumn(page: Page): Locator {
    return page.locator('[data-card-column]', { hasText: HELPED_COLUMN_TITLE });
}

/** Opens the owner action hub for a given card and returns the card locator. */
async function openHub(card: Locator): Promise<void> {
    await card.getByRole('button', { name: 'Acciones de tarjeta' }).click();
}

test('owner action hub: visibility, live colour sync, edit, delete-cancel, delete-confirm with focus handoff, and last-card focus on Add (#1, #2, #3, #4, #6, #7, #8)', async ({ browser, request }) => {
    const facilitatorEmail = 'e2e-owner-hub-facilitator@example.com';
    const facilitatorName = 'E2E Owner Hub Facilitator';
    const participantEmail = 'e2e-owner-hub-participant@example.com';
    const participantName = 'E2E Owner Hub Participant';
    const boardTitle = 'E2E Owner Action Hub Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, facilitatorEmail, facilitatorName);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, participantEmail, participantName);
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    try {
        // #1: B adds a card. Exactly one owner trigger; no pencil/bin buttons at rest
        // (the menu is closed, so those never exist in the DOM at all — contract B1).
        await addCardToFirstColumn(pageB, 'Card one');
        const cardOneB = cardByContent(pageB, 'Card one');
        await expect(cardOneB.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(1);
        await expect(cardOneB.getByRole('button', { name: 'Editar tarjeta' })).toHaveCount(0);
        await expect(cardOneB.getByRole('button', { name: 'Eliminar tarjeta' })).toHaveCount(0);

        // #2: A (a different identity, not the card's owner) sees no trigger at all on B's card.
        const cardOneA = cardByContent(pageA, 'Card one');
        await expect(cardOneA).toBeVisible();
        await expect(cardOneA.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(0);

        // #3: B opens the trigger, picks a different colour. The panel closes, the
        // card repaints immediately, an aria-live announcement fires, and A's view of
        // the same card updates live too.
        const classBeforeB = await cardOneB.getAttribute('class');
        const classBeforeA = await cardOneA.getAttribute('class');
        await openHub(cardOneB);
        const unselectedSwatch = pageB.locator('[role="menuitemradio"][aria-checked="false"]').first();
        await unselectedSwatch.click();
        await expect(pageB.getByRole('menu')).toHaveCount(0);
        await expect(cardOneB).not.toHaveClass(classBeforeB ?? '');
        await expect(cardOneB.locator('[aria-live="polite"]')).toHaveText(/Color cambiado a/);
        await expect(cardOneA).not.toHaveClass(classBeforeA ?? '', { timeout: 15_000 });

        // #4: Edit → Cancel. While editing, only Save/Cancel show (no trigger); after
        // Cancel, the trigger is back — and focused.
        await openHub(cardOneB);
        await pageB.getByRole('menuitem', { name: 'Editar tarjeta' }).click();
        await expect(cardOneB.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(0);
        const saveButton = cardOneB.getByRole('button', { name: 'Guardar' });
        const editCancelButton = cardOneB.getByRole('button', { name: 'Cancelar' });
        await expect(saveButton).toBeVisible();
        await expect(editCancelButton).toBeVisible();
        await editCancelButton.click();
        const triggerAfterEditCancel = cardOneB.getByRole('button', { name: 'Acciones de tarjeta' });
        await expect(triggerAfterEditCancel).toBeVisible();
        await expect(triggerAfterEditCancel).toBeFocused();

        // #6: Delete → Cancel keeps the card.
        await openHub(cardOneB);
        await pageB.getByRole('menuitem', { name: 'Eliminar tarjeta' }).click();
        await pageB.getByRole('menuitem', { name: 'Cancelar', exact: true }).click();
        await expect(cardOneB).toBeVisible();

        // Build a 3-card column (same owner) so the middle-delete / last-delete focus
        // scenarios (#7, #8) have real siblings to move focus to.
        await addCardToFirstColumn(pageB, 'Card two');
        await addCardToFirstColumn(pageB, 'Card three');
        const cardTwoB = cardByContent(pageB, 'Card two');
        const cardThreeB = cardByContent(pageB, 'Card three');

        // #7: delete the middle card (Confirm) — focus moves to the card below it.
        await openHub(cardTwoB);
        await pageB.getByRole('menuitem', { name: 'Eliminar tarjeta' }).click();
        await pageB.getByRole('menuitem', { name: 'Eliminar', exact: true }).click();
        await expect(cardTwoB).toHaveCount(0);
        await expect(cardThreeB).toBeFocused();

        // Delete "Card one" too (two cards remain beforehand, one after) — not itself
        // one of the numbered quickstart scenarios, but needed to get down to exactly
        // one remaining card for #8 below.
        await openHub(cardOneB);
        await pageB.getByRole('menuitem', { name: 'Eliminar tarjeta' }).click();
        await pageB.getByRole('menuitem', { name: 'Eliminar', exact: true }).click();
        await expect(cardOneB).toHaveCount(0);
        await expect(cardThreeB).toBeFocused();

        // #8: delete the last remaining card in the column — focus moves to that
        // column's "Add card" trigger.
        await openHub(cardThreeB);
        await pageB.getByRole('menuitem', { name: 'Eliminar tarjeta' }).click();
        await pageB.getByRole('menuitem', { name: 'Eliminar', exact: true }).click();
        await expect(cardThreeB).toHaveCount(0);
        const addCardTrigger = helpedColumn(pageB).locator('[data-add-card-trigger]');
        await expect(addCardTrigger).toBeFocused();
    } finally {
        await contextA.close();
        await contextB.close();
    }
});

test('a grouped member card shows the owner hub and it works; the grouping-suggestions preview shows none (#12)', async ({ browser, request }) => {
    test.setTimeout(150_000);

    const facilitatorEmail = 'e2e-owner-hub-group-facilitator@example.com';
    const facilitatorName = 'E2E Owner Hub Group Facilitator';
    const participantEmail = 'e2e-owner-hub-group-participant@example.com';
    const participantName = 'E2E Owner Hub Group Participant';
    const boardTitle = 'E2E Owner Action Hub Grouping Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, facilitatorEmail, facilitatorName);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, participantEmail, participantName);

    try {
        // B creates two cards; A (facilitator) groups them for real via the backend's
        // group-creation endpoint — deterministic and fast, unlike relying on the AI
        // suggestions pipeline to propose exactly this pairing.
        const headRes = await pageB.request.post(`/api/retrospectives/${boardId}/cards`, {
            data: { content: 'Owner hub group head card', column: 'helped' },
        });
        expect(headRes.ok()).toBeTruthy();
        const { id: headCardId } = (await headRes.json()) as { id: string };
        const memberRes = await pageB.request.post(`/api/retrospectives/${boardId}/cards`, {
            data: { content: 'Owner hub group member card', column: 'helped' },
        });
        expect(memberRes.ok()).toBeTruthy();
        const { id: memberCardId } = (await memberRes.json()) as { id: string };

        const groupRes = await pageA.request.post(`/api/retrospectives/${boardId}/groups`, {
            data: { headCardId, memberCardIds: [memberCardId] },
        });
        expect(groupRes.ok()).toBeTruthy();

        await pageB.goto(`/retro/${boardId}`);
        await expect(pageB.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

        // B's own grouped MEMBER card still shows the trigger, and it works (opens the
        // real menu with the Edit item in it).
        const memberCard = cardByContent(pageB, 'Owner hub group member card');
        await expect(memberCard).toBeVisible();
        const memberTrigger = memberCard.getByRole('button', { name: 'Acciones de tarjeta' });
        await expect(memberTrigger).toBeVisible();
        await memberTrigger.click();
        await expect(pageB.getByRole('menuitem', { name: 'Editar tarjeta' })).toBeVisible();
        await pageB.keyboard.press('Escape');
        await expect(pageB.getByRole('menu')).toHaveCount(0);

        // A separate, ungrouped set of cards — two near-duplicates plus one unrelated
        // — so the real AI suggestions panel has something to propose (reusing the
        // semantic-similarity pattern from retrospective-board.spec.ts's spec-044 test;
        // first use in a fresh context includes a one-time embedding-model download).
        const similarA = await pageB.request.post(`/api/retrospectives/${boardId}/cards`, {
            data: { content: 'Necesitamos mejorar la comunicación entre equipos', column: 'helped' },
        });
        expect(similarA.ok()).toBeTruthy();
        const similarB = await pageB.request.post(`/api/retrospectives/${boardId}/cards`, {
            data: { content: 'Deberíamos coordinarnos mejor con los demás equipos', column: 'helped' },
        });
        expect(similarB.ok()).toBeTruthy();
        const unrelated = await pageB.request.post(`/api/retrospectives/${boardId}/cards`, {
            data: { content: 'El servidor de CI tarda demasiado en arrancar', column: 'helped' },
        });
        expect(unrelated.ok()).toBeTruthy();

        const groupingTrigger = helpedColumn(pageB).getByRole('button', { name: 'Opciones de agrupación' });
        await groupingTrigger.click();
        await pageB.getByText('Agrupaciones sugeridas', { exact: true }).click();

        const panel = pageB.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
        await expect(panel).toBeVisible({ timeout: 15_000 });
        // Cold-start: allow generous time for the one-time model download + first inference.
        await expect(panel.getByText(/Grupo 1|No se encontraron sugerencias/)).toBeVisible({ timeout: 90_000 });

        const noSuggestions = await panel.getByText('No se encontraron sugerencias').isVisible().catch(() => false);
        if (!noSuggestions) {
            // Reveal the preview card list, then confirm it shows no owner trigger at
            // all — the preview hardcodes `canEdit={false}` / `currentUser=""`
            // (GroupSuggestionModal.tsx), so no card in it can ever show the hub,
            // including the very cards whose "live" counterpart does show one.
            const previewToggle = panel.getByLabel(/Mostrar tarjetas/).first();
            await previewToggle.click();
            await expect(panel.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(0);
        }
    } finally {
        await contextA.close();
        await contextB.close();
    }
});

test('facilitator coexistence: convert-to-action (⋮) on another participant\'s card and on the facilitator\'s own card, which also keeps its owner hub (#11, SC-010)', async ({ browser, request }) => {
    const facilitatorEmail = 'e2e-owner-hub-facilitator-coexist@example.com';
    const facilitatorName = 'E2E Owner Hub Facilitator Coexist';
    const participantEmail = 'e2e-owner-hub-participant-coexist@example.com';
    const participantName = 'E2E Owner Hub Participant Coexist';
    const boardTitle = 'E2E Owner Action Hub Facilitator Coexistence Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, facilitatorEmail, facilitatorName);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, participantEmail, participantName);
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    try {
        // B creates a card. A (the facilitator, not its owner) creates one of their own.
        await addCardToFirstColumn(pageB, 'Participant card for conversion');
        await addCardToFirstColumn(pageA, 'Facilitator own card');

        const participantCardOnA = cardByContent(pageA, 'Participant card for conversion');
        const ownCardOnA = cardByContent(pageA, 'Facilitator own card');
        await expect(participantCardOnA).toBeVisible({ timeout: 10_000 });
        await expect(ownCardOnA).toBeVisible({ timeout: 10_000 });

        // On B's card, A sees only the convert-to-action trigger (⋮) — no owner hub,
        // since A does not own it.
        await expect(participantCardOnA.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(0);
        const convertTriggerOnParticipantCard = participantCardOnA.getByLabel('Convertir en elemento de acción');
        await expect(convertTriggerOnParticipantCard).toBeVisible();

        // On A's own card, BOTH controls show, as two distinct elements with
        // distinct accessible names — the owner hub is never merged into (or
        // replaced by) the facilitator's convert-to-action control (FR-005, FR-016).
        const ownerTriggerOnOwnCard = ownCardOnA.getByRole('button', { name: 'Acciones de tarjeta' });
        const convertTriggerOnOwnCard = ownCardOnA.getByLabel('Convertir en elemento de acción');
        await expect(ownerTriggerOnOwnCard).toBeVisible();
        await expect(convertTriggerOnOwnCard).toBeVisible();
        expect(await ownerTriggerOnOwnCard.elementHandle()).not.toBe(await convertTriggerOnOwnCard.elementHandle());

        // Convert B's card through ⋮ — it still works for a non-owned card.
        await convertTriggerOnParticipantCard.click();
        const panel = pageA.getByRole('menu', { name: 'Convertir en elemento de acción' });
        await expect(panel).toBeVisible();
        await pageA.getByRole('button', { name: 'Convertir', exact: true }).click();
        await expect(pageA.getByText('Participant card for conversion')).toHaveCount(2, { timeout: 10_000 });

        // The owner hub on A's own card still works unaffected: opening it shows
        // "Editar tarjeta", and closing it (Escape) leaves the convert trigger intact.
        await ownerTriggerOnOwnCard.click();
        await expect(pageA.getByRole('menuitem', { name: 'Editar tarjeta' })).toBeVisible();
        await pageA.keyboard.press('Escape');
        await expect(pageA.getByRole('menu')).toHaveCount(0);

        // Convert A's own card through ⋮ too — the two controls coexist without
        // interfering with each other even on the same card.
        await convertTriggerOnOwnCard.click();
        const ownPanel = pageA.getByRole('menu', { name: 'Convertir en elemento de acción' });
        await expect(ownPanel).toBeVisible();
        await pageA.getByRole('button', { name: 'Convertir', exact: true }).click();
        await expect(pageA.getByText('Facilitator own card')).toHaveCount(2, { timeout: 10_000 });
    } finally {
        await contextA.close();
        await contextB.close();
    }
});

test('reduced motion: opening/closing the hub causes zero layout shift, and the panel stays within the viewport near the top edge at 1280px (#18, SC-006, FR-014)', async ({ page, request }) => {
    const facilitatorEmail = 'e2e-owner-hub-motion@example.com';
    const facilitatorName = 'E2E Owner Hub Motion';
    const boardTitle = 'E2E Owner Action Hub Motion Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);

    // OS/user "Reduce motion" preference (US3-4, FR-023/024).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 900 });

    await signInAs(page, facilitatorEmail, facilitatorName);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    // A freshly created card sits at the top of its (unscrolled) column — i.e. near
    // the viewport's top edge, where `top-end` placement is most likely to need to
    // flip or shift to stay fully on screen (FR-014).
    await addCardToFirstColumn(page, 'Motion test card');
    const card = cardByContent(page, 'Motion test card');
    const trigger = card.getByRole('button', { name: 'Acciones de tarjeta' });
    await expect(trigger).toBeVisible();

    // Install a PerformanceObserver for 'layout-shift' entries before opening, so
    // it captures every shift across the open → close round trip. `hadRecentInput`
    // entries are excluded, matching the standard CLS calculation; the click that
    // opens the panel itself counts as "recent input" and is excluded by the
    // browser already, but the clicks below are filtered defensively too.
    //
    // Deliberately NOT `buffered: true`: that flag replays every layout-shift
    // entry recorded since navigation start, including ones from the initial
    // page/board render that happened long before this point and have nothing to
    // do with the owner hub (confirmed by direct reproduction: the exact same
    // "shift" appears even with a multi-second wait and zero interaction with the
    // hub at all, once `buffered: true` is used). Omitting it scopes the
    // observer strictly to shifts occurring from here forward — i.e. attributable
    // to the open/close round trip below, which is what SC-006 is actually about.
    await page.evaluate(() => {
        (window as unknown as { __layoutShiftTotal: number }).__layoutShiftTotal = 0;
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
                if (!entry.hadRecentInput) {
                    (window as unknown as { __layoutShiftTotal: number }).__layoutShiftTotal += entry.value;
                }
            }
        });
        observer.observe({ type: 'layout-shift' });
        (window as unknown as { __layoutShiftObserver: PerformanceObserver }).__layoutShiftObserver = observer;
    });

    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    // FR-014: the panel's bounding box stays fully inside the viewport and is
    // <=90vh tall, even opened near the top edge.
    const menuBox = await menu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.y).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(1280);
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(900);
    expect(menuBox!.height).toBeLessThanOrEqual(0.9 * 900);

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);

    // Settle past a frame or two so the observer has delivered any pending entries
    // before reading the accumulated total.
    await page.waitForTimeout(200);
    const totalShift = await page.evaluate(
        () => (window as unknown as { __layoutShiftTotal: number }).__layoutShiftTotal,
    );
    expect(totalShift).toBe(0);
});

test('on an anonymous board, the owner trigger still shows only on each participant\'s own cards (#14)', async ({ browser, request }) => {
    const facilitatorEmail = 'e2e-owner-hub-anon-facilitator@example.com';
    const facilitatorName = 'E2E Owner Hub Anon Facilitator';
    const participantEmail = 'e2e-owner-hub-anon-participant@example.com';
    const participantName = 'E2E Owner Hub Anon Participant';
    const boardTitle = 'E2E Owner Action Hub Anonymous Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);
    const facilitatorCardRes = await request.post(`/api/retrospectives/${boardId}/cards`, {
        data: { content: 'Facilitator owner-hub card', column: 'helped' },
    });
    expect(facilitatorCardRes.ok()).toBeTruthy();

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, facilitatorEmail, facilitatorName);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, participantEmail, participantName);
    const participantCardRes = await pageB.request.post(`/api/retrospectives/${boardId}/cards`, {
        data: { content: 'Participant owner-hub card', column: 'helped' },
    });
    expect(participantCardRes.ok()).toBeTruthy();
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    try {
        // Turn on anonymity from A (the facilitator/owner — required for the control
        // to render at all, per retrospective-board.spec.ts's equivalent test).
        await pageA.getByRole('button', { name: 'Controles de Facilitador' }).click();
        const anonymityToggleA = pageA.getByTestId('anonymity-toggle');
        await expect(anonymityToggleA).toBeVisible({ timeout: 10_000 });
        await anonymityToggleA.click();
        await expect(anonymityToggleA).toHaveAttribute('aria-label', 'Desactivar modo anónimo');

        // Author names are hidden everywhere, on both sessions, without a reload.
        await expect(pageB.getByText('Tablero anónimo')).toBeVisible({ timeout: 5_000 });
        await expect(pageB.locator('main').getByText(facilitatorName, { exact: true })).toHaveCount(0);
        await expect(pageB.locator('main').getByText(participantName, { exact: true })).toHaveCount(0);

        // The owner trigger still shows only on each identity's own card — ownership
        // is by uid, which anonymity's display-only override never touches.
        const facilitatorCardOnA = cardByContent(pageA, 'Facilitator owner-hub card');
        const participantCardOnA = cardByContent(pageA, 'Participant owner-hub card');
        await expect(facilitatorCardOnA.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(1);
        await expect(participantCardOnA.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(0);

        const facilitatorCardOnB = cardByContent(pageB, 'Facilitator owner-hub card');
        const participantCardOnB = cardByContent(pageB, 'Participant owner-hub card');
        await expect(facilitatorCardOnB.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(0);
        await expect(participantCardOnB.getByRole('button', { name: 'Acciones de tarjeta' })).toHaveCount(1);
    } finally {
        await contextA.close();
        await contextB.close();
    }
});

// --- QA polish pass (T032): scenarios #9, #10 and #19 from quickstart.md,
// not previously automated. -------------------------------------------------

test('offline: colour change reverts with an error toast, and delete returns to the confirmation with an error toast, without silently failing (#9)', async ({ page, request }) => {
    const facilitatorEmail = 'e2e-owner-hub-offline@example.com';
    const facilitatorName = 'E2E Owner Hub Offline';
    const boardTitle = 'E2E Owner Action Hub Offline Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);
    await signInAs(page, facilitatorEmail, facilitatorName);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    await addCardToFirstColumn(page, 'Offline failure card');
    const card = cardByContent(page, 'Offline failure card');
    const trigger = card.getByRole('button', { name: 'Acciones de tarjeta' });

    try {
        await page.context().setOffline(true);

        // Colour: the PATCH to /api/cards/:id rejects — DraggableCard's
        // handleColorChangeViaHub reverts `pendingColor` and shows the
        // localized error toast (research.md §5).
        await trigger.click();
        await page.getByRole('menuitemradio', { name: 'Seleccionar color azul', exact: true }).click();
        await expect(page.getByText('No se pudo cambiar el color. Inténtalo de nuevo.')).toBeVisible({ timeout: 10_000 });
        await expect(card).toHaveClass(/bg-white/);
        await expect(card).not.toHaveClass(/bg-blue-50/);

        // Delete: the DELETE rejects — OwnerActionMenu's handleConfirmDelete
        // catches it, toasts, and returns to confirmingDelete (not closed,
        // not the item list) — the card stays and nothing fails silently.
        await trigger.click();
        await expect(page.getByRole('menu')).toBeVisible();
        await page.getByRole('menuitem', { name: 'Eliminar tarjeta' }).click();
        const confirmButton = page.getByRole('menuitem', { name: 'Eliminar', exact: true });
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();
        await expect(page.getByText('No se pudo eliminar la tarjeta. Inténtalo de nuevo.')).toBeVisible({ timeout: 10_000 });
        await expect(confirmButton).toBeVisible(); // back to confirmingDelete, not the item list
        await expect(card).toBeVisible();
    } finally {
        await page.context().setOffline(false);
    }
});

test('double-activating Confirm sends exactly one DELETE request (#10)', async ({ page, request }) => {
    const facilitatorEmail = 'e2e-owner-hub-double-confirm@example.com';
    const facilitatorName = 'E2E Owner Hub Double Confirm';
    const boardTitle = 'E2E Owner Action Hub Double Confirm Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);
    await signInAs(page, facilitatorEmail, facilitatorName);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });

    await addCardToFirstColumn(page, 'Double confirm card');
    const card = cardByContent(page, 'Double confirm card');
    await openHub(card);
    await page.getByRole('menuitem', { name: 'Eliminar tarjeta' }).click();
    const confirmButton = page.getByRole('menuitem', { name: 'Eliminar', exact: true });
    await expect(confirmButton).toBeVisible();

    const deleteRequests: string[] = [];
    page.on('request', (req) => {
        if (req.method() === 'DELETE' && /\/api\/cards\//.test(req.url())) {
            deleteRequests.push(req.url());
        }
    });

    // Two synchronous native clicks in the same tick — the real race this
    // guards against (OwnerActionMenu's `isDeletingInFlight` ref, checked
    // synchronously before any state update or await), not something
    // Playwright's own actionability checks (which would just see the
    // second click blocked by `disabled`) can be trusted to reproduce.
    await confirmButton.evaluate((el: HTMLElement) => {
        el.click();
        el.click();
    });

    await expect(card).toHaveCount(0, { timeout: 10_000 });
    expect(deleteRequests.length).toBe(1);
});

test('dark theme: the trigger is visible at rest and the full keyboard walkthrough (open, arrow-navigate, Space-select a colour, reopen, focus Delete, Escape) completes (#19, repeats #1 and #15)', async ({ page, request }) => {
    const facilitatorEmail = 'e2e-owner-hub-dark@example.com';
    const facilitatorName = 'E2E Owner Hub Dark';
    const boardTitle = 'E2E Owner Action Hub Dark Theme Board';

    const boardId = await createBoardViaApi(request, facilitatorEmail, facilitatorName, boardTitle);

    // Dark theme before any app script runs — same localStorage + runtime
    // class pattern as accessibility.spec.ts's forceTheme/applyThemeClass.
    await page.addInitScript(() => {
        try {
            window.localStorage.setItem('theme', 'dark');
        } catch {
            /* ignore */
        }
    });

    await signInAs(page, facilitatorEmail, facilitatorName);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText(boardTitle)).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    await addCardToFirstColumn(page, 'Dark theme owner hub card');
    const card = cardByContent(page, 'Dark theme owner hub card');

    // #1 (dark theme): exactly one trigger, visible, no legacy pencil/bin at rest.
    const trigger = card.getByRole('button', { name: 'Acciones de tarjeta' });
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toBeVisible();
    await expect(card.getByRole('button', { name: 'Editar tarjeta' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Eliminar tarjeta' })).toHaveCount(0);

    // #15 (dark theme): keyboard-only walkthrough. "Tab to the trigger" is
    // represented by `trigger.focus()`, matching this suite's and
    // accessibility.spec.ts's own established keyboard-test pattern — the
    // focus ring's contrast itself is unit-tested across both themes and
    // all 15 card colours by cardColors.a11y.test.ts (T024), so this test's
    // own job is confirming the keyboard flow completes in the real browser
    // under dark theme, not re-deriving contrast numbers.
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Editar tarjeta' })).toBeFocused();

    // Arrows move through the items and the colour grid; Space (not Enter)
    // selects a swatch.
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitemradio', { name: 'Seleccionar color blanco', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(menu.getByRole('menuitemradio', { name: 'Seleccionar color azul', exact: true })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(menu).toHaveCount(0);
    await expect(card).toHaveClass(/bg-blue-50/);
    await expect(trigger).toBeFocused();

    // Reopen -> jump straight to the Delete item via End -> Escape closes
    // fully (without ever activating Confirm) and returns focus to the trigger.
    // Wait for the panel's own initial focus (on "Edit card") to actually land
    // before sending End: `handlePanelKeyDown`'s Home/End handling keys off
    // `event.target` being one of its own known refs (edit/delete/swatch) —
    // firing End one tick too early, while focus is still on the trigger
    // during the open transition, makes it a no-op (flaked once under a full,
    // 230-test sequential run; reproduced 0/2 times in isolation, confirming
    // it's this test's own race, not a production bug).
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Editar tarjeta' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(menu.getByRole('menuitem', { name: 'Eliminar tarjeta' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(card).toBeVisible();
});
