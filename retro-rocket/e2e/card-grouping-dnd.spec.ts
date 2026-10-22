import { test, expect, type Page } from '@playwright/test';
import {
    CONFLICT_TOAST,
    DEFAULT_GROUP_TITLE,
    HOLD_MS,
    beginDrag,
    card,
    column,
    columnTokens,
    dragToGroup,
    fetchState,
    groupRoot,
    groupTitleButton,
    openTwoBrowsers,
    seedGroup,
    seedGroupingBoard,
} from './fixtures/cardGrouping';

/**
 * Spec 059 (drag-to-group cards), T075: quickstart scenarios 1-11 end to end, with two
 * browser contexts (A = owner, B = participant) against the Firebase emulators.
 *
 * Boards and groups are seeded through the API so each test pays only for the interaction
 * it verifies; every drag is a real pointer drag (page.mouse down/move/up) because dnd-kit's
 * PointerSensor ignores synthetic events. Grouping arms after DWELL_MS (180 ms), so grouping
 * drags hold for HOLD_MS (DWELL_MS + 50).
 *
 * All scenarios are live (member drag T069-T070 and the FR-033 confirm T074 have landed).
 */

/** Counts card-mutating requests (move / reorder / group writes) issued by a page. */
function trackWrites(page: Page): { count: () => number } {
    let n = 0;
    page.on('request', (req) => {
        if (req.method() === 'GET') return;
        if (/\/(move|reorder|groups|column-order)(\/|$|\?)/.test(req.url()) || /\/api\/groups\//.test(req.url())) n += 1;
    });
    return { count: () => n };
}

// --- Scenario 1: create by drag (US1) --------------------------------------------------

test('1. dropping a card on another card creates a group in the target slot, with title auto-edit for the dragger only', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'create', ['Alpha card', 'Bravo card', 'Charlie card']);
    const { pageA, pageB, close } = await openTwoBrowsers(browser, board, 'create');
    const labels = ['Alpha card', 'Bravo card', 'Charlie card'];
    try {
        await expect.poll(() => columnTokens(pageA, labels)).toEqual(labels);

        // Drag the FIRST card onto the LAST one: if the group wrongly took the source's slot
        // it would render first; in the target's slot, Bravo stays first.
        await dragToGroup(pageA, card(pageA, 'Alpha card'), card(pageA, 'Charlie card'), 'Charlie card');

        await expect(groupTitleButton(pageA, DEFAULT_GROUP_TITLE).or(pageA.getByRole('textbox', { name: 'Título del grupo' }))).toBeVisible();
        // In A: title is in edit mode, focused, selected.
        const input = pageA.getByRole('textbox', { name: 'Título del grupo' });
        await expect(input).toBeFocused();

        // The exiting card cross-fades out of the slot (~180 ms), so poll for the settled order.
        await expect.poll(async () => {
            const t = await columnTokens(pageA, labels);
            return [t[0], t[1].startsWith('G:'), t.slice(2).sort()];
        }).toEqual(['Bravo card', true, ['Alpha card', 'Charlie card']]);

        // In B: same structure within a second or so, and NOT in edit mode.
        await expect(groupTitleButton(pageB, DEFAULT_GROUP_TITLE)).toBeVisible({ timeout: 5_000 });
        await expect(pageB.getByRole('textbox', { name: 'Título del grupo' })).toHaveCount(0);
        await expect.poll(async () => {
            const t = await columnTokens(pageB, labels);
            return [t[0], t[1].startsWith('G:'), t.slice(2).sort()];
        }).toEqual(['Bravo card', true, ['Alpha card', 'Charlie card']]);

        // Enter keeps the default title and leaves edit mode.
        await pageA.keyboard.press('Enter');
        await expect(groupTitleButton(pageA, DEFAULT_GROUP_TITLE)).toBeVisible();
    } finally {
        await close();
    }
});

// --- Regression: the drag overlay follows the pointer (it is portalled out of the blurred column) ---

test('0. the drag overlay is drawn under the pointer (regression: it was offset by the backdrop-blur column wrapper)', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'overlay', ['Overlay one', 'Overlay two']);
    const { pageA, close } = await openTwoBrowsers(browser, board, 'overlay');
    try {
        const source = card(pageA, 'Overlay one');
        await expect(card(pageA, 'Overlay two')).toBeVisible();
        const before = (await source.boundingBox())!;
        await beginDrag(pageA, source, card(pageA, 'Overlay two'), { zone: 'center', steps: 10 });
        await pageA.waitForTimeout(400); // lift spring settles
        const overlay = column(pageA).locator('[data-testid="draggable-card"]').last();
        const box = (await overlay.boundingBox())!;
        const target = (await card(pageA, 'Overlay two').boundingBox())!;
        // The grab moved by (target centre - source centre), so the overlay centre must be at the target centre.
        const dx = Math.abs(box.x + box.width / 2 - (target.x + target.width / 2));
        const dy = Math.abs(box.y + box.height / 2 - (target.y + target.height / 2));
        expect(Math.max(dx, dy), `overlay centre is ${Math.round(dx)}px/${Math.round(dy)}px from where the pointer put it (source was at ${Math.round(before.x)},${Math.round(before.y)})`).toBeLessThan(12);
    } finally {
        await close();
    }
});

// --- Scenario 2: fast fly-over reorders, never groups (SC-002) --------------------------

test('2. flying over a card centre without dwelling reorders and creates no group', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'flyover', ['Fly one', 'Fly two', 'Fly three']);
    const { pageA, close } = await openTwoBrowsers(browser, board, 'flyover');
    const labels = ['Fly one', 'Fly two', 'Fly three'];
    try {
        await expect.poll(() => columnTokens(pageA, labels)).toEqual(labels);

        const session = await beginDrag(pageA, card(pageA, 'Fly one'), card(pageA, 'Fly three'), {
            zone: 'after',
            viaPoints: [card(pageA, 'Fly two')], // passes through the middle of Fly two without stopping
            steps: 6,
        });
        await expect(pageA.locator('[data-group-target="armed"]')).toHaveCount(0);
        await session.drop();

        await expect.poll(() => columnTokens(pageA, labels), { timeout: 10_000 }).toEqual(['Fly two', 'Fly three', 'Fly one']);
        expect((await fetchState(request, board.boardId)).groups ?? []).toHaveLength(0);
    } finally {
        await close();
    }
});

// --- Scenario 3: rename (US2), two browsers ---------------------------------------------

test('3. renaming a group propagates to the other browser; Escape cancels; clearing restores the default title', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'rename', ['Pair one', 'Pair two']);
    await seedGroup(request, board.boardId, [board.cardIds['Pair one'], board.cardIds['Pair two']]);
    const { pageA, pageB, close } = await openTwoBrowsers(browser, board, 'rename');
    try {
        await expect(groupTitleButton(pageA, DEFAULT_GROUP_TITLE)).toBeVisible();

        await groupTitleButton(pageA, DEFAULT_GROUP_TITLE).click();
        const input = pageA.getByRole('textbox', { name: 'Título del grupo' });
        await expect(input).toBeFocused();
        await input.fill('Pairing');
        await pageA.keyboard.press('Enter');
        await expect(groupTitleButton(pageA, 'Pairing')).toBeFocused(); // T3: focus back to the button
        await expect(groupTitleButton(pageB, 'Pairing')).toBeVisible({ timeout: 5_000 });

        // Escape cancels.
        await groupTitleButton(pageA, 'Pairing').click();
        await pageA.getByRole('textbox', { name: 'Título del grupo' }).fill('x');
        await pageA.keyboard.press('Escape');
        await expect(groupTitleButton(pageA, 'Pairing')).toBeVisible();
        await expect(groupTitleButton(pageB, 'Pairing')).toBeVisible();

        // Clearing falls back to the default title (localized; the e2e locale is Spanish).
        await groupTitleButton(pageA, 'Pairing').click();
        await pageA.getByRole('textbox', { name: 'Título del grupo' }).fill('');
        await pageA.keyboard.press('Enter');
        await expect(groupTitleButton(pageA, DEFAULT_GROUP_TITLE)).toBeVisible();
        await expect(groupTitleButton(pageB, DEFAULT_GROUP_TITLE)).toBeVisible({ timeout: 5_000 });

        // Persisted: the title is cleared server-side, so a reload shows the default too.
        await pageB.reload();
        await expect(groupTitleButton(pageB, DEFAULT_GROUP_TITLE)).toBeVisible({ timeout: 15_000 });
    } finally {
        await close();
    }
});

// --- Scenario 4: add to an existing group (US3) -----------------------------------------

test('4. dropping a card on a group appends it as the last member, with live totals in both browsers', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'addgroup', ['Member one', 'Member two', 'Loose card']);
    await seedGroup(request, board.boardId, [board.cardIds['Member one'], board.cardIds['Member two']], 'Team group');
    const { pageA, pageB, close } = await openTwoBrowsers(browser, board, 'addgroup');
    try {
        const session = await beginDrag(pageA, card(pageA, 'Loose card'), groupRoot(pageA, 'Team group'), { zone: 'center', holdMs: HOLD_MS });
        await expect(pageA.locator('[data-group-target="armed"]', { hasText: 'Team group' })).toBeVisible();
        await session.drop();

        await expect(pageA.getByText('3 tarjetas')).toBeVisible();
        await expect(pageB.getByText('3 tarjetas')).toBeVisible({ timeout: 5_000 });
        const state = await fetchState(request, board.boardId);
        expect(state.groups).toHaveLength(1);
        expect(state.groups![0].memberCardIds).toContain(board.cardIds['Loose card']);
    } finally {
        await close();
    }
});

// --- Scenario 5: cross-column is a no-op (US4) ------------------------------------------

test('5. dropping over another column is a no-op: card springs back, zero writes, no group in either browser', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'crosscol', ['Stay one', 'Stay two']);
    const { pageA, pageB, close } = await openTwoBrowsers(browser, board, 'crosscol');
    const writes = trackWrites(pageA);
    const labels = ['Stay one', 'Stay two'];
    try {
        await expect.poll(() => columnTokens(pageA, labels)).toEqual(labels);

        const session = await beginDrag(pageA, card(pageA, 'Stay one'), column(pageA, 1), { zone: 'center', holdMs: HOLD_MS });
        await expect(pageA.locator('[data-group-target="armed"]')).toHaveCount(0);
        await session.drop();

        await pageA.waitForTimeout(500); // let any (unwanted) write and the spring-back settle
        expect(writes.count()).toBe(0);
        expect(await columnTokens(pageA, labels)).toEqual(labels);
        expect(await columnTokens(pageB, labels)).toEqual(labels);
        await expect(column(pageA, 1).locator('[data-testid="draggable-card"]', { hasText: 'Stay one' })).toHaveCount(0);

        const state = await fetchState(request, board.boardId);
        expect(state.groups ?? []).toHaveLength(0);
        expect(state.cards?.find((c) => c.content === 'Stay one')?.column).toBe('helped');
    } finally {
        await close();
    }
});

// --- Scenario 6: group-by-user disables grouping (US4) ---------------------------------

test('6. in group-by-user mode a long hover on a card centre shows no grouping feedback and a drop creates no group', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'byuser', ['User one', 'User two'], 'user');
    const { pageA, close } = await openTwoBrowsers(browser, board, 'byuser');
    try {
        await expect(card(pageA, 'User one')).toBeVisible();
        await expect(card(pageA, 'User two')).toBeVisible();

        const session = await beginDrag(pageA, card(pageA, 'User one'), card(pageA, 'User two'), { zone: 'center', holdMs: HOLD_MS });
        await expect(pageA.locator('[data-group-target="armed"]')).toHaveCount(0);
        await expect(pageA.getByText('Soltar para agrupar')).toHaveCount(0);
        await session.drop();

        await pageA.waitForTimeout(500);
        expect((await fetchState(request, board.boardId)).groups ?? []).toHaveLength(0);
        await expect(pageA.getByRole('textbox', { name: 'Título del grupo' })).toHaveCount(0);
    } finally {
        await close();
    }
});

// --- Scenario 7: keyboard only (US5) ---------------------------------------------------

test('7a. keyboard-only: the "Agrupar con…" picker groups two cards and focuses the new group title', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'picker', ['Kbd one', 'Kbd two', 'Kbd three']);
    const { pageA, close } = await openTwoBrowsers(browser, board, 'picker');
    try {
        const trigger = card(pageA, 'Kbd one').getByRole('button', { name: /Agrupar con/ });
        await trigger.focus();
        await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
        await pageA.keyboard.press('Enter');

        const listbox = pageA.getByRole('listbox', { name: 'Agrupar esta tarjeta con' });
        await expect(listbox).toBeVisible();
        await pageA.keyboard.press('ArrowDown');
        await pageA.keyboard.press('Enter');

        await expect(listbox).toHaveCount(0);
        await expect(pageA.getByRole('textbox', { name: 'Título del grupo' })).toBeFocused();
        expect((await fetchState(request, board.boardId)).groups).toHaveLength(1);
    } finally {
        await close();
    }
});

test('7b. keyboard drag: pressing G switches to grouping, announces it, and Space creates the group', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'gtoggle', ['Key one', 'Key two']);
    const { pageA, close } = await openTwoBrowsers(browser, board, 'gtoggle');
    try {
        const handle = card(pageA, 'Key one').getByRole('button', { name: 'Mover tarjeta (arrastrar)' });
        await handle.focus();
        await expect(card(pageA, 'Key two')).toBeVisible();
        await pageA.keyboard.press('Space');
        await expect(handle).toHaveAttribute('aria-pressed', 'true'); // picked up before moving
        // After a long run of earlier specs the first ArrowDown after pick-up has been observed to
        // be dropped (announcement stays at "Posición 1 de 2"), which leaves the drag over its own
        // slot where G is a no-op. Move until dnd-kit reports a different target, then toggle once.
        const liveText = () => pageA.evaluate(() => Array.from(document.querySelectorAll('[aria-live]')).map((e) => e.textContent).join(' | '));
        let moves = 0;
        await expect(async () => {
            moves += 1;
            await pageA.keyboard.press('ArrowDown');
            await expect.poll(liveText, { timeout: 1_500 }).toMatch(/Posición 2 de 2|Sobre la tarjeta/);
        }).toPass({ timeout: 15_000 });
        test.info().annotations.push({ type: 'arrow-down-attempts', description: String(moves) });
        await pageA.keyboard.press('g');
        await expect(pageA.locator('[data-group-target="armed"]')).toHaveCount(1);
        // dnd-kit's live region is replaced by every new message, so read it by polling.
        await expect.poll(() => pageA.evaluate(() => Array.from(document.querySelectorAll('[aria-live]')).map((e) => e.textContent).join(' | '))).toMatch(/grupo nuevo con ambas tarjetas/i);
        await pageA.keyboard.press('Space');

        await expect(groupTitleButton(pageA, DEFAULT_GROUP_TITLE).or(pageA.getByRole('textbox', { name: 'Título del grupo' }))).toBeVisible();
        expect((await fetchState(request, board.boardId)).groups).toHaveLength(1);
    } finally {
        await close();
    }
});

// --- Scenario 8: concurrency (FR-022 to FR-024) ----------------------------------------

test('8. a card deleted mid-drag turns the drop into a conflict toast, nothing is grouped, and no orphan remains after reload', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'conflict', ['Conflict X', 'Conflict Y']);
    const { ctxB, pageA, pageB, close } = await openTwoBrowsers(browser, board, 'conflict');
    void ctxB;
    try {
        await expect(card(pageB, 'Conflict X')).toBeVisible();
        await expect(card(pageB, 'Conflict Y')).toBeVisible();

        // Make B's live view go stale on purpose: realtime frames from the server are
        // swallowed from now on, so B still renders Y when Y is deleted. (Swallowing the
        // relay makes the stale-target race deterministic instead of timing-dependent.)
        // Installed by reloading B with the route in place.
        await pageB.routeWebSocket(/\/live$/, (ws) => {
            const server = ws.connectToServer();
            ws.onMessage((m) => server.send(m));
            server.onMessage(() => { /* drop every server frame: B never learns about the delete */ });
        });
        await pageB.reload();
        await expect(card(pageB, 'Conflict Y')).toBeVisible({ timeout: 30_000 });

        // B arms Y, then the owner deletes Y (server side), then B releases.
        const session = await beginDrag(pageB, card(pageB, 'Conflict X'), card(pageB, 'Conflict Y'), { zone: 'center', holdMs: HOLD_MS });
        await expect(pageB.locator('[data-group-target="armed"]', { hasText: 'Conflict Y' })).toBeVisible();
        const del = await request.delete(`/api/cards/${board.cardIds['Conflict Y']}`);
        expect(del.ok()).toBeTruthy();
        await session.drop();

        // react-hot-toast mounts in #_rht_toaster; the column's sr-only live region repeats the text.
        await expect(pageB.locator('[id="_rht_toaster"]').getByText(CONFLICT_TOAST)).toBeVisible({ timeout: 10_000 });
        await expect(pageB.getByRole('textbox', { name: 'Título del grupo' })).toHaveCount(0);

        // Server truth: nothing grouped, X still ungrouped, no group references Y.
        const state = await fetchState(request, board.boardId);
        expect(state.groups ?? []).toHaveLength(0);
        expect(state.cards?.find((c) => c.id === board.cardIds['Conflict X'])?.groupId ?? null).toBeNull();
        await pageA.reload();
        await expect(card(pageA, 'Conflict X')).toBeVisible({ timeout: 15_000 });
        await expect(card(pageA, 'Conflict Y')).toHaveCount(0);
        await expect(pageA.locator('h3').filter({ hasText: DEFAULT_GROUP_TITLE })).toHaveCount(0);
    } finally {
        await close();
    }
});

// --- Scenario 9: drag out and move between groups (US6) --------------------------------

test('9a. dragging a member out to a gap ungroups it at that slot and the group keeps its remaining cards', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'dragout', ['G1 one', 'G1 two', 'G1 three', 'Free one', 'Free two']);
    await seedGroup(request, board.boardId, [board.cardIds['G1 one'], board.cardIds['G1 two'], board.cardIds['G1 three']], 'First group');
    const { pageA, pageB, close } = await openTwoBrowsers(browser, board, 'dragout');
    try {
        await beginDrag(pageA, card(pageA, 'G1 three'), card(pageA, 'Free two'), { zone: 'before' }).then((s) => s.drop());

        await expect(pageA.getByText('2 tarjetas')).toBeVisible();
        await expect(pageB.getByText('2 tarjetas')).toBeVisible({ timeout: 5_000 });
        const state = await fetchState(request, board.boardId);
        expect(state.cards?.find((c) => c.id === board.cardIds['G1 three'])?.groupId ?? null).toBeNull();
    } finally {
        await close();
    }
});

test('9b. moving a member into another group works, and the source group dissolves at one card (remaining card takes its slot)', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'moveg', ['A one', 'A two', 'A three', 'B one', 'B two']);
    await seedGroup(request, board.boardId, [board.cardIds['A one'], board.cardIds['A two'], board.cardIds['A three']], 'Group A');
    await seedGroup(request, board.boardId, [board.cardIds['B one'], board.cardIds['B two']], 'Group B');
    const { pageA, pageB, close } = await openTwoBrowsers(browser, board, 'moveg');
    try {
        const session = await beginDrag(pageA, card(pageA, 'B two'), groupRoot(pageA, 'Group A'), { zone: 'center', holdMs: HOLD_MS });
        await expect(pageA.locator('[data-group-target="armed"]', { hasText: 'Group A' })).toBeVisible();
        await session.drop();

        await expect(groupTitleButton(pageA, 'Group B')).toHaveCount(0); // dissolved at one card
        await expect(groupTitleButton(pageB, 'Group B')).toHaveCount(0, { timeout: 5_000 });
        await expect(pageA.getByText('4 tarjetas')).toBeVisible();
        const state = await fetchState(request, board.boardId);
        expect(state.groups).toHaveLength(1);
        expect(state.cards?.find((c) => c.id === board.cardIds['B one'])?.groupId ?? null).toBeNull();
    } finally {
        await close();
    }
});

// --- Scenario 10: mode-switch safeguard (FR-033) ---------------------------------------

// (T074 landed) confirm BEFORE persisting the criteria change). Uses page.on('dialog');
// if the final UX is an accessible in-page dialog instead of window.confirm, switch the
// two handlers below to getByRole('alertdialog'/'dialog') buttons.
test('10. leaving AI suggestions with manual groups asks first: Cancel keeps mode and groups, OK undoes the groups', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'teardown', ['Td one', 'Td two'], 'suggestions');
    const groupId = await seedGroup(request, board.boardId, [board.cardIds['Td one'], board.cardIds['Td two']], 'Manual group');
    const { pageA, close } = await openTwoBrowsers(browser, board, 'teardown');
    try {
        const messages: string[] = [];
        let accept = false;
        pageA.on('dialog', async (dialog) => {
            messages.push(dialog.message());
            if (accept) await dialog.accept(); else await dialog.dismiss();
        });

        const switchToNone = async () => {
            await pageA.getByRole('button', { name: 'Opciones de agrupación' }).first().click();
            await pageA.getByText('Sin agrupación', { exact: true }).click();
        };

        await expect(groupTitleButton(pageA, 'Manual group')).toBeVisible();

        // Cancel: group stays, nothing persisted (mode still suggestions on the server).
        await switchToNone();
        await expect.poll(() => messages.length).toBe(1);
        expect(messages[0]).toMatch(/deshará los 1 grupos|deshará/);
        await expect(groupTitleButton(pageA, 'Manual group')).toBeVisible();
        const afterCancel = await fetchState(request, board.boardId);
        expect(afterCancel.groups?.some((g) => g.id === groupId)).toBe(true);
        await pageA.reload();
        await expect(groupTitleButton(pageA, 'Manual group')).toBeVisible({ timeout: 15_000 });

        // Confirm: groups are undone.
        accept = true;
        await switchToNone();
        await expect(groupTitleButton(pageA, 'Manual group')).toHaveCount(0, { timeout: 10_000 });
        await expect.poll(async () => ((await fetchState(request, board.boardId)).groups ?? []).length).toBe(0);
    } finally {
        await close();
    }
});

// --- Scenario 11: interleaved order persists --------------------------------------------

test('11. a card reordered between two groups keeps that position in both browsers after a reload', async ({ browser, request }) => {
    const board = await seedGroupingBoard(request, 'interleave', ['Left one', 'Left two', 'Right one', 'Right two', 'Between card']);
    await seedGroup(request, board.boardId, [board.cardIds['Left one'], board.cardIds['Left two']], 'Left group');
    await seedGroup(request, board.boardId, [board.cardIds['Right one'], board.cardIds['Right two']], 'Right group');
    const labels = ['Left one', 'Left two', 'Right one', 'Right two', 'Between card'];
    const { pageA, pageB, close } = await openTwoBrowsers(browser, board, 'interleave');
    try {
        await expect(groupTitleButton(pageA, 'Left group')).toBeVisible();
        await expect(groupTitleButton(pageA, 'Right group')).toBeVisible();

        // Work out which group renders second, then drop the loose card on its top edge.
        const before = await columnTokens(pageA, labels);
        const [firstGroup, secondGroup] = before.filter((t) => t.startsWith('G:')).map((t) => t.slice(2));
        await beginDrag(pageA, card(pageA, 'Between card'), groupRoot(pageA, secondGroup), { zone: 'before' }).then((s) => s.drop());

        const isBetween = (tokens: string[]) => {
            const g1 = tokens.indexOf(`G:${firstGroup}`);
            const g2 = tokens.indexOf(`G:${secondGroup}`);
            // Ungrouped, so it sits at the top level between the two group headings' blocks:
            // after every member of the first group and before the second heading.
            const own = tokens.lastIndexOf('Between card');
            return g1 < own && own < g2;
        };
        await expect.poll(async () => isBetween(await columnTokens(pageA, labels)), { timeout: 10_000 }).toBe(true);
        const orderA = await columnTokens(pageA, labels);
        await expect.poll(async () => columnTokens(pageB, labels), { timeout: 10_000 }).toEqual(orderA);

        await pageA.reload();
        await pageB.reload();
        await expect(groupTitleButton(pageA, 'Left group')).toBeVisible({ timeout: 15_000 });
        await expect(groupTitleButton(pageB, 'Left group')).toBeVisible({ timeout: 15_000 });
        expect(await columnTokens(pageA, labels)).toEqual(orderA);
        expect(await columnTokens(pageB, labels)).toEqual(orderA);
    } finally {
        await close();
    }
});
