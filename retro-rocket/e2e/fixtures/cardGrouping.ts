import { APIRequestContext, Browser, BrowserContext, Locator, Page, expect } from '@playwright/test';
import { createBoardViaApi, signInAs } from './auth-helpers';
// Type-only imports inside dragIntent.ts are erased, so Playwright's TS loader can resolve this.
import { DWELL_MS } from '../../src/features/boards/clustering/dnd/dragIntent';

/**
 * Shared helpers for the drag-to-group E2E and accessibility specs (spec 059, T075/T076):
 * board seeding through the API (no UI setup cost), real pointer drags through
 * `page.mouse` (the PointerSensor needs genuine pointer events), and a DOM-order reader
 * so "the group appears in the target's slot" is asserted against the rendered column.
 */

export { DWELL_MS };
/** Hold time that guarantees the dwell threshold (180 ms) has elapsed, with margin. */
export const HOLD_MS = DWELL_MS + 50;

export const DRAG_HANDLE_NAME = 'Mover tarjeta (arrastrar)';
export const DEFAULT_GROUP_TITLE = 'Nuevo grupo';
export const CONFLICT_TOAST = 'La tarjeta o el grupo ha cambiado. No se agrupó nada.';

const RETRO = '/api/retrospectives';

export type GroupingMode = 'none' | 'user' | 'suggestions';

export interface SeededBoard {
    boardId: string;
    title: string;
    ownerEmail: string;
    ownerName: string;
    /** card content -> card id, in creation order. */
    cardIds: Record<string, string>;
}

/** Creates a board + ordered cards in `helped` (the first column) and sets its grouping mode. */
export async function seedGroupingBoard(
    request: APIRequestContext,
    tag: string,
    cardTexts: string[],
    mode: GroupingMode = 'none',
    extra: { column?: string } = {},
): Promise<SeededBoard> {
    const column = extra.column ?? 'helped';
    const ownerEmail = `e2e-dnd-${tag}-owner@example.com`;
    const ownerName = `E2E DnD Owner ${tag}`;
    const title = `E2E DnD Board ${tag}`;
    const boardId = await createBoardViaApi(request, ownerEmail, ownerName, title);
    const cardIds: Record<string, string> = {};
    for (const content of cardTexts) {
        const res = await request.post(`${RETRO}/${boardId}/cards`, { data: { content, column } });
        expect(res.ok(), `create card ${content}`).toBeTruthy();
        cardIds[content] = ((await res.json()) as { id: string }).id;
    }
    await setColumnMode(request, boardId, mode, column);
    return { boardId, title, ownerEmail, ownerName, cardIds };
}

export async function setColumnMode(request: APIRequestContext, boardId: string, mode: GroupingMode, column = 'helped'): Promise<void> {
    const res = await request.patch(`${RETRO}/${boardId}/column-grouping`, { data: { [column]: { criteria: mode, activeGroups: [] } } });
    expect(res.ok(), 'set column grouping mode').toBeTruthy();
}

/** Creates a manual group (head first) through the API; returns its id. */
export async function seedGroup(
    request: APIRequestContext,
    boardId: string,
    memberIds: string[],
    title?: string,
    column = 'helped',
): Promise<string> {
    const [headCardId, ...rest] = memberIds;
    const res = await request.post(`${RETRO}/${boardId}/groups`, {
        data: { column, headCardId, memberCardIds: rest, title, origin: 'manual' },
    });
    expect(res.ok(), `seed group ${title ?? '(untitled)'}: ${res.status()}`).toBeTruthy();
    return ((await res.json()) as { id: string }).id;
}

interface BoardState {
    cards?: Array<{ id: string; column: string; groupId?: string | null; content: string }>;
    groups?: Array<{ id: string; title?: string; headCardId: string; memberCardIds: string[]; column: string }>;
}

export async function fetchState(request: APIRequestContext, boardId: string): Promise<BoardState> {
    const res = await request.get(`${RETRO}/${boardId}`);
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as BoardState;
}

export interface Participants {
    ctxA: BrowserContext;
    pageA: Page;
    ctxB: BrowserContext;
    pageB: Page;
    close: () => Promise<void>;
}

/** Opens the board in two isolated browser contexts: A = the owner, B = a distinct participant. */
export async function openTwoBrowsers(browser: Browser, board: SeededBoard, tag: string): Promise<Participants> {
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const pageA = await ctxA.newPage();
    await signInAs(pageA, board.ownerEmail, board.ownerName);
    await pageA.goto(`/retro/${board.boardId}`);
    await expect(pageA.getByText(board.title)).toBeVisible({ timeout: 30_000 });

    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const pageB = await ctxB.newPage();
    await signInAs(pageB, `e2e-dnd-${tag}-participant@example.com`, `E2E DnD Participant ${tag}`);
    await pageB.goto(`/retro/${board.boardId}`);
    await expect(pageB.getByText(board.title)).toBeVisible({ timeout: 30_000 });

    return { ctxA, pageA, ctxB, pageB, close: async () => { await ctxA.close(); await ctxB.close(); } };
}

export function column(page: Page, index = 0): Locator {
    return page.locator('[data-card-column]').nth(index);
}

export function card(page: Page, content: string): Locator {
    return page.locator('[data-testid="draggable-card"]', { hasText: content }).first();
}

/** The group's outer box (dashed border) found through its title heading. */
export function groupRoot(page: Page, title: string): Locator {
    return column(page)
        .locator('h3')
        .filter({ hasText: title })
        .first()
        .locator('xpath=ancestor::div[contains(@class,"border-dashed")][1]');
}

export function groupTitleButton(page: Page, title: string): Locator {
    return page.getByRole('button', { name: `Renombrar grupo: ${title}` });
}

/**
 * Reads the first column's rendered order, top to bottom. Each ungrouped or member card
 * becomes its matching label from `labels`; each group heading becomes `G:<title>` (members
 * follow their heading). Reading the DOM, not the store, proves what the user sees.
 */
export async function columnTokens(page: Page, labels: string[], columnIndex = 0): Promise<string[]> {
    return column(page, columnIndex).evaluate((root, known) => {
        const nodes = Array.from(root.querySelectorAll('[data-testid="draggable-card"], h3'));
        return nodes.map((node) => {
            if (node.tagName === 'H3') return `G:${(node.textContent ?? '').trim()}`;
            const text = (node as HTMLElement).innerText;
            return known.find((label) => text.includes(label)) ?? '?';
        });
    }, labels);
}

type Zone = 'center' | 'before' | 'after';

export interface DragSession {
    /** Releases the pointer. */
    drop: () => Promise<void>;
}

/**
 * Starts a real pointer drag of `source` (via its drag handle) and moves it so the dragged
 * card's CENTRE lands on `target`'s `zone`. The dragged rect is the grab-offset-translated
 * source rect, so the pointer is moved by (targetPoint - sourceCentre), not to the target.
 * `holdMs > 0` pauses there (use HOLD_MS to arm grouping). Returns without releasing so the
 * caller can assert mid-drag state, then call `drop()`.
 */
export async function beginDrag(
    page: Page,
    source: Locator,
    target: Locator,
    options: { zone?: Zone; holdMs?: number; viaPoints?: Locator[]; steps?: number } = {},
): Promise<DragSession> {
    const { zone = 'center', holdMs = 0, viaPoints = [], steps = 20 } = options;
    await source.scrollIntoViewIfNeeded();
    await source.hover(); // reveals the hover-only drag handle
    const handle = source.getByRole('button', { name: DRAG_HANDLE_NAME }).first();
    const handleBox = await handle.boundingBox();
    const sourceBox = await source.boundingBox();
    if (!handleBox || !sourceBox) throw new Error('beginDrag: source or handle has no box');
    const start = { x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height / 2 };
    const sourceCentre = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };

    const pointFor = async (loc: Locator, z: Zone) => {
        const box = await loc.boundingBox();
        if (!box) throw new Error('beginDrag: target has no box');
        const inset = Math.min(6, box.height * 0.1);
        const y = z === 'before' ? box.y + inset : z === 'after' ? box.y + box.height - inset : box.y + box.height / 2;
        const p = { x: box.x + box.width / 2, y };
        return { x: start.x + (p.x - sourceCentre.x), y: start.y + (p.y - sourceCentre.y) };
    };

    // Measure every point BEFORE the drag: once it starts, sortable displacement transforms
    // move the other items' boxes, but dnd-kit collides against the rects measured at start.
    const viaRaw: Array<{ x: number; y: number }> = [];
    for (const via of viaPoints) viaRaw.push(await pointFor(via, 'center'));
    const raw = await pointFor(target, zone);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 2, start.y + 12, { steps: 3 }); // past the 8px activation distance

    const end = raw;
    await page.mouse.move(end.x, end.y, { steps });
    if (holdMs > 0) await page.waitForTimeout(holdMs);
    return { drop: async () => { await page.mouse.up(); } };
}

/** Drags `source` onto the CENTRE of `target`, waits until grouping is armed, and drops. */
export async function dragToGroup(page: Page, source: Locator, target: Locator, armedMatch: string): Promise<void> {
    const session = await beginDrag(page, source, target, { zone: 'center', holdMs: HOLD_MS });
    await expect(page.locator('[data-group-target="armed"]', { hasText: armedMatch })).toBeVisible();
    await session.drop();
}
