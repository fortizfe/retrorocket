import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInWithGoogle, signInAs, createBoard, createBoardViaApi } from './fixtures/auth-helpers';
import { getEmulatorFirestore } from './fixtures/firestoreAdmin';
import { addCardToFirstColumn, cardByContent } from './fixtures/board';

// FR-001/FR-002/SC-002 (zero direct Firestore access, including for live updates) is
// verified statically and deterministically for the whole retrospective board screen
// by src/test/architecture/retrospective-board-no-firestore.test.ts (as each story
// migrates its slice); this spec focuses on functional correctness of the
// backend-mediated load/join/live-update flow, which E2E is better suited to verify.
//
// US1's Acceptance Scenario 3 ("another participant adds a card, it appears live")
// cannot be *fully* demonstrated until US2 (card creation) lands — this spec covers it
// synthetically via a direct Firestore-emulator write (bypassing the REST API
// entirely), asserting the connected WebSocket client still receives the resulting
// entity_change event. The true "a real participant creates a card via the UI"
// scenario is added once US2's E2E task extends this same file.

/** Collects responses matching `urlSubstring`+`method` from the moment it's called —
 * more robust than `Promise.all([page.waitForResponse(...), page.goto(...)])`, which
 * races the listener's registration against page.goto's own internal navigation steps. */
function collectResponses(page: import('@playwright/test').Page, urlSubstring: string, method: string): { latest: () => import('@playwright/test').Response | undefined } {
    const responses: import('@playwright/test').Response[] = [];
    page.on('response', (res) => {
        if (res.url().includes(urlSubstring) && res.request().method() === method) responses.push(res);
    });
    return { latest: () => responses[responses.length - 1] };
}

test('opens a board for the first time — auto-joins and renders the full state via the backend', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner@example.com', 'E2E Retro Owner', 'E2E Retro Board');

    await signInWithGoogle(page, context);
    const stateResponses = collectResponses(page, `/api/retrospectives/${boardId}`, 'GET');
    const joinResponses = collectResponses(page, `/api/retrospectives/${boardId}/join`, 'POST');

    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Retro Board')).toBeVisible({ timeout: 30_000 });

    await expect.poll(() => stateResponses.latest()?.ok()).toBe(true);
    await expect.poll(() => joinResponses.latest()?.ok()).toBe(true);
});

test('re-opening an already-joined board does not create a duplicate participant', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner2@example.com', 'E2E Retro Owner 2', 'E2E Rejoin Board');

    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Rejoin Board')).toBeVisible({ timeout: 30_000 });

    await page.goto('/dashboard');
    const stateResponses = collectResponses(page, `/api/retrospectives/${boardId}`, 'GET');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Rejoin Board')).toBeVisible({ timeout: 30_000 });

    await expect.poll(() => stateResponses.latest()?.ok()).toBe(true);
    const body = (await stateResponses.latest()!.json()) as { participantCount: number };
    // Owner (1) + this same signed-in user re-joining (idempotent, FR-005) = still 2,
    // not 3 — the count from the FIRST join here already included this user.
    expect(body.participantCount).toBe(2);
});

// 040, US1: the platform forces a WebSocket reconnect roughly every 5 minutes
// (maxDuration), which resyncs via join()+GET /api/retrospectives/:id on every
// reconnect, not just the first mount. This regression-guards that a *WS-triggered*
// reconnect (as opposed to the page-navigation-triggered rejoin above) still stays
// idempotent after the join-dedup refactor (JoinRetrospective passing its
// already-fetched board through to participantPort.join instead of a second read).
test('a forced WebSocket reconnect on an already-joined board does not create a duplicate participant', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner10@example.com', 'E2E Retro Owner 10', 'E2E Reconnect Rejoin Board');

    let forceCloseLatest: (() => void) | undefined;
    await page.routeWebSocket(/\/live$/, (ws) => {
        ws.connectToServer(); // default bidirectional passthrough — no interception, just a hook to close on demand
        forceCloseLatest = () => ws.close();
    });

    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Reconnect Rejoin Board')).toBeVisible({ timeout: 30_000 });

    const joinResponses = collectResponses(page, `/api/retrospectives/${boardId}/join`, 'POST');
    const stateResponses = collectResponses(page, `/api/retrospectives/${boardId}`, 'GET');

    // Force exactly one WebSocket close/reconnect (no page.reload()) — on reconnect
    // the client resyncs via join()+GET /api/retrospectives/:id, same as a real
    // ~5-minute forced reconnection would.
    forceCloseLatest?.();

    await expect.poll(() => joinResponses.latest()?.ok()).toBe(true);
    await expect.poll(() => stateResponses.latest()?.ok()).toBe(true);
    const stateBody = (await stateResponses.latest()!.json()) as { participantCount: number };
    // Owner (1, from createBoardViaApi) + this same signed-in user reconnecting
    // (idempotent, FR-005) = still 2, not 3 — mirrors the sibling page-navigation
    // rejoin test above.
    expect(stateBody.participantCount).toBe(2);
});

test('a load failure (backend unreachable) shows a visible error state, not a blank board', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner3@example.com', 'E2E Retro Owner 3', 'E2E Load Failure Board');

    await signInWithGoogle(page, context);
    await page.route(`**/api/retrospectives/${boardId}`, (route) => route.abort('failed'));

    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('Retrospectiva no encontrada')).toBeVisible({ timeout: 30_000 });
});

test('a board deleted mid-session shows a clear "no longer exists" state without a full page reload', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner4@example.com', 'E2E Retro Owner 4', 'E2E Deleted Board');

    // Deterministically forces exactly one close of the board's live WebSocket
    // connection (proxying every other frame straight through to the real server) —
    // more reliable than context.setOffline(), which does not consistently tear down
    // an already-established WebSocket in time for a test assertion. This exercises
    // the client's real reconnect-with-backoff + resync path (contracts/realtime-
    // protocol.md), not a mocked one: only the close event itself is injected.
    let forceCloseLatest: (() => void) | undefined;
    await page.routeWebSocket(/\/live$/, (ws) => {
        ws.connectToServer(); // default bidirectional passthrough — no interception, just a hook to close on demand
        forceCloseLatest = () => ws.close();
    });

    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Deleted Board')).toBeVisible({ timeout: 30_000 });

    const deleteRes = await request.delete(`/api/boards/${boardId}`);
    expect(deleteRes.ok()).toBeTruthy();

    // Force the realtime client to drop and reconnect (no page.reload()) — on
    // reconnect it resyncs via GET /api/retrospectives/:id, which now 404s.
    forceCloseLatest?.();

    await expect(page.getByText('Este tablero ya no existe')).toBeVisible({ timeout: 30_000 });
});

test('a direct Firestore-emulator write (bypassing the REST API) is relayed live over the WebSocket channel', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner5@example.com', 'E2E Retro Owner 5', 'E2E Live Relay Board');

    await signInWithGoogle(page, context);

    // Capture WS frames directly — at this point in the migration (US1 complete, US2's
    // card UI still Firestore-direct pending its own rewiring task) the DOM alone can't
    // distinguish "the new realtime channel delivered this" from "the old onSnapshot
    // listener happened to render it," since both are connected to the same emulator.
    const framesReceived: string[] = [];
    page.on('websocket', (ws) => {
        if (!ws.url().includes('/live')) return;
        ws.on('framereceived', (frame) => framesReceived.push(String(frame.payload)));
    });

    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Live Relay Board')).toBeVisible({ timeout: 30_000 });

    // Give the WebSocket upgrade a moment to complete before writing.
    await page.waitForTimeout(1_000);

    const db = getEmulatorFirestore();
    const cardRef = await db.collection('cards').add({
        content: 'Written directly to the emulator, not via the REST API',
        column: 'helped',
        createdBy: 'synthetic-writer-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: boardId,
        votes: 0,
        likes: [],
        reactions: [],
        order: 0,
    });

    await expect(async () => {
        const relayed = framesReceived.some((raw) => {
            try {
                const parsed = JSON.parse(raw) as { type?: string; entity?: string; op?: string; id?: string };
                return parsed.type === 'entity_change' && parsed.entity === 'card' && parsed.op === 'created' && parsed.id === cardRef.id;
            } catch {
                return false;
            }
        });
        expect(relayed).toBe(true);
    }).toPass({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// US2: card CRUD/vote/like/react, all through the backend — zero direct Firebase
// requests, and live propagation to a second participant.
// ---------------------------------------------------------------------------

test('creates and likes a card — the card write itself goes through the backend only', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner6@example.com', 'E2E Retro Owner 6', 'E2E Card CRUD Board');

    // What's meaningful here is that the card write itself — creating and liking it —
    // reaches the backend's /api/cards* endpoints, not Firestore directly. The
    // comprehensive "zero direct Firebase requests for the whole board session" check
    // (every US1-US7 hook, plus columns and participant photos, per 021) lives in
    // e2e/concurrent-board-network.spec.ts, now that nothing on this screen retains a
    // direct Firestore listener of its own.
    const createCardResponses: import('@playwright/test').Response[] = [];
    const likeResponses: import('@playwright/test').Response[] = [];
    page.on('response', (res) => {
        if (res.request().method() === 'POST' && /\/api\/retrospectives\/[^/]+\/cards$/.test(res.url())) createCardResponses.push(res);
        if (res.request().method() === 'POST' && /\/api\/cards\/[^/]+\/like$/.test(res.url())) likeResponses.push(res);
    });

    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Card CRUD Board')).toBeVisible({ timeout: 30_000 });

    await addCardToFirstColumn(page, 'US2 CRUD card');
    const card = cardByContent(page, 'US2 CRUD card');
    await expect(card).toBeVisible();

    // Like (vote-equivalent affordance in the current UI) — atomic backend toggle.
    const likeButton = card.getByRole('button', { name: /^\d+$/ });
    await expect(likeButton).toHaveText('0');
    await likeButton.click();
    await expect(likeButton).toHaveText('1', { timeout: 10_000 });

    // The DOM update arrives via the WS relay and can render a tick before this
    // test's own response-event listener finishes processing the POST's response —
    // poll rather than assert-once immediately after the DOM already reflects it.
    await expect.poll(() => createCardResponses.some((r) => r.ok())).toBe(true);
    await expect.poll(() => likeResponses.some((r) => r.ok())).toBe(true);
});

// ---------------------------------------------------------------------------
// Spec 035: a new card must default to the neutral color, never the color
// associated with its parent column, while manual color selection still works.
// ---------------------------------------------------------------------------

test('a new card defaults to the neutral color instead of its column\'s associated color, and a manual override still persists', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner6b@example.com', 'E2E Retro Owner 6b', 'E2E Card Color Default Board');

    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Card Color Default Board')).toBeVisible({ timeout: 30_000 });

    // The first column (helped / "¿Qué funcionó bien?") previously seeded new cards with
    // its associated pastelGreen default (bg-green-50). A card added without touching the
    // color picker must now carry the neutral pastelWhite default (bg-white) instead.
    await addCardToFirstColumn(page, 'Neutral default card');
    const neutralCard = cardByContent(page, 'Neutral default card');
    await expect(neutralCard).toBeVisible();
    await expect(neutralCard).toHaveClass(/bg-white/);
    await expect(neutralCard).not.toHaveClass(/bg-green-50/);

    // Manual color selection must still work: opening the add-card form again, picking a
    // color via the real ColorPicker, and submitting must persist that chosen color.
    await page.getByText('Agregar', { exact: true }).first().click();
    // The add-card form's own trigger renders before any card's (form precedes the
    // cards list in DOM order), so .first() reliably targets it over an existing card's.
    // Spec 037: trigger/swatch aria-labels are now fully localized via i18next
    // (colors.<slug>_aria), replacing the old hardcoded "Color selector: <name>"/
    // "<name> suave" strings.
    await page.getByRole('button', { name: 'Seleccionar color blanco', exact: true }).first().click();
    await page.getByRole('button', { name: 'Seleccionar color azul', exact: true }).click();
    await page.locator('textarea').first().fill('Manually colored card');
    await page.getByRole('button', { name: 'Crear tarjeta' }).click();

    const coloredCard = cardByContent(page, 'Manually colored card');
    await expect(coloredCard).toBeVisible();
    await expect(coloredCard).toHaveClass(/bg-blue-50/);
});

test('a card created by one participant appears live for a second participant without reloading', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner7@example.com', 'E2E Retro Owner 7', 'E2E Two-Context Live Card Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Two-Context Live Card Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant7@example.com', 'E2E Retro Participant 7');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Two-Context Live Card Board')).toBeVisible({ timeout: 30_000 });

    await addCardToFirstColumn(pageA, 'Card from participant A');

    // pageB never reloads — this must arrive via the WebSocket relay.
    await expect(cardByContent(pageB, 'Card from participant A')).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
});

test('concurrent votes on the same card are not lost (FR-008)', async ({ request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner8@example.com', 'E2E Retro Owner 8', 'E2E Concurrent Vote Board');
    const createRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Vote target', column: 'helped' } });
    expect(createRes.ok()).toBeTruthy();
    const { id: cardId } = (await createRes.json()) as { id: string };

    const CONCURRENT_VOTES = 10;
    const results = await Promise.all(
        Array.from({ length: CONCURRENT_VOTES }, () => request.post(`/api/cards/${cardId}/vote`, { data: {} })),
    );
    expect(results.every((r) => r.ok())).toBe(true);

    const finalRes = await request.get(`/api/retrospectives/${boardId}`);
    const finalState = (await finalRes.json()) as { cards: Array<{ id: string; votes: number }> };
    const finalCard = finalState.cards.find((c) => c.id === cardId);
    // Every concurrent increment must be reflected — no lost updates under concurrency.
    expect(finalCard?.votes).toBe(CONCURRENT_VOTES);
});

// ---------------------------------------------------------------------------
// US4: card reordering + grouping, atomic and backend-mediated, live for a second
// participant.
// ---------------------------------------------------------------------------

test('a reorder batch referencing a nonexistent card fails atomically — no partial reorder applied (FR-010)', async ({ request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner11@example.com', 'E2E Retro Owner 11', 'E2E Reorder Atomicity Board');
    const createRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Atomicity target card', column: 'helped' } });
    expect(createRes.ok()).toBeTruthy();
    const { id: cardId, order: originalOrder } = (await createRes.json()) as { id: string; order: number };

    // Firestore's WriteBatch.update() requires every referenced document to exist, so
    // pairing a valid update with one targeting a nonexistent card makes the whole
    // commit fail together (research.md §8, single WriteBatch per reorder request) —
    // the real card's order must come back untouched, not partially reordered.
    const reorderRes = await request.post(`/api/retrospectives/${boardId}/cards/reorder`, {
        data: {
            updates: [
                { cardId, order: 999 },
                { cardId: 'does-not-exist', order: 1 },
            ],
        },
    });
    expect(reorderRes.ok()).toBe(false);

    const stateRes = await request.get(`/api/retrospectives/${boardId}`);
    const state = (await stateRes.json()) as { cards: Array<{ id: string; order: number }> };
    const card = state.cards.find((c) => c.id === cardId);
    expect(card?.order).toBe(originalOrder);
});

test('reordering cards updates their live position for a second participant', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner12@example.com', 'E2E Retro Owner 12', 'E2E Reorder Live Board');
    const createAlpha = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Reorder Card Alpha', column: 'helped' } });
    const { id: alphaId } = (await createAlpha.json()) as { id: string };
    const createBeta = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Reorder Card Beta', column: 'helped' } });
    const { id: betaId } = (await createBeta.json()) as { id: string };

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Reorder Live Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant12@example.com', 'E2E Retro Participant 12');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Reorder Live Board')).toBeVisible({ timeout: 30_000 });

    const cardsOnB = pageB.locator('[data-testid="draggable-card"]');
    await expect(cardsOnB.first()).toContainText('Reorder Card Alpha');

    // Swap their order via the backend (the same endpoint the drag-and-drop UI posts
    // to — see useOptimizedCards.ts's reorderCardsFn).
    const reorderRes = await pageA.request.post(`/api/retrospectives/${boardId}/cards/reorder`, {
        data: {
            updates: [
                { cardId: betaId, order: 0 },
                { cardId: alphaId, order: 1 },
            ],
        },
    });
    expect(reorderRes.ok()).toBeTruthy();

    // pageB never reloads — its DOM order updates live via the WS relay.
    await expect(cardsOnB.first()).toContainText('Reorder Card Beta', { timeout: 10_000 });

    await contextA.close();
    await contextB.close();
});

test('grouping cards, adding/removing a member, and disbanding propagate live to a second participant', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner13@example.com', 'E2E Retro Owner 13', 'E2E Grouping Live Board');
    const createHead = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Group Head Card', column: 'helped' } });
    const { id: headId } = (await createHead.json()) as { id: string };
    const createMember = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Group Member Card', column: 'helped' } });
    const { id: memberId } = (await createMember.json()) as { id: string };
    const createExtra = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Group Extra Card', column: 'helped' } });
    const { id: extraId } = (await createExtra.json()) as { id: string };

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Grouping Live Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant13@example.com', 'E2E Retro Participant 13');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Grouping Live Board')).toBeVisible({ timeout: 30_000 });

    // Group head+member — a two-card group header appears live for B without reloading.
    const createGroupRes = await pageA.request.post(`/api/retrospectives/${boardId}/groups`, {
        data: { column: 'helped', headCardId: headId, memberCardIds: [memberId] },
    });
    expect(createGroupRes.ok()).toBeTruthy();
    const { id: groupId } = (await createGroupRes.json()) as { id: string };

    await expect(pageB.getByText('Grupo de 2 tarjetas')).toBeVisible({ timeout: 10_000 });

    // Add a third card to the group — live count updates to 3.
    const addRes = await pageA.request.post(`/api/groups/${groupId}/cards`, { data: { cardId: extraId } });
    expect(addRes.ok()).toBeTruthy();
    await expect(pageB.getByText('Grupo de 3 tarjetas')).toBeVisible({ timeout: 10_000 });

    // Remove that member — live count drops back to 2.
    const removeRes = await pageA.request.delete(`/api/groups/${groupId}/cards/${extraId}`);
    expect(removeRes.ok()).toBeTruthy();
    await expect(pageB.getByText('Grupo de 2 tarjetas')).toBeVisible({ timeout: 10_000 });

    // Disband — the group header disappears live and both cards render individually.
    const disbandRes = await pageA.request.delete(`/api/groups/${groupId}`);
    expect(disbandRes.ok()).toBeTruthy();
    await expect(pageB.getByText('Grupo de 2 tarjetas')).not.toBeVisible({ timeout: 10_000 });
    await expect(cardByContent(pageB, 'Group Head Card')).toBeVisible();
    await expect(cardByContent(pageB, 'Group Member Card')).toBeVisible();

    await contextA.close();
    await contextB.close();
});

// spec 020-user-display-name-fix: group-by-user headers must show each author's
// display name, sorted alphabetically, and never the raw Firebase uid — regression
// coverage for the bug where the group heading (and the per-card author label)
// rendered the internal uid instead of a human-readable name.
test('group-by-user headers show participant display names in alphabetical order, never raw uids', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner24@example.com', 'Zoe Yamamoto', 'E2E Alphabetical Grouping Board');
    const ownerCardRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Owner Card', column: 'helped' } });
    expect(ownerCardRes.ok()).toBeTruthy();
    const { createdBy: ownerUid } = (await ownerCardRes.json()) as { createdBy: string; createdByName: string };

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant24@example.com', 'Alex Chen');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Alphabetical Grouping Board')).toBeVisible({ timeout: 30_000 });

    const participantCardRes = await pageB.request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Participant Card', column: 'helped' } });
    expect(participantCardRes.ok()).toBeTruthy();
    const { createdBy: participantUid } = (await participantCardRes.json()) as { createdBy: string; createdByName: string };

    // Default column state is 'user' grouping (DEFAULT_GROUPING_STATE) — reload to
    // pick up both newly-created cards' groups.
    await pageB.reload();
    await expect(pageB.getByText('E2E Alphabetical Grouping Board')).toBeVisible({ timeout: 30_000 });

    const alexHeading = pageB.getByRole('heading', { name: 'Alex Chen' });
    const zoeHeading = pageB.getByRole('heading', { name: 'Zoe Yamamoto' });
    await expect(alexHeading).toBeVisible({ timeout: 10_000 });
    await expect(zoeHeading).toBeVisible({ timeout: 10_000 });

    // Neither raw uid is ever rendered anywhere on the board.
    await expect(pageB.getByText(ownerUid, { exact: true })).toHaveCount(0);
    await expect(pageB.getByText(participantUid, { exact: true })).toHaveCount(0);

    // "Alex Chen" (A) sorts before "Zoe Yamamoto" (Z) among the group headings.
    const headingTexts = await pageB.getByRole('heading').allTextContents();
    expect(headingTexts.indexOf('Alex Chen')).toBeLessThan(headingTexts.indexOf('Zoe Yamamoto'));

    await contextB.close();
});

// 022-display-name-consistency, User Story 1: a display-name change must propagate
// live — without a page reload — to every surface referencing that user on a board
// another participant already has open: the card author label, the like tooltip, the
// reaction tooltip, and the participant list (FR-001, FR-001a, FR-007, SC-002).
test('renaming a participant propagates live to a second, already-open session — card author, like tooltip, reaction tooltip, and participant list all update without reloading', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner25@example.com', 'Jane Smith', 'E2E Rename Propagation Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, 'e2e-retro-owner25@example.com', 'Jane Smith');
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Rename Propagation Board')).toBeVisible({ timeout: 30_000 });

    // Jane creates a card, likes it, and reacts to it — all via the backend API,
    // mirroring the UI-driven flows already covered by other specs in this file.
    const createRes = await pageA.request.post(`/api/retrospectives/${boardId}/cards`, {
        data: { content: 'Janes card for rename propagation', column: 'helped' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id: cardId } = (await createRes.json()) as { id: string };
    const likeRes = await pageA.request.post(`/api/cards/${cardId}/like`);
    expect(likeRes.ok()).toBeTruthy();
    const reactRes = await pageA.request.put(`/api/cards/${cardId}/reaction`, { data: { emoji: '👍' } });
    expect(reactRes.ok()).toBeTruthy();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant25@example.com', 'Other Participant');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Rename Propagation Board')).toBeVisible({ timeout: 30_000 });

    const card = cardByContent(pageB, 'Janes card for rename propagation');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Original name visible everywhere before the rename. Tooltips (like + reaction)
    // are scoped to the card itself — the page also has a participant-avatar title
    // attribute with the same name, which is a separate surface (asserted below).
    await expect(card.getByText('Jane Smith')).toBeVisible(); // author label
    await expect(card.getByTitle(/Jane Smith/)).toHaveCount(2); // like tooltip + reaction tooltip
    await expect(pageB.getByText('Jane Smith').first()).toBeVisible(); // participant list

    // Rename via PATCH /api/profile in session A's own request context (equivalent to
    // saving on the Profile page) — without ever reloading session B.
    const renameRes = await pageA.request.patch('/api/profile', { data: { displayName: 'Jane S. Renamed' } });
    expect(renameRes.ok()).toBeTruthy();

    // Every surface in session B updates live to the new name, with zero reload.
    await expect(card.getByText('Jane S. Renamed')).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText('Jane Smith')).not.toBeVisible();
    await expect(card.getByTitle(/Jane S\. Renamed/)).toHaveCount(2, { timeout: 10_000 });
    await expect(pageB.getByText('Jane S. Renamed').first()).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
});

// 036-fix-display-name-fallback, User Story 1: reproduces the originally reported bug
// end-to-end — a user whose Profile display name differs from their connected
// account's raw name must see the configured name on a card written on a board they
// just created, immediately, with no reload and no rename event (unlike the test
// above, which renames *after* content already exists on an *existing* board).
test('a card on a brand-new board shows the author\'s configured Profile display name, not their raw connected-account name', async ({ page }) => {
    const email = 'e2e-display-name-fallback1@example.com';
    await signInAs(page, email, 'Raw OAuth Full Name');

    const patchRes = await page.request.patch('/api/profile', { data: { displayName: 'Configured Display Name' } });
    expect(patchRes.ok()).toBeTruthy();

    await createBoard(page, 'E2E Brand-New Board For Display Name Fix');
    await addCardToFirstColumn(page, 'Sprint went great this week');

    const card = cardByContent(page, 'Sprint went great this week');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText('Configured Display Name')).toBeVisible();
    await expect(card.getByText('Raw OAuth Full Name')).not.toBeVisible();

    // User Story 2: the participant list (topbar avatar strip) shows the configured
    // name from the moment the board is created, not the raw connected-account name.
    await expect(page.getByTitle('Configured Display Name')).toBeVisible();
    await expect(page.getByTitle('Raw OAuth Full Name')).toHaveCount(0);

    // User Story 2: the "group by user" header also shows the configured name.
    await page.getByRole('button', { name: 'Opciones de agrupación' }).first().click();
    await page.getByText('Agrupar por usuario', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Configured Display Name' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Raw OAuth Full Name' })).not.toBeVisible();
});

// 036-fix-display-name-fallback, User Story 3: likes, reactions, and the live typing
// indicator on a brand-new board all show the author's configured Profile display
// name, not their raw connected-account name — the same root defect as US1/US2,
// closed on the remaining surfaces.
test('likes, reactions, and the live typing indicator on a brand-new board show the actor\'s configured Profile display name, not their raw connected-account name', async ({ browser, request }) => {
    const email = 'e2e-display-name-fallback2@example.com';
    const loginRes = await request.post('/api/auth/test-login', { data: { email, displayName: 'Raw OAuth Name For Interactions' } });
    expect(loginRes.ok()).toBeTruthy();
    // GET /api/profile is what normally creates the profile doc on first load via the UI
    // (ensureUserProfile); this test drives the API directly, so it must do the same
    // before PATCH, which requires the doc to already exist.
    const getProfileRes = await request.get('/api/profile');
    expect(getProfileRes.ok()).toBeTruthy();
    const patchRes = await request.patch('/api/profile', { data: { displayName: 'Configured Name For Interactions' } });
    expect(patchRes.ok()).toBeTruthy();

    const createBoardRes = await request.post('/api/boards', { data: { templateId: 'default', title: 'E2E Brand-New Interactions Board', locale: 'es' } });
    expect(createBoardRes.ok()).toBeTruthy();
    const { boardId } = (await createBoardRes.json()) as { boardId: string };
    const joinRes = await request.post(`/api/retrospectives/${boardId}/join`);
    expect(joinRes.ok()).toBeTruthy();

    const createCardRes = await request.post(`/api/retrospectives/${boardId}/cards`, {
        data: { content: 'Card for likes/reactions/typing check', column: 'helped' },
    });
    expect(createCardRes.ok()).toBeTruthy();
    const { id: cardId } = (await createCardRes.json()) as { id: string };

    const likeRes = await request.post(`/api/cards/${cardId}/like`);
    expect(likeRes.ok()).toBeTruthy();
    const reactRes = await request.put(`/api/cards/${cardId}/reaction`, { data: { emoji: '👍' } });
    expect(reactRes.ok()).toBeTruthy();

    // Observer opens the board and sees the configured name on the like tooltip and
    // the reaction tooltip.
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAs(page, 'e2e-display-name-fallback2-observer@example.com', 'Observer B');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Brand-New Interactions Board')).toBeVisible({ timeout: 30_000 });

    const card = cardByContent(page, 'Card for likes/reactions/typing check');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByTitle(/Configured Name For Interactions/)).toHaveCount(2); // like tooltip + reaction tooltip
    await expect(card.getByTitle(/Raw OAuth Name For Interactions/)).toHaveCount(0);

    // Typing status has a short (~3s) TTL (feature 026), so the signal is sent last,
    // immediately before asserting the observer's live indicator.
    const typingRes = await request.post(`/api/retrospectives/${boardId}/typing`, { data: { column: 'helped', isActive: true } });
    expect(typingRes.ok()).toBeTruthy();
    const typingRegion = page.getByRole('status').filter({ hasText: /está escribiendo/ });
    await expect(typingRegion).toHaveText('Configured Name For Interactions está escribiendo', { timeout: 10_000 });

    await context.close();
});

// 022-display-name-consistency, User Story 2: content whose author's account no longer
// exists still shows a real name, never a raw uid/blank/error — and a participant list
// entry for such a user still shows its last-known name (FR-003, FR-004, SC-003).
// "Account deleted" is simulated per research.md §4: content written directly to the
// Firestore emulator whose userId has no corresponding `participants` doc.
test('content from a departed/legacy author still shows a real name — never a raw uid, blank field, or error', async ({ page, context, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner26@example.com', 'E2E Retro Owner 26', 'E2E Deleted Author Board');

    const db = getEmulatorFirestore();

    // A card/like/reaction from a user with no matching participants doc — the captured
    // name is used (FR-003).
    await db.collection('cards').doc('e2e-departed-card').set({
        content: 'Card from a departed author',
        column: 'helped',
        createdBy: 'departed-uid',
        createdByName: 'Departed Person',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: boardId,
        votes: 0,
        likes: [{ userId: 'departed-uid', username: 'Departed Person', timestamp: new Date() }],
        reactions: [{ userId: 'departed-uid', username: 'Departed Person', emoji: '👍', timestamp: new Date() }],
        order: 0,
    });

    // A legacy card predating captured-name capture (no createdByName) whose author also
    // has no participants doc — neither a current nor a captured name exists, so the
    // generic fallback is used, never the raw uid (FR-004).
    await db.collection('cards').doc('e2e-legacy-card').set({
        content: 'Legacy card with no captured author name',
        column: 'helped',
        createdBy: 'legacy-departed-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: boardId,
        votes: 0,
        likes: [],
        reactions: [],
        order: 1,
    });

    // A participant entry whose account is also gone — still shows its last-known name
    // (SC-003), not a raw id, not a disappeared entry.
    await db.collection('participants').doc('e2e-departed-participant').set({
        retrospectiveId: boardId,
        userId: 'departed-participant-uid',
        name: 'Departed Participant',
        joinedAt: new Date(),
        isActive: true,
    });

    await signInWithGoogle(page, context);
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Deleted Author Board')).toBeVisible({ timeout: 30_000 });

    const departedCard = cardByContent(page, 'Card from a departed author');
    await expect(departedCard).toBeVisible({ timeout: 10_000 });
    await expect(departedCard.getByText('Departed Person')).toBeVisible();
    await expect(departedCard.getByTitle(/Departed Person/)).toHaveCount(2); // like + reaction tooltips

    const legacyCard = cardByContent(page, 'Legacy card with no captured author name');
    await expect(legacyCard).toBeVisible({ timeout: 10_000 });
    await expect(legacyCard.getByText('Sin autor')).toBeVisible();

    // The participant list only shows full names inside its popover (the topbar's
    // default view is avatar-only) — open it via the avatar group trigger.
    await page.getByTitle('Departed Participant').click();
    await expect(page.getByText('Departed Participant').first()).toBeVisible({ timeout: 10_000 });

    // Neither raw uid is ever rendered anywhere on the board.
    await expect(page.getByText('departed-uid', { exact: true })).toHaveCount(0);
    await expect(page.getByText('legacy-departed-uid', { exact: true })).toHaveCount(0);
    await expect(page.getByText('departed-participant-uid', { exact: true })).toHaveCount(0);
});

test('the column-grouping preference propagates live to a second participant', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner14@example.com', 'E2E Retro Owner 14', 'E2E Column Grouping Live Board');
    const createRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Column Grouping Card', column: 'helped' } });
    expect(createRes.ok()).toBeTruthy();
    const { createdByName } = (await createRes.json()) as { createdByName: string };

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Column Grouping Live Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant14@example.com', 'E2E Retro Participant 14');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Column Grouping Live Board')).toBeVisible({ timeout: 30_000 });

    // The card itself also displays its author's display name as an attribution
    // label (spec 020-user-display-name-fix), so scope the assertion to the group
    // heading specifically (an <h4>, GroupedCardList.tsx) rather than a bare
    // getByText(createdByName), which would also match that unrelated label and
    // make a strict-mode locator ambiguous.
    const groupHeading = pageB.getByRole('heading', { name: createdByName });

    // The column's default state ('user' grouping, DEFAULT_GROUPING_STATE) already
    // renders a creator heading, so first switch to 'none' to get an observable
    // baseline before switching back — otherwise the later switch to 'user' would be
    // a no-op from B's point of view.
    const toNoneRes = await pageA.request.patch(`/api/retrospectives/${boardId}/column-grouping`, {
        data: { helped: { criteria: 'none', activeGroups: [] } },
    });
    expect(toNoneRes.ok()).toBeTruthy();
    await expect(groupHeading).not.toBeVisible({ timeout: 10_000 });

    const toUserRes = await pageA.request.patch(`/api/retrospectives/${boardId}/column-grouping`, {
        data: { helped: { criteria: 'user', activeGroups: [] } },
    });
    expect(toUserRes.ok()).toBeTruthy();
    // pageB never reloads — the creator-name group heading appears live via the WS relay.
    await expect(groupHeading).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
});

// ---------------------------------------------------------------------------
// US3: typing status + participants, backend-mediated and live.
// ---------------------------------------------------------------------------

/** The visible typing card's text (`text-blue-700`), scoped to exclude the always-
 * mounted accessible live region (feature 026, FR-009) added alongside it — both
 * render the same "... está escribiendo" string, so an unscoped getByText(/está
 * escribiendo/) resolves to two elements once the live region exists. */
function visibleTypingText(page: import('@playwright/test').Page, pattern: RegExp | string = /está escribiendo/) {
    return page.locator('span.text-blue-700', { hasText: pattern });
}

/** The typing live region itself — one per column, so scope to the one currently
 * carrying the "está escribiendo" text when asserting its content. */
function typingLiveRegion(page: import('@playwright/test').Page) {
    return page.getByRole('status').filter({ hasText: /está escribiendo/ });
}

test('a typing indicator appears live for a second participant, stays visible without flicker while typing continues, and clears after typing stops', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner9@example.com', 'E2E Retro Owner 9', 'E2E Typing Indicator Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Typing Indicator Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant9@example.com', 'E2E Retro Participant 9');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Typing Indicator Board')).toBeVisible({ timeout: 30_000 });

    // Start typing on A without submitting — triggers POST /api/retrospectives/:id/typing.
    const firstCardBtn = pageA.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtn.isVisible().catch(() => false)) {
        await firstCardBtn.click();
    } else {
        await pageA.getByText('Agregar', { exact: true }).first().click();
    }
    await pageA.locator('textarea').first().fill('typing but not yet submitted');

    // B sees a live "... está escribiendo" indicator, never reloading.
    await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 10_000 });
    await expect(typingLiveRegion(pageB)).toHaveText('E2E Google User está escribiendo');

    // US1 (FR-002/SC-001/SC-003): keep A "typing" for several seconds and sample B's
    // view every ~500ms across that whole window — this is the direct regression
    // check for the reported defect (the indicator used to flicker off ~300ms after
    // each keystroke burst). A short per-sample timeout means a genuine, even brief,
    // disappearance fails immediately instead of being masked by Playwright's own
    // auto-retry. The live region's accessible text must stay identical throughout —
    // no duplicate announcement while the typist set hasn't changed (FR-009, User
    // Story 4 Acceptance Scenario 2).
    const accessibleTextSamples = new Set<string>();
    for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
            await pageA.locator('textarea').first().press('a');
        }
        await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 200 });
        accessibleTextSamples.add(await typingLiveRegion(pageB).innerText());
        await pageB.waitForTimeout(500);
    }
    expect(accessibleTextSamples).toEqual(new Set(['E2E Google User está escribiendo']));

    // FR-008: the same continuous-visibility behavior holds in a second column, not
    // just the one this test happened to use first.
    await pageA.locator('textarea').first().fill('');
    await pageA.getByRole('button', { name: 'Cancelar' }).click();
    // Wait for column one's own form to fully unmount on A's page before opening
    // column two — waiting only on B's view (below) confirms the *data* settled, but
    // not that A's local DOM has caught up. Without this, `textarea.nth(0)` below can
    // still resolve to column one's own-about-to-unmount textarea under a slow render
    // (e.g. a CPU-constrained CI runner), sending a stray startTyping for column one
    // instead of column two — the exact mechanism behind the CI-only "ghost indicator"
    // flake this regression test exists to catch (feature 027).
    await expect(pageA.getByRole('button', { name: 'Cancelar' })).toHaveCount(0, { timeout: 2_000 });
    await expect(visibleTypingText(pageB)).not.toBeVisible({ timeout: 5_000 });

    await pageA.getByText('Agregar primera tarjeta').nth(1).click();
    await pageA.locator('textarea').nth(0).fill('typing in a second column');
    await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 10_000 });
    for (let i = 0; i < 4; i++) {
        await pageA.locator('textarea').nth(0).press('a');
        await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 200 });
        await pageB.waitForTimeout(500);
    }

    // FR-001/FR-003, US1 Acceptance Scenario 2 (feature 027): rapid, repeated column
    // switching by the same participant, with no settling time between switches, must
    // never leave more than one column showing them as typing at once — the direct
    // regression check for the ordering race behind the reported "ghost" indicator
    // (a late-arriving write for an abandoned column resurrecting its typing status).
    for (let i = 0; i < 2; i++) {
        await pageA.getByRole('button', { name: 'Cancelar' }).click();
        // Each column's add-card form is its own independent AnimatePresence child —
        // waiting for the outgoing one to fully unmount before opening the next avoids
        // a moment where two "Cancelar" buttons (one exiting, one entering) coexist.
        await expect(pageA.getByRole('button', { name: 'Cancelar' })).toHaveCount(0, { timeout: 2_000 });
        await pageA.getByText('Agregar primera tarjeta').first().click();
        await pageA.locator('textarea').first().fill(`rapid switch to column one ${i}`);
        await expect(visibleTypingText(pageB)).toHaveCount(1, { timeout: 2_000 });

        await pageA.getByRole('button', { name: 'Cancelar' }).click();
        await expect(pageA.getByRole('button', { name: 'Cancelar' })).toHaveCount(0, { timeout: 2_000 });
        await pageA.getByText('Agregar primera tarjeta').nth(1).click();
        await pageA.locator('textarea').first().fill(`rapid switch to column two ${i}`);
        await expect(visibleTypingText(pageB)).toHaveCount(1, { timeout: 2_000 });
    }

    // US2 (FR-003, Acceptance Scenario 1): A stops typing with no explicit action —
    // indicator clears for B within the 3-second grace period plus render/network
    // slack, and stays cleared (no reappearing on its own).
    const stopStart = Date.now();
    await expect(visibleTypingText(pageB)).not.toBeVisible({ timeout: 4_500 });
    expect(Date.now() - stopStart).toBeLessThan(4_500);
    await expect(typingLiveRegion(pageB)).toHaveCount(0);
    await pageB.waitForTimeout(2_000);
    await expect(visibleTypingText(pageB)).not.toBeVisible();

    await contextA.close();
    await contextB.close();
});

test('typing indicator clears promptly for the other participant when the typer submits their card, without waiting the full grace period', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner30@example.com', 'E2E Retro Owner 30', 'E2E Typing Explicit Stop Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Typing Explicit Stop Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant30@example.com', 'E2E Retro Participant 30');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Typing Explicit Stop Board')).toBeVisible({ timeout: 30_000 });

    const firstCardBtn = pageA.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtn.isVisible().catch(() => false)) {
        await firstCardBtn.click();
    } else {
        await pageA.getByText('Agregar', { exact: true }).first().click();
    }
    await pageA.locator('textarea').first().fill('submitting this one');
    await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 10_000 });

    await pageA.getByRole('button', { name: 'Crear tarjeta' }).click();

    // Well under the 3-second inactivity grace period — the explicit stop writes
    // isActive:false immediately (spec.md User Story 2 Acceptance Scenario 2).
    await expect(visibleTypingText(pageB)).not.toBeVisible({ timeout: 2_000 });

    await contextA.close();
    await contextB.close();
});

test('typing indicator clears for the other participant when a participant disconnects while marked as typing', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner31@example.com', 'E2E Retro Owner 31', 'E2E Typing Disconnect Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Typing Disconnect Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant31@example.com', 'E2E Retro Participant 31');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Typing Disconnect Board')).toBeVisible({ timeout: 30_000 });

    const firstCardBtn = pageA.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtn.isVisible().catch(() => false)) {
        await firstCardBtn.click();
    } else {
        await pageA.getByText('Agregar', { exact: true }).first().click();
    }
    await pageA.locator('textarea').first().fill('typing then disconnecting');
    await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 10_000 });

    // A's own browser context closes entirely (simulating disconnect/tab-close) while
    // still marked as typing — no beforeunload/explicit stop write is guaranteed to
    // land; only the server's retuned TTL sweep (~3.5s worst case,
    // FirestoreRealtimeGatewayAdapter.ts, FR-004) can clear the indicator for B. On CI,
    // this event is additionally relayed through Redis pub/sub when coordinated mode is
    // active (040, US3 — REDIS_URL is provisioned for the whole e2e job, not just its own
    // dedicated coordination spec), adding a hop this test's own worst-case estimate
    // doesn't account for. A hardcoded 5s here previously undercut the 10s headroom
    // playwright.config.ts's own `expect.timeout` default already establishes for exactly
    // this "CI runners are noticeably slower" class of margin (see that file's comment) —
    // observed failing in CI (5s exceeded) while passing locally; use the same 10s budget
    // as this test's own sibling assertion (line 921) instead of a tighter one-off value.
    await contextA.close();

    await expect(visibleTypingText(pageB)).not.toBeVisible({ timeout: 10_000 });

    await contextB.close();
});

test('a typing indicator does not flicker for the other participant under a brief simulated network delay', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner32@example.com', 'E2E Retro Owner 32', 'E2E Typing Delay Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Typing Delay Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    // Delay every server->client frame on B's live channel by ~1.5s (spec.md
    // Assumptions: "brief" == up to ~2s) without ever dropping the connection —
    // distinct from the "board deleted" spec's forced-close routing above.
    await pageB.routeWebSocket(/\/live$/, (ws) => {
        const server = ws.connectToServer();
        server.onMessage((message) => {
            setTimeout(() => ws.send(message), 1_500);
        });
    });
    await signInAs(pageB, 'e2e-retro-participant32@example.com', 'E2E Retro Participant 32');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Typing Delay Board')).toBeVisible({ timeout: 30_000 });

    const firstCardBtn = pageA.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtn.isVisible().catch(() => false)) {
        await firstCardBtn.click();
    } else {
        await pageA.getByText('Agregar', { exact: true }).first().click();
    }
    await pageA.locator('textarea').first().fill('typing under a delayed channel');

    await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 10_000 });
    for (let i = 0; i < 6; i++) {
        await pageA.locator('textarea').first().press('a');
        await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 200 });
        await pageA.waitForTimeout(700);
    }

    await contextA.close();
    await contextB.close();
});

test('multiple participants typing in the same column are represented independently, with no cross-flicker when one stops', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner33@example.com', 'E2E Retro Owner 33', 'E2E Typing Concurrent Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Typing Concurrent Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant33b@example.com', 'E2E Retro Participant 33B');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Typing Concurrent Board')).toBeVisible({ timeout: 30_000 });

    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    await signInAs(pageC, 'e2e-retro-participant33c@example.com', 'E2E Retro Participant 33C');
    await pageC.goto(`/retro/${boardId}`);
    await expect(pageC.getByText('E2E Typing Concurrent Board')).toBeVisible({ timeout: 30_000 });

    // A starts typing first; C sees only A.
    const firstCardBtnA = pageA.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtnA.isVisible().catch(() => false)) {
        await firstCardBtnA.click();
    } else {
        await pageA.getByText('Agregar', { exact: true }).first().click();
    }
    await pageA.locator('textarea').first().fill('A is typing');
    await expect(visibleTypingText(pageC, /E2E Google User está escribiendo/)).toBeVisible({ timeout: 10_000 });

    // B joins in on the same column; C now sees both.
    const firstCardBtnB = pageB.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtnB.isVisible().catch(() => false)) {
        await firstCardBtnB.click();
    } else {
        await pageB.getByText('Agregar', { exact: true }).first().click();
    }
    await pageB.locator('textarea').first().fill('B is typing too');
    await expect(visibleTypingText(pageC, /y 1 más están escribiendo|y .+ están escribiendo/)).toBeVisible({ timeout: 10_000 });

    // A stops (submits); B keeps going. C must end up seeing only B, with B's own
    // indicator never flickering because of A's state change.
    await pageA.getByRole('button', { name: 'Crear tarjeta' }).click();

    for (let i = 0; i < 6; i++) {
        await pageB.locator('textarea').first().press('a');
        await expect(visibleTypingText(pageC)).toBeVisible({ timeout: 200 });
        await pageC.waitForTimeout(500);
    }
    await expect(visibleTypingText(pageC, 'E2E Google User está escribiendo')).not.toBeVisible();
    await expect(visibleTypingText(pageC, 'E2E Retro Participant 33B está escribiendo')).toBeVisible();

    await contextA.close();
    await contextB.close();
    await contextC.close();
});

test('two participants typing in different columns stay independent when one switches to a third column (feature 027, US3)', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner40@example.com', 'E2E Retro Owner 40', 'E2E Typing Different Columns Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Typing Different Columns Board')).toBeVisible({ timeout: 30_000 });

    const contextD = await browser.newContext();
    const pageD = await contextD.newPage();
    await signInAs(pageD, 'e2e-retro-participant40d@example.com', 'E2E Retro Participant 40D');
    await pageD.goto(`/retro/${boardId}`);
    await expect(pageD.getByText('E2E Typing Different Columns Board')).toBeVisible({ timeout: 30_000 });

    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    await signInAs(pageC, 'e2e-retro-participant40c@example.com', 'E2E Retro Participant 40C');
    await pageC.goto(`/retro/${boardId}`);
    await expect(pageC.getByText('E2E Typing Different Columns Board')).toBeVisible({ timeout: 30_000 });

    // A types in the first column; D types in the second. C (the observer) must see
    // both, independently, at the same time.
    await pageA.getByText('Agregar primera tarjeta').first().click();
    await pageA.locator('textarea').first().fill('A typing in column one');
    await expect(visibleTypingText(pageC, 'E2E Google User está escribiendo')).toBeVisible({ timeout: 10_000 });

    await pageD.getByText('Agregar primera tarjeta').nth(1).click();
    await pageD.locator('textarea').first().fill('D typing in column two');
    await expect(visibleTypingText(pageC, 'E2E Retro Participant 40D está escribiendo')).toBeVisible({ timeout: 10_000 });

    // A switches to a third column mid-session. D's indicator must be unaffected
    // throughout the switch — sampled with short timeouts so even a brief interruption
    // fails immediately, matching the regression style used elsewhere in this file.
    // The wall-clock time from the switch to A's indicator settling into its correct
    // final column (old column cleared, new column shown) must stay under 1s (SC-002).
    await pageA.getByRole('button', { name: 'Cancelar' }).click();
    // Wait for column one's own form to fully unmount before opening column three —
    // otherwise `textarea.first()` below can still resolve to column one's own
    // about-to-unmount textarea under a slow render, corrupting both the switch itself
    // and the SC-002 timing measurement below (feature 027).
    await expect(pageA.getByRole('button', { name: 'Cancelar' })).toHaveCount(0, { timeout: 2_000 });
    await pageA.getByText('Agregar primera tarjeta').nth(2).click();
    await pageA.locator('textarea').first().fill('A typing in column three');

    // A's indicator must settle into its new, single, correct location quickly (SC-002)
    // — the clock starts once the write is actually fired (right after the fill that
    // triggers it), not from the preceding UI clicks/animations, since SC-002 is about
    // propagation latency to other viewers, not local UI interaction time.
    const switchStart = Date.now();
    await expect(visibleTypingText(pageC, 'E2E Google User está escribiendo')).toHaveCount(1, { timeout: 1_000 });
    expect(Date.now() - switchStart).toBeLessThan(1_000);

    // D's indicator was never affected by A's switch — sample it a few more times to
    // confirm it's still the same, uninterrupted indicator.
    for (let i = 0; i < 3; i++) {
        await expect(visibleTypingText(pageC, 'E2E Retro Participant 40D está escribiendo')).toBeVisible({ timeout: 200 });
        await pageC.waitForTimeout(200);
    }

    await contextA.close();
    await contextD.close();
    await contextC.close();
});

test('the typing indicator and its accessible live region introduce no new WCAG 2.1 AA violations', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner34@example.com', 'E2E Retro Owner 34', 'E2E Typing A11y Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Typing A11y Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant34@example.com', 'E2E Retro Participant 34');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Typing A11y Board')).toBeVisible({ timeout: 30_000 });

    const firstCardBtn = pageA.getByText('Agregar primera tarjeta').first();
    if (await firstCardBtn.isVisible().catch(() => false)) {
        await firstCardBtn.click();
    } else {
        await pageA.getByText('Agregar', { exact: true }).first().click();
    }
    await pageA.locator('textarea').first().fill('checked for accessibility');
    await expect(visibleTypingText(pageB)).toBeVisible({ timeout: 10_000 });

    await pageB.addStyleTag({
        content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
    });
    const results = await new AxeBuilder({ page: pageB }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);

    await contextA.close();
    await contextB.close();
});

test('a third participant joining updates the participant list live for the other two, without reloading', async ({ browser, request }) => {
    // Every identity signs in via signInAs (a distinct real login), including the
    // owner — signInWithGoogle always authenticates a separate fixed shared test
    // account, not whichever identity created the board via the API, which would
    // silently add a 4th unaccounted-for participant to this count-based assertion.
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner10@example.com', 'E2E Retro Owner 10', 'E2E Participant Live Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, 'e2e-retro-owner10@example.com', 'E2E Retro Owner 10');
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Participant Live Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant10b@example.com', 'E2E Retro Participant 10B');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Participant Live Board')).toBeVisible({ timeout: 30_000 });

    // Owner (A, idempotent re-join per FR-005) + B — confirm the count badge shows 2
    // before the third joins, via the backend's own state rather than a UI guess.
    await expect.poll(async () => {
        const res = await request.get(`/api/retrospectives/${boardId}`);
        const body = (await res.json()) as { participantCount: number };
        return body.participantCount;
    }).toBe(2);

    // Give both A's and B's WebSocket upgrades a moment to fully complete before C
    // joins — otherwise a connection still mid-handshake can miss the live event
    // entirely (no automatic resync fires again until its own next reconnect).
    await pageA.waitForTimeout(1_000);
    await pageB.waitForTimeout(1_000);

    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    await signInAs(pageC, 'e2e-retro-participant10c@example.com', 'E2E Retro Participant 10C');
    await pageC.goto(`/retro/${boardId}`);
    await expect(pageC.getByText('E2E Participant Live Board')).toBeVisible({ timeout: 30_000 });

    // A and B's participant badge updates live to 3, without either page reloading.
    await expect(pageA.getByText('3', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText('3', { exact: true })).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
    await contextC.close();
});

// ---------------------------------------------------------------------------
// US5: facilitator tools — countdown timer, private notes, convert-to-action-item.
// ---------------------------------------------------------------------------

test('the facilitator starts, pauses, and resets the timer, live for a second participant', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner15@example.com', 'E2E Retro Owner 15', 'E2E Timer Live Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    // The facilitator must be the board's actual owner (uid === retrospective.createdBy)
    // — signInWithGoogle always authenticates a separate fixed shared account, so the
    // owner identity has to sign in via signInAs here (same gotcha as the "third
    // participant" test above).
    await signInAs(pageA, 'e2e-retro-owner15@example.com', 'E2E Retro Owner 15');
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Timer Live Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant15@example.com', 'E2E Retro Participant 15');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Timer Live Board')).toBeVisible({ timeout: 30_000 });

    await pageA.getByRole('button', { name: 'Controles de Facilitador' }).click();
    // The minutes/seconds inputs have visible <label>s but no htmlFor/id association
    // (ControlsTab.tsx), so target the first of the two number inputs directly.
    await pageA.locator('input[type="number"]').first().fill('1');
    await pageA.getByRole('button', { name: 'Crear Temporizador' }).click();
    await pageA.getByRole('button', { name: 'Iniciar' }).click();

    // pageB never reloads — the running timer appears live in its topbar via the WS relay.
    await expect(pageB.getByText('En curso')).toBeVisible({ timeout: 10_000 });

    await pageA.getByRole('button', { name: 'Pausar' }).click();
    await expect(pageB.getByText('Pausado')).toBeVisible({ timeout: 10_000 });

    await pageA.getByRole('button', { name: 'Reiniciar' }).click();
    await expect(pageB.getByText('Pausado')).not.toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
});

test('timer control is rejected for a non-facilitator (403)', async ({ request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner16@example.com', 'E2E Retro Owner 16', 'E2E Timer 403 Board');

    // request is authenticated as the board owner (from createBoardViaApi's login) —
    // log in as a distinct non-owner identity for this call only, then restore.
    const nonOwnerLogin = await request.post('/api/auth/test-login', { data: { email: 'e2e-non-facilitator16@example.com', displayName: 'Not The Facilitator' } });
    expect(nonOwnerLogin.ok()).toBeTruthy();

    const configureRes = await request.put(`/api/retrospectives/${boardId}/timer`, { data: { duration: 300 } });
    expect(configureRes.status()).toBe(403);
});

test("a facilitator note is never visible to another participant's session", async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner17@example.com', 'E2E Retro Owner 17', 'E2E Notes Isolation Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, 'e2e-retro-owner17@example.com', 'E2E Retro Owner 17');
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Notes Isolation Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant17@example.com', 'E2E Retro Participant 17');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Notes Isolation Board')).toBeVisible({ timeout: 30_000 });

    // B writes its own private note directly via the backend (any authenticated
    // participant may keep private notes, FR-013 — not restricted to the board's
    // designated facilitator).
    const bNoteRes = await pageB.request.post(`/api/retrospectives/${boardId}/notes`, { data: { content: "B's private note" } });
    expect(bNoteRes.ok()).toBeTruthy();

    // A (the facilitator) writes its own note via the real UI.
    await pageA.getByRole('button', { name: 'Controles de Facilitador' }).click();
    await pageA.getByRole('tab', { name: 'Notas' }).click();
    await pageA.getByRole('button', { name: 'Nueva' }).click();
    await pageA.getByPlaceholder('Escribe tu nota aquí...').fill("A's private note");
    await pageA.getByRole('button', { name: 'Guardar' }).click();

    await expect(pageA.getByText("A's private note")).toBeVisible({ timeout: 10_000 });
    // B's note is never shown to A's session, live or otherwise.
    await expect(pageA.getByText("B's private note")).not.toBeVisible();

    // Confirmed from the backend's own scoping too, not just the DOM.
    const aState = await pageA.request.get(`/api/retrospectives/${boardId}`);
    const aBody = (await aState.json()) as { myFacilitatorNotes: Array<{ content: string }> };
    expect(aBody.myFacilitatorNotes.map((n) => n.content)).toEqual(["A's private note"]);

    await contextA.close();
    await contextB.close();
});

test('converting a card to an action item propagates live to a second participant', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner18@example.com', 'E2E Retro Owner 18', 'E2E Convert Live Board');
    const createRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card to convert', column: 'helped' } });
    expect(createRes.ok()).toBeTruthy();
    const { id: cardId } = (await createRes.json()) as { id: string };

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAs(pageA, 'e2e-retro-owner18@example.com', 'E2E Retro Owner 18');
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Convert Live Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant18@example.com', 'E2E Retro Participant 18');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Convert Live Board')).toBeVisible({ timeout: 30_000 });

    // Before conversion, B sees the card's content exactly once (the source card).
    await expect(pageB.getByText('Card to convert')).toHaveCount(1);

    const convertRes = await pageA.request.post(`/api/cards/${cardId}/convert-to-action-item`, { data: {} });
    expect(convertRes.ok()).toBeTruthy();

    // B never reloads — a second occurrence (the new action item) appears live: the
    // untouched source card plus its action-item copy.
    await expect(pageB.getByText('Card to convert')).toHaveCount(2, { timeout: 10_000 });

    await contextA.close();
    await contextB.close();
});

test('the card actions menu opens anchored to its trigger, not pinned to the top-left corner', async ({ page, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner20@example.com', 'E2E Retro Owner 20', 'E2E Card Menu Anchor Board');
    const createRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card with actions menu', column: 'helped' } });
    expect(createRes.ok()).toBeTruthy();

    // The actions-menu trigger only renders for the board's facilitator (owner) —
    // RetrospectiveBoard.tsx passes canConvertToAction={isFacilitator} — so this
    // must sign in as the same identity that created the board via the API above.
    await signInAs(page, 'e2e-retro-owner20@example.com', 'E2E Retro Owner 20');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Card Menu Anchor Board')).toBeVisible({ timeout: 30_000 });

    const card = cardByContent(page, 'Card with actions menu');
    const trigger = card.getByLabel('Convertir en elemento de acción');
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();

    await trigger.click();
    // Both the trigger's own aria-label and the panel's accessible name (resolved via
    // Floating UI's aria-labelledby back to the trigger) happen to be this same
    // Spanish string (es.json's convertToAction/convertToActionTitle keys).
    const panel = page.getByRole('menu', { name: 'Convertir en elemento de acción' });
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();

    // The reported defect: the panel rendered pinned at the viewport's top-left
    // corner (x≈0, y≈0) regardless of the trigger's real on-screen position. Assert
    // it is nowhere near the origin and instead close to the trigger it was opened
    // from (research.md §1 — a real, non-trivial Y offset from 0, close to the
    // trigger's own, proves Floating UI's positioning transform survived the
    // entrance animation instead of being overwritten by it).
    expect(panelBox!.y).toBeGreaterThan(50);
    expect(Math.abs(panelBox!.y - triggerBox!.y)).toBeLessThan(200);

    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// US6: action items direct CRUD (not via card conversion), backend-mediated and live.
// ---------------------------------------------------------------------------

test('creating, editing, and deleting an action item directly propagates live to a second participant', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner19@example.com', 'E2E Retro Owner 19', 'E2E Action Item CRUD Board');

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInWithGoogle(pageA, contextA);
    await pageA.goto(`/retro/${boardId}`);
    await expect(pageA.getByText('E2E Action Item CRUD Board')).toBeVisible({ timeout: 30_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAs(pageB, 'e2e-retro-participant19@example.com', 'E2E Retro Participant 19');
    await pageB.goto(`/retro/${boardId}`);
    await expect(pageB.getByText('E2E Action Item CRUD Board')).toBeVisible({ timeout: 30_000 });

    // Create — direct, independent of card conversion (FR-015) — any participant may
    // do this, not just the facilitator, so exercise it as B.
    const createRes = await pageB.request.post(`/api/retrospectives/${boardId}/action-items`, { data: { content: 'Follow up with design' } });
    expect(createRes.ok()).toBeTruthy();
    const { id: itemId } = (await createRes.json()) as { id: string };

    // pageA never reloads — the new action item appears live via the WS relay.
    await expect(pageA.getByText('Follow up with design')).toBeVisible({ timeout: 10_000 });

    // Edit — any participant, not just its creator or the facilitator (FR-015).
    const editRes = await pageA.request.patch(`/api/action-items/${itemId}`, { data: { content: 'Follow up with design — done' } });
    expect(editRes.ok()).toBeTruthy();
    await expect(pageB.getByText('Follow up with design — done')).toBeVisible({ timeout: 10_000 });

    // Delete.
    const deleteRes = await pageA.request.delete(`/api/action-items/${itemId}`);
    expect(deleteRes.ok()).toBeTruthy();
    await expect(pageB.getByText('Follow up with design — done')).not.toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
});

// ---------------------------------------------------------------------------
// US7: sentiment results persist across sessions, backend-mediated. The AI inference
// itself stays client-side and unaffected (spec Assumptions) — these specs cover the
// persistence layer only, via the backend API directly, not the ML worker.
// ---------------------------------------------------------------------------

test('a computed sentiment result and a facilitator override both persist across a reload, sourced through the backend', async ({ page, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner20@example.com', 'E2E Retro Owner 20', 'E2E Sentiment Persist Board');
    const createRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'A card to analyze', column: 'helped' } });
    expect(createRes.ok()).toBeTruthy();
    const { id: cardId } = (await createRes.json()) as { id: string };

    // The facilitator override step below requires the caller to be the board's
    // actual owner (uid === retrospective.createdBy) — signInWithGoogle always
    // authenticates a separate fixed shared account, so sign in as the real owner
    // (same gotcha as the "third participant" test earlier in this file).
    await signInAs(page, 'e2e-retro-owner20@example.com', 'E2E Retro Owner 20');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Sentiment Persist Board')).toBeVisible({ timeout: 30_000 });

    // Save a computed result (as would happen after local AI inference finishes).
    const saveRes = await page.request.put(`/api/cards/${cardId}/sentiment`, {
        data: { sentiment: 'positive', confidence: 0.87, modelId: 'm1', modelVersion: 'v1', contentHash: 'hash-1' },
    });
    expect(saveRes.ok()).toBeTruthy();

    // Reload — the result must come back from the backend's GetBoardState, not a
    // client-side cache, since this feature has no direct-Firebase read path left.
    await page.reload();
    await expect(page.getByText('E2E Sentiment Persist Board')).toBeVisible({ timeout: 30_000 });
    const afterReload = await page.request.get(`/api/retrospectives/${boardId}`);
    const stateAfterReload = (await afterReload.json()) as { sentimentResults: Array<{ cardId: string; sentiment: string; isOverride: boolean }> };
    const computed = stateAfterReload.sentimentResults.find((r) => r.cardId === cardId);
    expect(computed).toMatchObject({ sentiment: 'positive', isOverride: false });

    // The facilitator overrides it.
    const overrideRes = await page.request.put(`/api/cards/${cardId}/sentiment/override`, { data: { sentiment: 'negative' } });
    expect(overrideRes.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByText('E2E Sentiment Persist Board')).toBeVisible({ timeout: 30_000 });
    const afterOverrideReload = await page.request.get(`/api/retrospectives/${boardId}`);
    const stateAfterOverride = (await afterOverrideReload.json()) as { sentimentResults: Array<{ cardId: string; sentiment: string; isOverride: boolean; overrideBy: string | null }> };
    const overridden = stateAfterOverride.sentimentResults.find((r) => r.cardId === cardId);
    expect(overridden?.sentiment).toBe('negative');
    expect(overridden?.isOverride).toBe(true);
    expect(overridden?.overrideBy).toBeTruthy();
});

test('a sentiment override is rejected for a non-facilitator (403)', async ({ request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner21@example.com', 'E2E Retro Owner 21', 'E2E Sentiment 403 Board');
    const createRes = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Another card', column: 'helped' } });
    const { id: cardId } = (await createRes.json()) as { id: string };

    const nonOwnerLogin = await request.post('/api/auth/test-login', { data: { email: 'e2e-non-facilitator21@example.com', displayName: 'Not The Facilitator' } });
    expect(nonOwnerLogin.ok()).toBeTruthy();

    const overrideRes = await request.put(`/api/cards/${cardId}/sentiment/override`, { data: { sentiment: 'negative' } });
    expect(overrideRes.status()).toBe(403);
});

// ---------------------------------------------------------------------------
// Polish: optional cascade-delete on board deletion (research.md §9, T111).
// ---------------------------------------------------------------------------

test('deleting a board cascade-deletes its groups, action items, facilitator notes, sentiment results, timer, and typing status', async ({ request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner22@example.com', 'E2E Retro Owner 22', 'E2E Cascade Delete Board');

    const createHead = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Head card', column: 'helped' } });
    const { id: headId } = (await createHead.json()) as { id: string };
    const createMember = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Member card', column: 'helped' } });
    const { id: memberId } = (await createMember.json()) as { id: string };

    const groupRes = await request.post(`/api/retrospectives/${boardId}/groups`, { data: { column: 'helped', headCardId: headId, memberCardIds: [memberId] } });
    expect(groupRes.ok()).toBeTruthy();
    const actionItemRes = await request.post(`/api/retrospectives/${boardId}/action-items`, { data: { content: 'Follow up' } });
    expect(actionItemRes.ok()).toBeTruthy();
    const noteRes = await request.post(`/api/retrospectives/${boardId}/notes`, { data: { content: 'A private note' } });
    expect(noteRes.ok()).toBeTruthy();
    const sentimentRes = await request.put(`/api/cards/${headId}/sentiment`, { data: { sentiment: 'positive', confidence: 0.9, contentHash: 'h' } });
    expect(sentimentRes.ok()).toBeTruthy();
    const timerRes = await request.put(`/api/retrospectives/${boardId}/timer`, { data: { duration: 300 } });
    expect(timerRes.ok()).toBeTruthy();
    const typingRes = await request.post(`/api/retrospectives/${boardId}/typing`, { data: { column: 'helped', isActive: true } });
    expect(typingRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`/api/boards/${boardId}`);
    expect(deleteRes.ok()).toBeTruthy();

    const db = getEmulatorFirestore();
    const [groups, actionItems, notes, sentimentResults, typingStatuses, timer] = await Promise.all([
        db.collection('groups').where('retrospectiveId', '==', boardId).get(),
        db.collection('actionItems').where('retrospectiveId', '==', boardId).get(),
        db.collection('facilitatorNotes').where('retrospectiveId', '==', boardId).get(),
        db.collection('sentimentResults').where('retrospectiveId', '==', boardId).get(),
        db.collection('typingStatus').where('retrospectiveId', '==', boardId).get(),
        db.collection('countdown_timers').doc(boardId).get(),
    ]);
    expect(groups.empty).toBe(true);
    expect(actionItems.empty).toBe(true);
    expect(notes.empty).toBe(true);
    expect(sentimentResults.empty).toBe(true);
    expect(typingStatuses.empty).toBe(true);
    expect(timer.exists).toBe(false);
});

// ---------------------------------------------------------------------------
// Polish: pre-existing (pre-migration) data integrity (SC-005, T121). Every document
// below is written directly via the Admin SDK, in the exact shape the OLD, now-retired
// Firestore-direct client services (cardService.ts, cardGroupService.ts,
// actionItemsService.ts, facilitatorNotesService.ts, sentimentResultsService.ts,
// countdownService.ts) used to produce — never through this feature's own REST API —
// simulating data that already existed before this migration shipped.
// ---------------------------------------------------------------------------

test('pre-existing data (written in the old, pre-migration document shape) loads and renders correctly with zero data loss', async ({ page, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner23@example.com', 'E2E Retro Owner 23', 'E2E Legacy Data Board');

    await signInAs(page, 'e2e-retro-owner23@example.com', 'E2E Retro Owner 23');
    const sessionRes = await page.request.get('/api/auth/session');
    const session = (await sessionRes.json()) as { user: { uid: string } };
    const uid = session.user.uid;

    const db = getEmulatorFirestore();
    const now = new Date();

    const headCardRef = db.collection('cards').doc();
    const memberCardRef = db.collection('cards').doc();
    await headCardRef.set({
        content: 'Legacy head card', column: 'helped', createdBy: uid, createdAt: now, updatedAt: now,
        retrospectiveId: boardId, color: 'pastelBlue', votes: 3, likes: [{ userId: uid, username: 'Legacy Owner', timestamp: now }],
        reactions: [], order: 0, groupId: 'legacy-group-1', isGroupHead: true,
    });
    await memberCardRef.set({
        content: 'Legacy member card', column: 'helped', createdBy: uid, createdAt: now, updatedAt: now,
        retrospectiveId: boardId, votes: 0, likes: [], reactions: [], order: 1,
        groupId: 'legacy-group-1', isGroupHead: false, groupOrder: 0,
    });
    await db.collection('groups').doc('legacy-group-1').set({
        retrospectiveId: boardId, column: 'helped', headCardId: headCardRef.id, memberCardIds: [memberCardRef.id],
        isCollapsed: false, createdAt: now, createdBy: uid, order: 0,
    });
    await db.collection('actionItems').add({
        content: 'Legacy action item', retrospectiveId: boardId, createdBy: uid,
        assignedTo: null, assignedToName: null, dueDate: null, createdAt: now, updatedAt: now, order: 0,
    });
    await db.collection('facilitatorNotes').add({
        content: 'Legacy facilitator note', retrospectiveId: boardId, facilitatorId: uid, timestamp: now,
    });
    await db.collection('sentimentResults').doc(`${boardId}_${headCardRef.id}`).set({
        retrospectiveId: boardId, cardId: headCardRef.id, sentiment: 'positive', confidence: 0.95,
        modelId: 'legacy-model', modelVersion: 'legacy-v1', contentHash: 'legacy-hash', isOverride: false,
        overrideBy: null, analyzedAt: now,
    });
    await db.collection('countdown_timers').doc(boardId).set({
        retrospectiveId: boardId, startTime: null, duration: 300, originalDuration: 300,
        isRunning: false, isPaused: false, endTime: null, createdBy: uid, createdAt: now, updatedAt: now,
    });

    const stateRes = await page.request.get(`/api/retrospectives/${boardId}`);
    expect(stateRes.ok()).toBeTruthy();
    const state = (await stateRes.json()) as {
        cards: Array<{ id: string; content: string }>;
        groups: Array<{ id: string; headCardId: string; memberCardIds: string[] }>;
        actionItems: Array<{ content: string }>;
        myFacilitatorNotes: Array<{ content: string }>;
        sentimentResults: Array<{ cardId: string; sentiment: string }>;
        timer: { duration: number } | null;
    };
    expect(state.cards.map((c) => c.content)).toEqual(expect.arrayContaining(['Legacy head card', 'Legacy member card']));
    expect(state.groups).toHaveLength(1);
    expect(state.groups[0]).toMatchObject({ headCardId: headCardRef.id, memberCardIds: [memberCardRef.id] });
    expect(state.actionItems.map((a) => a.content)).toContain('Legacy action item');
    expect(state.myFacilitatorNotes.map((n) => n.content)).toContain('Legacy facilitator note');
    expect(state.sentimentResults).toContainEqual(expect.objectContaining({ cardId: headCardRef.id, sentiment: 'positive' }));
    expect(state.timer).toMatchObject({ duration: 300 });

    // And it actually renders in the UI, not just the API response.
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Legacy Data Board')).toBeVisible({ timeout: 30_000 });
    await expect(cardByContent(page, 'Legacy head card')).toBeVisible();
    await expect(page.getByText('Grupo de 2 tarjetas')).toBeVisible();
    await expect(page.getByText('Legacy action item')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Feature 034, User Story 1: the options menu and facilitator menu must open
// anchored to their trigger button, never pinned to the viewport's top-left corner
// (Contract 1, specs/034-fix-retro-board-bugs/contracts/ui-behavior-contracts.md).
// ---------------------------------------------------------------------------

/** True when `panel`'s bounding box sits directly against `trigger`'s (touching its
 * bottom edge, or its top edge if flipped above) rather than floating disconnected
 * from it elsewhere on screen — the direct regression check for the reported "panel
 * jumps to the top-left corner" defect (research.md §1: a Framer Motion `transform`
 * overwriting Floating UI's own positioning `transform` on the same DOM node). */
async function isAnchoredToTrigger(panel: import('@playwright/test').Locator, trigger: import('@playwright/test').Locator): Promise<boolean> {
    const panelBox = await panel.boundingBox();
    const triggerBox = await trigger.boundingBox();
    if (!panelBox || !triggerBox) return false;
    const ANCHOR_SLACK_PX = 16; // offset(8) + shift/flip padding(8) from useBoardMenuOverlay
    const touchesBelow = Math.abs(panelBox.y - (triggerBox.y + triggerBox.height)) <= ANCHOR_SLACK_PX;
    const touchesAbove = Math.abs((panelBox.y + panelBox.height) - triggerBox.y) <= ANCHOR_SLACK_PX;
    const horizontallyOverlapsOrNear = panelBox.x < triggerBox.x + triggerBox.width + 200 && panelBox.x + panelBox.width > triggerBox.x - 200;
    return (touchesBelow || touchesAbove) && horizontallyOverlapsOrNear;
}

test('the options menu and the facilitator menu open anchored to their trigger button, not pinned to the top-left corner', async ({ page, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner16@example.com', 'E2E Retro Owner 16', 'E2E Menu Anchor Board');
    await signInAs(page, 'e2e-retro-owner16@example.com', 'E2E Retro Owner 16');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Menu Anchor Board')).toBeVisible({ timeout: 30_000 });

    // Options menu: anchored below its own trigger button at default viewport size.
    const optionsTrigger = page.getByRole('button', { name: 'Opciones', exact: true });
    await optionsTrigger.click();
    const optionsPanel = page.getByRole('menu', { name: 'Opciones', exact: true });
    await expect(optionsPanel).toBeVisible();
    expect(await isAnchoredToTrigger(optionsPanel, optionsTrigger)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(optionsPanel).not.toBeVisible();

    // Facilitator menu: anchored below its own (different) trigger button.
    const facilitatorTrigger = page.getByRole('button', { name: 'Controles de Facilitador' });
    await facilitatorTrigger.click();
    const facilitatorPanel = page.getByRole('dialog', { name: 'Controles de Facilitador' });
    await expect(facilitatorPanel).toBeVisible();
    expect(await isAnchoredToTrigger(facilitatorPanel, facilitatorTrigger)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(facilitatorPanel).not.toBeVisible();

    // Still anchored after a viewport resize while closed, then reopened — `autoUpdate`
    // must recompute the anchor against the button's new on-screen position rather than
    // a stale one.
    await page.setViewportSize({ width: 900, height: 700 });
    await optionsTrigger.click();
    await expect(optionsPanel).toBeVisible();
    expect(await isAnchoredToTrigger(optionsPanel, optionsTrigger)).toBe(true);
    await page.keyboard.press('Escape');
});

// spec 044-ai-card-grouping, US1: the grouping-suggestions panel previously rendered
// pinned to the viewport's top-left corner (an ancestor `motion.div`'s `transform`
// trapped its `position: fixed` backdrop, research.md §1) instead of anchored to the
// grouping-mode trigger button that opened it, like every other popup in the app.
test('the grouping-suggestions panel opens anchored to its trigger button, not pinned to the top-left corner (spec 044)', async ({ page, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner22@example.com', 'E2E Retro Owner 22', 'E2E Suggestions Anchor Board');
    // COLUMN_ORDER is ['helped', 'hindered', 'improve'] — seed the last-rendered
    // column so its trigger sits away from the top-left of the board.
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Necesitamos mejorar la comunicación en el equipo', column: 'improve' } });
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Deberíamos comunicarnos mejor entre equipos', column: 'improve' } });
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Añadir más pruebas automatizadas', column: 'improve' } });

    await signInAs(page, 'e2e-retro-owner22@example.com', 'E2E Retro Owner 22');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Suggestions Anchor Board')).toBeVisible({ timeout: 30_000 });

    const trigger = page.getByRole('button', { name: 'Opciones de agrupación' }).last();
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.x).toBeGreaterThan(300); // away from the top-left corner

    await trigger.click();
    await page.getByText('Agrupaciones sugeridas', { exact: true }).click();

    const panel = page.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
    await expect(panel).toBeVisible({ timeout: 15_000 });
    // The reported defect: the panel rendered pinned at the viewport's top-left corner
    // regardless of the trigger's real position. isAnchoredToTrigger asserts the panel
    // touches the trigger's edge instead (research.md §1).
    expect(await isAnchoredToTrigger(panel, trigger)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();

    // Viewport-edge flip/shift: shrink the viewport so the rightmost column's trigger
    // sits near the right edge, then confirm the panel still renders fully anchored.
    await page.setViewportSize({ width: 700, height: 700 });
    await trigger.click();
    await page.getByText('Agrupaciones sugeridas', { exact: true }).click();
    await expect(panel).toBeVisible({ timeout: 15_000 });
    expect(await isAnchoredToTrigger(panel, trigger)).toBe(true);

    // Scroll while open — autoUpdate must keep the panel anchored to the trigger's
    // current on-screen position, not a stale one.
    await page.mouse.wheel(0, 200);
    await expect(panel).toBeVisible();
    expect(await isAnchoredToTrigger(panel, trigger)).toBe(true);

    await page.keyboard.press('Escape');
});

// spec 044-ai-card-grouping, US2 edge case: the on-device model host is unreachable —
// the panel must show a clear "unavailable" message (FR-008), never fall back to any
// other computation, and never look identical to the "no suggestions found" empty
// state (contracts/anchored-suggestions-panel-contract.md). Deliberately placed
// *before* the real-model test below: this test blocks the model host and never
// downloads anything, while the next one performs a real, heavyweight model download —
// running heavy-then-light in the same (single, non-parallel — playwright.config.ts's
// `workers: 1`) browser process was found to leave enough residual resource pressure to
// intermittently time out the *next* test's sign-in step; light-then-heavy avoids that.
test('AI analysis unavailable shows a distinct, non-technical message — not an empty/broken panel, and no silent fallback (spec 044, FR-008)', async ({ page, request }) => {
    const boardId = await createBoardViaApi(request, 'e2e-retro-owner24@example.com', 'E2E Retro Owner 24', 'E2E AI Unavailable Board');
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card one', column: 'improve' } });
    await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Card two', column: 'improve' } });

    // Block the model host so the embedding pipeline fails to load.
    await page.route('**huggingface.co/**', route => route.abort('failed'));

    await signInAs(page, 'e2e-retro-owner24@example.com', 'E2E Retro Owner 24');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E AI Unavailable Board')).toBeVisible({ timeout: 30_000 });

    const trigger = page.getByRole('button', { name: 'Opciones de agrupación' }).last();
    await trigger.click();
    await page.getByText('Agrupaciones sugeridas', { exact: true }).click();

    const panel = page.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByRole('alert')).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByText('Análisis de IA no disponible')).toBeVisible();
    // Distinct from the "no suggestions found" empty state, not merely absent content.
    await expect(panel.getByText('No se encontraron sugerencias')).not.toBeVisible();
});

// spec 044-ai-card-grouping, US2: proposed groupings are now computed from on-device
// AI semantic analysis (sentence embeddings) instead of the removed text-similarity
// algorithm. First use in a fresh browser context includes a one-time model download,
// so the initial suggestions request is given a generous timeout (FR-007's loading
// state covers that wait); the SC-004 performance target (a few seconds for up to 25
// cards) is only meaningful once the model is already warm, so it's measured on a
// *second* request within the same (now-warm) session, not the cold-start one.
test('AI-based grouping proposes semantically similar cards together, excludes unrelated cards, persists an accepted group, and meets the SC-004 performance target once warmed up (spec 044)', async ({ page, request }) => {
    // Overrides the global 60s test timeout (playwright.config.ts) — the first
    // suggestions request in a fresh browser context includes a one-time embedding
    // model download, which can legitimately take longer than that alone.
    test.setTimeout(150_000);

    const boardId = await createBoardViaApi(request, 'e2e-retro-owner23@example.com', 'E2E Retro Owner 23', 'E2E Semantic Grouping Board');

    // Two cards on the same topic in varied wording (no shared keywords), plus one
    // clearly unrelated card — all in the 'improve' column.
    const similarA = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Necesitamos mejorar la comunicación entre equipos', column: 'improve' } });
    const { id: similarAId } = (await similarA.json()) as { id: string };
    const similarB = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'Deberíamos coordinarnos mejor con los demás equipos', column: 'improve' } });
    const { id: similarBId } = (await similarB.json()) as { id: string };
    const unrelated = await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content: 'El servidor de CI tarda demasiado en arrancar', column: 'improve' } });
    const { id: unrelatedId } = (await unrelated.json()) as { id: string };

    await signInAs(page, 'e2e-retro-owner23@example.com', 'E2E Retro Owner 23');
    await page.goto(`/retro/${boardId}`);
    await expect(page.getByText('E2E Semantic Grouping Board')).toBeVisible({ timeout: 30_000 });

    const trigger = page.getByRole('button', { name: 'Opciones de agrupación' }).last();
    await trigger.click();
    await page.getByText('Agrupaciones sugeridas', { exact: true }).click();

    const panel = page.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
    await expect(panel).toBeVisible({ timeout: 15_000 });
    // Cold-start: allow generous time for the one-time model download + first inference.
    await expect(panel.getByText(/Grupo 1|No se encontraron sugerencias/)).toBeVisible({ timeout: 90_000 });

    const acceptButton = panel.getByRole('button', { name: /Crear Grupo/i }).first();
    await expect(acceptButton).toBeVisible();

    // Expand the card preview so group membership is visible, then confirm the two
    // similar cards are shown together and the unrelated card is not.
    const previewToggle = panel.getByLabel(/Mostrar tarjetas/).first();
    if (await previewToggle.isVisible().catch(() => false)) await previewToggle.click();
    await expect(panel.getByText('Necesitamos mejorar la comunicación entre equipos')).toBeVisible();
    await expect(panel.getByText('Deberíamos coordinarnos mejor con los demás equipos')).toBeVisible();
    await expect(panel.getByText('El servidor de CI tarda demasiado en arrancar')).not.toBeVisible();

    await acceptButton.click();
    await expect(panel).not.toBeVisible({ timeout: 10_000 });

    // Persistence check: confirm a real CardGroup was created containing the two
    // similar cards, via the same REST API the "grouping cards..." test already uses.
    const stateRes = await request.get(`/api/retrospectives/${boardId}`);
    const state = await stateRes.json() as { groups?: { headCardId: string; memberCardIds: string[] }[] };
    const persistedGroup = state.groups?.find(
        g => [g.headCardId, ...g.memberCardIds].includes(similarAId) && [g.headCardId, ...g.memberCardIds].includes(similarBId)
    );
    expect(persistedGroup).toBeDefined();
    expect([persistedGroup!.headCardId, ...persistedGroup!.memberCardIds]).not.toContain(unrelatedId);

    // SC-004 (clarified: up to 25 cards, a few seconds) — measured on a second,
    // now-warm request in a different column so the model is no longer cold-starting.
    const timingCards = Array.from({ length: 25 }, (_, i) => `Idea de mejora número ${i}`);
    for (const content of timingCards) {
        await request.post(`/api/retrospectives/${boardId}/cards`, { data: { content, column: 'hindered' } });
    }
    await page.reload();
    await expect(page.getByText('E2E Semantic Grouping Board')).toBeVisible({ timeout: 30_000 });
    const timingTrigger = page.getByRole('button', { name: 'Opciones de agrupación' }).nth(1);

    const start = Date.now();
    await timingTrigger.click();
    await page.getByText('Agrupaciones sugeridas', { exact: true }).click();
    const timingPanel = page.getByRole('dialog', { name: 'Sugerencias de Agrupación' });
    await expect(timingPanel.getByText(/Grupo 1|No se encontraron sugerencias/)).toBeVisible({ timeout: 10_000 });
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(5_000);
});
