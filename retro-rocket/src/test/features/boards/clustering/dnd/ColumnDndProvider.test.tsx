import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ColumnDndProvider } from '@/features/boards/clustering/dnd/ColumnDndProvider';
import {
    ColumnGroupingContext,
    useColumnGroupingContext,
} from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { buildColumnItems } from '@/features/boards/clustering/dnd/columnOrder';
import { DWELL_MS } from '@/features/boards/clustering/dnd/dragIntent';
import type { Card } from '@/features/boards/types/card';

/**
 * T036 provider-level tests (spec 059-drag-to-group-cards, US1: B1-B5).
 *
 * jsdom cannot run dnd-kit's pointer sensor, so `DndContext` is replaced by a pass-through
 * that CAPTURES its callbacks (onDragStart/Move/Over/End/Cancel); the tests feed them
 * hand-built events with fake timers (Date is faked too, so the dwell timer is deterministic).
 *
 * CONTRACTS FIXED BY THIS FILE:
 *  - ColumnDndProvider wraps its children in a NESTED `ColumnGroupingContext.Provider` whose
 *    value is the outer (GroupableColumn) value overridden with the live drag state:
 *       armedTargetId : `card:<id>`/`group:<id>` of the current `group` intent target, else null
 *       insertionLine : { itemId, edge } for the `reorder` intent (not for item-less 'column'
 *                       reorder... it may be set, tests only assert the item case), else null
 *       busyTargetId  : dnd id of the group target while its `requestMove` is pending, else null
 *    Consumers (SortableCard, GroupCard) therefore read feedback from `useOptionalColumnGroupingContext()`.
 *  - aria-busy on the target is a render of `busyTargetId` (asserted in SortableCard.test.tsx);
 *    here we assert the provider sets/clears `busyTargetId` around the pending request.
 */

const dnd = vi.hoisted(() => ({ props: { current: null as any } }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@dnd-kit/core')>();
    return {
        ...actual,
        DndContext: (props: any) => {
            dnd.props.current = props;
            return <>{props.children}</>;
        },
        DragOverlay: () => <div data-testid="drag-overlay" />,
    };
});

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/boards/retrospective/components/DraggableCard', () => ({
    default: ({ card }: any) => <div>{card.content}</div>,
}));

const COLUMN = 'col1';
const t0 = new Date('2026-01-01T00:00:00.000Z');
const mk = (id: string, order: number): Card => ({
    id, content: `content-${id}`, column: COLUMN, createdBy: 'u1',
    createdAt: t0, updatedAt: t0, retrospectiveId: 'r1', order,
});
const cards = [mk('A', 10), mk('B', 20), mk('C', 30)];

const Probe: React.FC = () => {
    const ctx = useColumnGroupingContext() as any;
    return (
        <div
            data-testid="probe"
            data-armed={ctx.armedTargetId ?? ''}
            data-busy={ctx.busyTargetId ?? ''}
            data-line={ctx.insertionLine ? `${ctx.insertionLine.itemId}:${ctx.insertionLine.edge}` : ''}
        />
    );
};

// B occupies y 100..200. Dragged card is 60px tall.
const OVER_RECT = { top: 100, left: 0, width: 300, height: 100 };
const dragEvent = (draggedTop: number, overId: string | null = 'card:B') => ({
    active: {
        id: 'card:A',
        data: { current: { type: 'card', sortable: { containerId: 'column-items:col1', index: 0, items: ['card:A', 'card:B', 'card:C'] } } },
        rect: { current: { initial: null, translated: { top: draggedTop, left: 0, width: 300, height: 60 } } },
    },
    over: overId
        ? { id: overId, rect: OVER_RECT, disabled: false, data: { current: { type: 'card', sortable: { containerId: 'column-items:col1', index: 1, items: ['card:A', 'card:B', 'card:C'] } } } }
        : null,
    activatorEvent: new Event('pointerdown'),
    collisions: null, delta: { x: 0, y: 0 },
});
const MIDDLE = 120; // dragged centre y=150 -> middle of B (offset 50 of 100)
const TOP_EDGE = 80; // dragged centre y=110 -> offset 10 < 25 -> before band

function setup() {
    const items = buildColumnItems(cards, [], COLUMN);
    let resolveMove!: () => void;
    const requestMove = vi.fn(
        () => new Promise<void>((resolve) => { resolveMove = resolve; }),
    );
    const outer = {
        columnId: COLUMN, groupingEnabled: true, items, groups: [], ungroupedCards: cards,
        armedTargetId: null, insertionLine: null, busyTargetId: null,
        pendingEditGroupId: null, consumePendingEdit: vi.fn(),
        requestMove, computeOrder: vi.fn(() => 25),
    };
    render(
        <ColumnGroupingContext.Provider value={outer as never}>
            <ColumnDndProvider>
                <Probe />
            </ColumnDndProvider>
        </ColumnGroupingContext.Provider>,
    );
    return { requestMove, outer, resolveMove: () => resolveMove() };
}

const armed = () => screen.getByTestId('probe').getAttribute('data-armed');
const busy = () => screen.getByTestId('probe').getAttribute('data-busy');
const line = () => screen.getByTestId('probe').getAttribute('data-line');
const call = (name: string, event: unknown) => act(() => { dnd.props.current[name](event); });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('ColumnDndProvider drop-to-group (spec 059, T036)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        dnd.props.current = null;
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('B2: dwelling in the middle of card:B for less than 180 ms arms nothing and draws no line', () => {
        setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragOver', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));

        advance(DWELL_MS - 1);

        expect(armed()).toBe('');
        expect(line()).toBe('');
    });

    it('B3: after 180 ms in the middle of card:B (pointer stopped moving), armedTargetId becomes "card:B"', () => {
        setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS - 1);
        expect(armed()).toBe('');

        advance(1);

        expect(armed()).toBe('card:B');
        expect(line()).toBe('');
    });

    it('B4: moving to the edge of B after arming clears armedTargetId (and B1 shows the insertion line)', () => {
        setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS);
        expect(armed()).toBe('card:B');

        call('onDragMove', dragEvent(TOP_EDGE));

        expect(armed()).toBe('');
        expect(line()).toBe('card:B:before');
    });

    it('B4: leaving B for another target before 180 ms restarts the dwell (no stale arming on B)', () => {
        setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(100);
        call('onDragMove', dragEvent(TOP_EDGE));
        advance(DWELL_MS * 2);

        expect(armed()).toBe('');
    });

    it('B1: in the edge band the intent is reorder: insertion line, never armed', () => {
        setup();
        call('onDragStart', dragEvent(TOP_EDGE));
        call('onDragMove', dragEvent(TOP_EDGE));
        advance(DWELL_MS * 2);

        expect(armed()).toBe('');
        expect(line()).toBe('card:B:before');
    });

    it('B5: releasing on the armed target calls requestMove("A", { kind: "card", cardId: "B" })', () => {
        const { requestMove } = setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS);

        call('onDragEnd', dragEvent(MIDDLE));

        expect(requestMove).toHaveBeenCalledTimes(1);
        expect(requestMove).toHaveBeenCalledWith('A', { kind: 'card', cardId: 'B' });
    });

    it('B5: releasing BEFORE 180 ms never requests a grouping move (reorder fallback or no-op only)', () => {
        const { requestMove } = setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS - 1);

        call('onDragEnd', dragEvent(MIDDLE));

        expect(requestMove).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'card' }));
        expect(requestMove).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'group' }));
    });

    it('B5: the armed feedback is cleared on release', () => {
        setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS);
        expect(armed()).toBe('card:B');

        call('onDragEnd', dragEvent(MIDDLE));

        expect(armed()).toBe('');
    });

    it('B5: busyTargetId is "card:B" while the request is pending and cleared once it settles', async () => {
        const { resolveMove } = setup();
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS);

        call('onDragEnd', dragEvent(MIDDLE));
        expect(busy()).toBe('card:B');

        await act(async () => { resolveMove(); });
        expect(busy()).toBe('');
    });

    it('B5: busyTargetId is also cleared when the request rejects (conflict)', async () => {
        const items = buildColumnItems(cards, [], COLUMN);
        let rejectMove!: (e: Error) => void;
        const requestMove = vi.fn(() => new Promise<void>((_, reject) => { rejectMove = reject; }));
        const outer = {
            columnId: COLUMN, groupingEnabled: true, items, groups: [], ungroupedCards: cards,
            armedTargetId: null, insertionLine: null, busyTargetId: null, pendingEditGroupId: null,
            consumePendingEdit: vi.fn(), requestMove, computeOrder: vi.fn(() => 25),
        };
        vi.spyOn(console, 'error').mockImplementation(() => { });
        render(
            <ColumnGroupingContext.Provider value={outer as never}>
                <ColumnDndProvider><Probe /></ColumnDndProvider>
            </ColumnGroupingContext.Provider>,
        );
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS);
        call('onDragEnd', dragEvent(MIDDLE));
        expect(busy()).toBe('card:B');

        await act(async () => { rejectMove(new Error('conflict')); });

        expect(busy()).toBe('');
    });

    it('grouping disabled (mode user): never arms, even after a long dwell', () => {
        const items = buildColumnItems(cards, [], COLUMN);
        const requestMove = vi.fn(async () => { });
        const outer = {
            columnId: COLUMN, groupingEnabled: false, items, groups: [], ungroupedCards: cards,
            armedTargetId: null, insertionLine: null, busyTargetId: null, pendingEditGroupId: null,
            consumePendingEdit: vi.fn(), requestMove, computeOrder: vi.fn(() => 25),
        };
        render(
            <ColumnGroupingContext.Provider value={outer as never}>
                <ColumnDndProvider><Probe /></ColumnDndProvider>
            </ColumnGroupingContext.Provider>,
        );
        call('onDragStart', dragEvent(MIDDLE));
        call('onDragMove', dragEvent(MIDDLE));
        advance(DWELL_MS * 3);

        expect(armed()).toBe('');
        call('onDragEnd', dragEvent(MIDDLE));
        expect(requestMove).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'card' }));
    });
});

/**
 * T044 + provider half of T045 (spec 059-drag-to-group-cards, US4: B6, B7, B8).
 *
 * CONTRACTS FIXED BY THESE TESTS:
 *  - B6: while a drag is active and `over` is null (pointer outside the column) the provider sets
 *    `document.body.style.cursor = 'not-allowed'` (from onDragOver and/or onDragMove). It restores the
 *    previous value ('' here) on onDragEnd and on onDragCancel, and never leaves it set.
 *    Entering the column again (over != null) restores it as well.
 *  - While outside: `armedTargetId` is null and `insertionLine` is null (even if a target was armed
 *    or a line was shown a moment before).
 *  - B7: releasing while outside makes ZERO `requestMove` calls. (The provider has no direct
 *    `onCardMove`/`onCardsReorder` access; `requestMove` is the single write path, research §12,
 *    so zero requestMove calls == zero network calls.)
 *  - B8 (provider level): with `groupingEnabled === false` in the outer context, a centre dwell never
 *    arms, never makes a `{kind:'card'|'group'}` request, however long it lasts or where it is released.
 */
describe('ColumnDndProvider outside / not-allowed / grouping disabled (spec 059, T044 + T045)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        dnd.props.current = null;
        document.body.style.cursor = '';
    });
    afterEach(() => {
        vi.useRealTimers();
        document.body.style.cursor = '';
    });

    const goOutside = () => {
        call('onDragOver', dragEvent(MIDDLE, null));
        call('onDragMove', dragEvent(MIDDLE, null));
    };

    describe('B6: outside the column', () => {
        it('sets cursor "not-allowed" when over becomes null during a drag', () => {
            setup();
            call('onDragStart', dragEvent(MIDDLE));
            call('onDragOver', dragEvent(MIDDLE));
            expect(document.body.style.cursor).not.toBe('not-allowed');

            goOutside();

            expect(document.body.style.cursor).toBe('not-allowed');
        });

        it('restores the cursor on drag end', () => {
            setup();
            call('onDragStart', dragEvent(MIDDLE));
            goOutside();
            expect(document.body.style.cursor).toBe('not-allowed');

            call('onDragEnd', dragEvent(MIDDLE, null));

            expect(document.body.style.cursor).toBe('');
        });

        it('restores the cursor on drag cancel', () => {
            setup();
            call('onDragStart', dragEvent(MIDDLE));
            goOutside();
            expect(document.body.style.cursor).toBe('not-allowed');

            call('onDragCancel', dragEvent(MIDDLE, null));

            expect(document.body.style.cursor).toBe('');
        });

        it('restores the cursor when the pointer comes back over an item', () => {
            setup();
            call('onDragStart', dragEvent(MIDDLE));
            goOutside();

            call('onDragOver', dragEvent(MIDDLE));
            call('onDragMove', dragEvent(MIDDLE));

            expect(document.body.style.cursor).not.toBe('not-allowed');
        });

        it('shows no armed target and no insertion line while outside, even after a dwell', () => {
            setup();
            call('onDragStart', dragEvent(MIDDLE));
            goOutside();
            advance(DWELL_MS * 3);

            expect(armed()).toBe('');
            expect(line()).toBe('');
        });

        it('clears an already armed target when the pointer leaves the column', () => {
            setup();
            call('onDragStart', dragEvent(MIDDLE));
            call('onDragMove', dragEvent(MIDDLE));
            advance(DWELL_MS);
            expect(armed()).toBe('card:B');

            goOutside();

            expect(armed()).toBe('');
            expect(line()).toBe('');
        });

        it('clears an insertion line when the pointer leaves the column', () => {
            setup();
            call('onDragStart', dragEvent(TOP_EDGE));
            call('onDragMove', dragEvent(TOP_EDGE));
            expect(line()).toBe('card:B:before');

            goOutside();

            expect(line()).toBe('');
        });

        it('does not arm after the dwell elapses if the pointer left before it did (timer is cancelled)', () => {
            setup();
            call('onDragStart', dragEvent(MIDDLE));
            call('onDragMove', dragEvent(MIDDLE));
            advance(DWELL_MS - 10);
            goOutside();
            advance(DWELL_MS * 2);

            expect(armed()).toBe('');
        });
    });

    describe('B7: releasing outside', () => {
        it('makes zero requestMove calls after a plain drag', () => {
            const { requestMove } = setup();
            call('onDragStart', dragEvent(MIDDLE));
            goOutside();

            call('onDragEnd', dragEvent(MIDDLE, null));

            expect(requestMove).not.toHaveBeenCalled();
        });

        it('makes zero requestMove calls when the pointer had armed a group target before leaving', () => {
            const { requestMove } = setup();
            call('onDragStart', dragEvent(MIDDLE));
            call('onDragMove', dragEvent(MIDDLE));
            advance(DWELL_MS);
            expect(armed()).toBe('card:B');
            goOutside();

            call('onDragEnd', dragEvent(MIDDLE, null));

            expect(requestMove).not.toHaveBeenCalled();
        });

        it('makes zero requestMove calls when the pointer had a reorder line before leaving', () => {
            const { requestMove } = setup();
            call('onDragStart', dragEvent(TOP_EDGE));
            call('onDragMove', dragEvent(TOP_EDGE));
            expect(line()).toBe('card:B:before');
            goOutside();

            call('onDragEnd', dragEvent(TOP_EDGE, null));

            expect(requestMove).not.toHaveBeenCalled();
        });

        it('makes zero requestMove calls on cancel, and leaves no busy target', () => {
            const { requestMove } = setup();
            call('onDragStart', dragEvent(MIDDLE));
            goOutside();

            call('onDragCancel', dragEvent(MIDDLE, null));

            expect(requestMove).not.toHaveBeenCalled();
            expect(busy()).toBe('');
        });
    });

    describe('B8: grouping disabled in the outer context (mode user)', () => {
        const setupDisabled = () => {
            const items = buildColumnItems(cards, [], COLUMN);
            const requestMove = vi.fn(async () => { });
            const outer = {
                columnId: COLUMN, groupingEnabled: false, items, groups: [], ungroupedCards: cards,
                armedTargetId: null, insertionLine: null, busyTargetId: null, pendingEditGroupId: null,
                consumePendingEdit: vi.fn(), requestMove, computeOrder: vi.fn(() => 25),
            };
            render(
                <ColumnGroupingContext.Provider value={outer as never}>
                    <ColumnDndProvider><Probe /></ColumnDndProvider>
                </ColumnGroupingContext.Provider>,
            );
            return { requestMove };
        };

        it('a centre dwell never arms, however long, and shows no armed feedback while moving around', () => {
            setupDisabled();
            call('onDragStart', dragEvent(MIDDLE));
            call('onDragOver', dragEvent(MIDDLE));
            call('onDragMove', dragEvent(MIDDLE));
            advance(DWELL_MS * 5);
            expect(armed()).toBe('');

            call('onDragMove', dragEvent(TOP_EDGE));
            call('onDragMove', dragEvent(MIDDLE));
            advance(DWELL_MS * 5);
            expect(armed()).toBe('');
        });

        it('releasing after a long centre dwell never issues a card/group move', () => {
            const { requestMove } = setupDisabled();
            call('onDragStart', dragEvent(MIDDLE));
            call('onDragMove', dragEvent(MIDDLE));
            advance(DWELL_MS * 5);

            call('onDragEnd', dragEvent(MIDDLE));

            for (const [, target] of requestMove.mock.calls as unknown as Array<[string, { kind: string }]>) {
                expect(['card', 'group']).not.toContain(target.kind);
            }
        });
    });
});

// ===========================================================================================
// T058 + T062 (provider half) + T067 — spec 059-drag-to-group-cards (US5 keyboard, US3 group
// targets, US6 grouped sources). RED phase.
//
// Shared fixtures for the blocks below. Column display order (buildColumnItems):
//   card:A(10)  card:B(20)  group:g1(25: gh,gm)  card:C(30)  group:g2(40: xh,xm)
// ungrouped = A, B, C. Rects are per-event (the harness hands each event its own `over.rect`).
//
// CONTRACTS FIXED BY THESE BLOCKS:
//  - Keyboard drag detection: `event.activatorEvent instanceof KeyboardEvent` at drag start.
//  - K3: while a KEYBOARD drag is active the provider listens to `keydown` on `document`
//    (the listener is added at drag start, removed on drag end, cancel and unmount; a pointer
//    drag never adds one). `g`/`G` toggles the intent through `toggleKeyboardIntent`. It
//    announces through the provider's polite live region (`column-drag-live-region`):
//       toggled to group on a card  -> retrospective.dragGroup.a11y.overTargetGroup
//       toggled to group on a group -> retrospective.dragGroup.a11y.overGroupGroup
//       toggled back to reorder     -> retrospective.dragGroup.a11y.overTargetReorder
//  - The nested ColumnGroupingContext exposes `announce(message)`, which writes `message` to
//    that same live region (this is what CardGroupingMenu uses, see CardGroupingMenu.test.tsx).
//  - Announcement composition convention: the primary outcome message, and when the move's
//    `dissolvedGroupIds` is non-empty `groupDissolved` APPENDED to the same string, separated
//    by a space (one live-region update, so the second message cannot overwrite the first).
//  - Member sources (T067): dnd id `member:<cardId>`, `active.data.current = { type: 'member',
//    groupId }` and NO `sortable` data. The provider resolves them with the raw card id
//    (`member:` prefix stripped) through the same `requestMove` path:
//       edge of an item        -> { kind: 'position', order: computeOrder(placement WITHOUT the
//                                  dragged card, which is not in `items`) }
//       armed card / group     -> { kind: 'card' } / { kind: 'group' }
//       own group              -> intent `none`, no call
//       column catch-all       -> { kind: 'position', order: computeOrder({ beforeId: <last
//                                  item id>, afterId: undefined }) }
//       outside                -> no call
//    Result messages: position -> removedFromGroup; card -> groupCreated (createdGroupId);
//    group -> addedToGroup; plus groupDissolved when dissolvedGroupIds is non-empty.
//  - NO SORTABLE DISPLACEMENT FOR MEMBER SOURCES: mechanism = `intentAwareSortingStrategy`
//    returns null whenever `activeIndex === -1` (the dragged id is not one of the
//    SortableContext items, which is true for every `member:*` source). Asserted in
//    intentAwareSortingStrategy.test.ts. No flag or ref is added to the provider; here we only
//    assert that the insertion line (not displacement) is the sole feedback.
//  - Known gap: DragOverlay is replaced by `() => null` in this file, so the member card
//    shown inside the overlay is not asserted here.
// ===========================================================================================
const mkc = (id: string, order: number, extra: Partial<Card> = {}): Card => ({
    id, content: `content-${id}`, column: COLUMN, createdBy: 'u1',
    createdAt: t0, updatedAt: t0, retrospectiveId: 'r1', order, ...extra,
});
const mkg = (id: string, order: number, headCardId: string, memberCardIds: string[]) => ({
    id, retrospectiveId: 'r1', column: COLUMN, title: id, headCardId, memberCardIds, isCollapsed: false,
    createdAt: t0, createdBy: 'u1', order,
});
const GCARDS: Card[] = [
    mkc('A', 10), mkc('B', 20), mkc('C', 30),
    mkc('gh', 0, { groupId: 'g1', isGroupHead: true }), mkc('gm', 0, { groupId: 'g1', groupOrder: 1 }),
    mkc('xh', 0, { groupId: 'g2', isGroupHead: true }), mkc('xm', 0, { groupId: 'g2', groupOrder: 1 }),
];
const GGROUPS = [mkg('g1', 25, 'gh', ['gm']), mkg('g2', 40, 'xh', ['xm'])];
const ITEM_IDS = ['card:A', 'card:B', 'group:g1', 'card:C', 'group:g2'];
const A11Y = 'retrospective.dragGroup.a11y.';

interface GEventOptions {
    source?: 'card' | 'member';
    overId?: string | null;
    overRect?: { top: number; left: number; width: number; height: number };
    draggedTop: number;
    keyboard?: boolean;
}
const SORTABLE = { containerId: 'column-items:col1', items: ITEM_IDS };
function gEvent({ source = 'card', overId = 'card:B', overRect = OVER_RECT, draggedTop, keyboard = false }: GEventOptions) {
    const overType = overId?.startsWith('group:') ? 'group' : overId?.startsWith('column:') ? 'column' : 'card';
    return {
        active: {
            id: source === 'card' ? 'card:A' : 'member:gm',
            data: {
                current: source === 'card'
                    ? { type: 'card', sortable: { ...SORTABLE, index: 0 } }
                    : { type: 'member', groupId: 'g1' },
            },
            rect: { current: { initial: null, translated: { top: draggedTop, left: 0, width: 300, height: 60 } } },
        },
        over: overId
            ? {
                id: overId, rect: overRect, disabled: false,
                data: { current: overType === 'column' ? { type: 'column' } : { type: overType, sortable: { ...SORTABLE, index: Math.max(0, ITEM_IDS.indexOf(overId)) } } },
            }
            : null,
        activatorEvent: keyboard ? new KeyboardEvent('keydown', { code: 'Space', key: ' ' }) : new Event('pointerdown'),
        collisions: null, delta: { x: 0, y: 0 },
    };
}

// Captures the nested context so tests can call announce().
const nestedCtx = { current: null as any };
const CtxProbe: React.FC = () => {
    nestedCtx.current = useColumnGroupingContext();
    return <Probe />;
};

function setupG(opts: { groupingEnabled?: boolean; result?: any } = {}) {
    const items = buildColumnItems(GCARDS, GGROUPS as never, COLUMN);
    const requestMove = vi.fn(async () => opts.result ?? ({ dissolvedGroupIds: [] }));
    const computeOrder = vi.fn(() => 25);
    const outer = {
        columnId: COLUMN, groupingEnabled: opts.groupingEnabled ?? true, items, groups: GGROUPS,
        ungroupedCards: GCARDS.filter((c) => !c.groupId),
        armedTargetId: null, insertionLine: null, busyTargetId: null,
        pendingEditGroupId: null, consumePendingEdit: vi.fn(), requestMove, computeOrder,
    };
    render(
        <ColumnGroupingContext.Provider value={outer as never}>
            <ColumnDndProvider><CtxProbe /></ColumnDndProvider>
        </ColumnGroupingContext.Provider>,
    );
    return { requestMove, computeOrder };
}
const liveText = () => screen.getByTestId('column-drag-live-region').textContent ?? '';
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const pressKey = (key: string) => act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, bubbles: true })); });

// Group g1 is 200px tall, at y 200..400. Member/dragged rect is 60px tall: centre = top + 30.
const G1_RECT = { top: 200, left: 0, width: 300, height: 200 };
const G2_RECT = { top: 500, left: 0, width: 300, height: 200 };
const COLUMN_RECT = { top: 0, left: 0, width: 300, height: 1000 };

describe('ColumnDndProvider keyboard drag: reorder by default, G toggles grouping (spec 059, T058: K1-K5)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        dnd.props.current = null;
        nestedCtx.current = null;
    });
    afterEach(() => {
        vi.useRealTimers();
        // NOT vi.restoreAllMocks(): it would also reset the global matchMedia mock from setup.ts.
        for (const spy of docSpies.splice(0)) spy.mockRestore();
    });

    const docSpies: Array<{ mockRestore: () => void }> = [];
    const spyDoc = (method: 'addEventListener' | 'removeEventListener') => {
        const spy = vi.spyOn(document, method);
        docSpies.push(spy);
        return spy;
    };
    const keydownCalls = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.filter((c) => c[0] === 'keydown');

    describe('K1: the keyboard drag starts in reorder and announces pick-up', () => {
        it('announces pickedUp when the drag starts', () => {
            setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));

            const message = dnd.props.current.accessibility.announcements.onDragStart({ active: { id: 'card:A' } });

            expect(message).toBe(`${A11Y}pickedUp`);
        });

        it('hands dnd-kit screen-reader instructions that mention the keyboard flow', () => {
            setupG();

            expect(dnd.props.current.accessibility.screenReaderInstructions.draggable).toBe(`${A11Y}instructions`);
        });

        it('over a card the keyboard intent is reorder: insertion line, never armed, however long it stays', () => {
            setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragMove', gEvent({ draggedTop: 120, keyboard: true }));
            advance(DWELL_MS * 5);

            expect(armed()).toBe('');
            expect(line()).toMatch(/^card:B:(before|after)$/);
        });
    });

    describe('K3: pressing G toggles reorder <-> group over a card or a group target', () => {
        const startOver = (overId: string, overRect = OVER_RECT) => {
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true, overId, overRect }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true, overId, overRect }));
        };

        it('G over a card arms it, clears the insertion line and announces overTargetGroup', () => {
            setupG();
            startOver('card:B');

            pressKey('g');

            expect(armed()).toBe('card:B');
            expect(line()).toBe('');
            expect(liveText()).toBe(`${A11Y}overTargetGroup`);
        });

        it('an uppercase G (Shift / Caps Lock) works the same', () => {
            setupG();
            startOver('card:B');

            pressKey('G');

            expect(armed()).toBe('card:B');
        });

        it('G again toggles back to reorder and announces the position', () => {
            setupG();
            startOver('card:B');
            pressKey('g');

            pressKey('g');

            expect(armed()).toBe('');
            expect(line()).toMatch(/^card:B:(before|after)$/);
            expect(liveText()).toContain(`${A11Y}overTargetReorder`);
        });

        it('G over a group arms the group and announces overGroupGroup', () => {
            setupG();
            startOver('group:g1', G1_RECT);

            pressKey('g');

            expect(armed()).toBe('group:g1');
            expect(liveText()).toBe(`${A11Y}overGroupGroup`);
        });

        it('moving to another item with the arrow keys drops the group intent (back to reorder)', () => {
            setupG();
            startOver('card:B');
            pressKey('g');
            expect(armed()).toBe('card:B');

            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true, overId: 'card:C', overRect: { ...OVER_RECT, top: 300 } }));

            expect(armed()).toBe('');
        });

        it('G does nothing when grouping is disabled (mode user)', () => {
            setupG({ groupingEnabled: false });
            startOver('card:B');

            pressKey('g');

            expect(armed()).toBe('');
            expect(liveText()).toBe('');
        });

        it('G does nothing while outside the column', () => {
            setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true, overId: null }));

            pressKey('g');

            expect(armed()).toBe('');
        });

        it('G does nothing over its own group (grouped source)', () => {
            setupG();
            call('onDragStart', gEvent({ source: 'member', draggedTop: 270, keyboard: true, overId: 'group:g1', overRect: G1_RECT }));
            call('onDragOver', gEvent({ source: 'member', draggedTop: 270, keyboard: true, overId: 'group:g1', overRect: G1_RECT }));

            pressKey('g');

            expect(armed()).toBe('');
        });

        it('other keys do nothing', () => {
            setupG();
            startOver('card:B');

            pressKey('h');

            expect(armed()).toBe('');
        });

        it('a POINTER drag ignores G entirely', () => {
            setupG();
            call('onDragStart', gEvent({ draggedTop: 120 }));
            call('onDragOver', gEvent({ draggedTop: 120 }));

            pressKey('g');

            expect(armed()).toBe('');
            expect(liveText()).toBe('');
        });
    });

    describe('K3 listener lifecycle: only alive during a keyboard drag', () => {
        it('adds a document keydown listener when a keyboard drag starts, and removes that same listener on drag end', () => {
            const add = spyDoc('addEventListener');
            const remove = spyDoc('removeEventListener');
            setupG();
            const before = keydownCalls(add).length;

            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            const added = keydownCalls(add).slice(before);
            expect(added).toHaveLength(1);
            const handler = added[0][1];
            expect(keydownCalls(remove).some((c) => c[1] === handler)).toBe(false);

            call('onDragEnd', gEvent({ draggedTop: 120, keyboard: true }));

            expect(keydownCalls(remove).some((c) => c[1] === handler)).toBe(true);
        });

        it('removes it on drag cancel too (Escape)', () => {
            const add = spyDoc('addEventListener');
            const remove = spyDoc('removeEventListener');
            setupG();
            const before = keydownCalls(add).length;
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            const handler = keydownCalls(add).slice(before)[0][1];

            call('onDragCancel', gEvent({ draggedTop: 120, keyboard: true }));

            expect(keydownCalls(remove).some((c) => c[1] === handler)).toBe(true);
        });

        it('removes it when the provider unmounts mid-drag', () => {
            const add = spyDoc('addEventListener');
            const remove = spyDoc('removeEventListener');
            const items = buildColumnItems(GCARDS, GGROUPS as never, COLUMN);
            const outer = {
                columnId: COLUMN, groupingEnabled: true, items, groups: GGROUPS, ungroupedCards: GCARDS.filter((c) => !c.groupId),
                armedTargetId: null, insertionLine: null, busyTargetId: null, pendingEditGroupId: null,
                consumePendingEdit: vi.fn(), requestMove: vi.fn(), computeOrder: vi.fn(() => 25),
            };
            const view = render(
                <ColumnGroupingContext.Provider value={outer as never}>
                    <ColumnDndProvider><Probe /></ColumnDndProvider>
                </ColumnGroupingContext.Provider>,
            );
            const before = keydownCalls(add).length;
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            const handler = keydownCalls(add).slice(before)[0][1];

            view.unmount();

            expect(keydownCalls(remove).some((c) => c[1] === handler)).toBe(true);
        });

        it('never adds a keydown listener for a pointer drag', () => {
            const add = spyDoc('addEventListener');
            setupG();
            const before = keydownCalls(add).length;

            call('onDragStart', gEvent({ draggedTop: 120 }));

            expect(keydownCalls(add).length).toBe(before);
        });

        it('G pressed after the drag ended has no effect', () => {
            setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragEnd', gEvent({ draggedTop: 120, keyboard: true }));
            const textAfterEnd = liveText();

            pressKey('g');

            expect(armed()).toBe('');
            expect(liveText()).toBe(textAfterEnd);
        });
    });

    describe('K4: Space/Enter drops with the current intent', () => {
        it('after G over a card, the drop requests { kind: "card" }', () => {
            const { requestMove } = setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true }));
            pressKey('g');

            call('onDragEnd', gEvent({ draggedTop: 120, keyboard: true }));

            expect(requestMove).toHaveBeenCalledTimes(1);
            expect(requestMove).toHaveBeenCalledWith('A', { kind: 'card', cardId: 'B' });
        });

        it('after G over a group, the drop requests { kind: "group" }', () => {
            const { requestMove } = setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true, overId: 'group:g1', overRect: G1_RECT }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true, overId: 'group:g1', overRect: G1_RECT }));
            pressKey('g');

            call('onDragEnd', gEvent({ draggedTop: 120, keyboard: true, overId: 'group:g1', overRect: G1_RECT }));

            expect(requestMove).toHaveBeenCalledWith('A', { kind: 'group', groupId: 'g1' });
        });

        it('without G the drop is a reorder: { kind: "position", order } from computeOrder', () => {
            const { requestMove, computeOrder } = setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true }));

            call('onDragEnd', gEvent({ draggedTop: 120, keyboard: true }));

            // A moves down over B: it lands right after B (before group:g1).
            expect(computeOrder).toHaveBeenCalledWith({ beforeId: 'card:B', afterId: 'group:g1' });
            expect(requestMove).toHaveBeenCalledWith('A', { kind: 'position', order: 25 });
        });

        it('G pressed twice (back to reorder) drops as a reorder, never as a group', () => {
            const { requestMove } = setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true }));
            pressKey('g');
            pressKey('g');

            call('onDragEnd', gEvent({ draggedTop: 120, keyboard: true }));

            expect(requestMove).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'card' }));
            expect(requestMove).toHaveBeenCalledWith('A', expect.objectContaining({ kind: 'position' }));
        });
    });

    describe('K5: Escape cancels and announces', () => {
        it('announces "cancelled" on drag cancel', () => {
            setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));

            const message = dnd.props.current.accessibility.announcements.onDragCancel({ active: { id: 'card:A' }, over: null });

            expect(message).toBe(`${A11Y}cancelled`);
        });

        it('makes no request and clears an armed target on cancel', () => {
            const { requestMove } = setupG();
            call('onDragStart', gEvent({ draggedTop: 120, keyboard: true }));
            call('onDragOver', gEvent({ draggedTop: 120, keyboard: true }));
            pressKey('g');
            expect(armed()).toBe('card:B');

            call('onDragCancel', gEvent({ draggedTop: 120, keyboard: true }));

            expect(requestMove).not.toHaveBeenCalled();
            expect(armed()).toBe('');
            expect(line()).toBe('');
        });
    });
});

describe('ColumnDndProvider live-region channel for the menus (spec 059, T056/T068 contract)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        dnd.props.current = null;
        nestedCtx.current = null;
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('exposes announce(message) on the nested context, and it writes to the polite live region', () => {
        setupG();

        expect(typeof nestedCtx.current.announce).toBe('function');
        act(() => nestedCtx.current.announce('Card removed from the group.'));

        expect(liveText()).toBe('Card removed from the group.');
        expect(screen.getByTestId('column-drag-live-region')).toHaveAttribute('aria-live', 'polite');
    });
});

describe('ColumnDndProvider group targets (spec 059, T062: B5b)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        dnd.props.current = null;
        nestedCtx.current = null;
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    // Dragged centre = draggedTop + 30. Group g1 spans y 200..400 (height 200), so its edge band
    // is min(25% = 50px, 16px) = 16px.
    const over = (draggedTop: number, name: 'onDragStart' | 'onDragMove' | 'onDragOver' = 'onDragMove') =>
        call(name, gEvent({ draggedTop, overId: 'group:g1', overRect: G1_RECT }));
    const dwellOn = (draggedTop: number) => {
        over(draggedTop, 'onDragStart');
        over(draggedTop, 'onDragOver');
        over(draggedTop);
        advance(DWELL_MS);
    };

    it('B5b: dwelling in the middle of a group arms group:<id>', () => {
        setupG();
        dwellOn(270); // centre 300 -> offset 100

        expect(armed()).toBe('group:g1');
    });

    it('B5b: releasing on the armed group requests { kind: "group", groupId }', () => {
        const { requestMove } = setupG();
        dwellOn(270);

        call('onDragEnd', gEvent({ draggedTop: 270, overId: 'group:g1', overRect: G1_RECT }));

        expect(requestMove).toHaveBeenCalledTimes(1);
        expect(requestMove).toHaveBeenCalledWith('A', { kind: 'group', groupId: 'g1' });
    });

    it('B5b: the group is busy while pending and the outcome is announced as "added to group"', async () => {
        const { requestMove } = setupG();
        let resolve!: (v: unknown) => void;
        requestMove.mockImplementationOnce(() => new Promise((r) => { resolve = r; }) as never);
        dwellOn(270);

        call('onDragEnd', gEvent({ draggedTop: 270, overId: 'group:g1', overRect: G1_RECT }));
        expect(busy()).toBe('group:g1');

        await act(async () => { resolve({ dissolvedGroupIds: [] }); });
        expect(busy()).toBe('');
        expect(liveText()).toContain(`${A11Y}addedToGroup`);
    });

    it('B5b: a release before the dwell never groups', () => {
        const { requestMove } = setupG();
        over(270, 'onDragStart');
        over(270);
        advance(DWELL_MS - 1);

        call('onDragEnd', gEvent({ draggedTop: 270, overId: 'group:g1', overRect: G1_RECT }));

        expect(requestMove).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'group' }));
    });

    it('the header area (16px..) resolves to the group zone, NOT the edge: centre at offset 30 of a 200px group arms it', () => {
        setupG();
        // Under the generic 25% rule offset 30 (< 50) would be the "before" edge band.
        dwellOn(200);

        expect(armed()).toBe('group:g1');
        expect(line()).toBe('');
    });

    it('the top 16px resolve to reorder: insertion line before the group, never armed', () => {
        setupG();
        over(176, 'onDragStart'); // centre 206 -> offset 6
        over(176, 'onDragOver');
        over(176);
        advance(DWELL_MS * 3);

        expect(armed()).toBe('');
        expect(line()).toBe('group:g1:before');
    });

    it('the bottom 16px resolve to reorder: insertion line after the group, never armed', () => {
        setupG();
        over(360, 'onDragStart'); // centre 390 -> offset 190 > 200 - 16
        over(360, 'onDragOver');
        over(360);
        advance(DWELL_MS * 3);

        expect(armed()).toBe('');
        expect(line()).toBe('group:g1:after');
    });

    it('releasing in the top-16px edge reorders ({ kind: "position" }), it does not group', () => {
        const { requestMove } = setupG();
        over(176, 'onDragStart');
        over(176, 'onDragOver');
        over(176);

        call('onDragEnd', gEvent({ draggedTop: 176, overId: 'group:g1', overRect: G1_RECT }));

        expect(requestMove).toHaveBeenCalledWith('A', expect.objectContaining({ kind: 'position' }));
        expect(requestMove).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'group' }));
    });
});

describe('ColumnDndProvider grouped sources: member:<id> (spec 059, T067: D1-D6)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        dnd.props.current = null;
        nestedCtx.current = null;
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    const m = (draggedTop: number, overId: string | null, overRect = OVER_RECT, keyboard = false) =>
        gEvent({ source: 'member', draggedTop, overId, overRect, keyboard });
    const hover = (draggedTop: number, overId: string | null, overRect = OVER_RECT) => {
        call('onDragStart', m(draggedTop, overId, overRect));
        call('onDragOver', m(draggedTop, overId, overRect));
        call('onDragMove', m(draggedTop, overId, overRect));
    };
    const drop = (draggedTop: number, overId: string | null, overRect = OVER_RECT) =>
        call('onDragEnd', m(draggedTop, overId, overRect));

    describe('D1: only an insertion line, no armed feedback while moving over an edge', () => {
        it('shows the insertion line on the edge of an item and arms nothing', () => {
            setupG();
            hover(TOP_EDGE, 'card:B');
            advance(DWELL_MS * 3);

            expect(line()).toBe('card:B:before');
            expect(armed()).toBe('');
        });
    });

    describe('D2: an edge drop ungroups the card at that slot', () => {
        it('top edge of card:B -> { kind: "position", order } between its neighbours (the dragged card is not in items)', () => {
            const { requestMove, computeOrder } = setupG();
            hover(TOP_EDGE, 'card:B');

            drop(TOP_EDGE, 'card:B');

            expect(computeOrder).toHaveBeenCalledWith({ beforeId: 'card:A', afterId: 'card:B' });
            expect(requestMove).toHaveBeenCalledTimes(1);
            expect(requestMove).toHaveBeenCalledWith('gm', { kind: 'position', order: 25 });
        });

        it('bottom edge of card:B -> placement between card:B and the next item (group:g1)', () => {
            const { requestMove, computeOrder } = setupG();
            const BOTTOM_EDGE = 160; // centre 190 -> offset 90 > 75
            hover(BOTTOM_EDGE, 'card:B');
            expect(line()).toBe('card:B:after');

            drop(BOTTOM_EDGE, 'card:B');

            expect(computeOrder).toHaveBeenCalledWith({ beforeId: 'card:B', afterId: 'group:g1' });
            expect(requestMove).toHaveBeenCalledWith('gm', { kind: 'position', order: 25 });
        });

        it('top edge of ANOTHER group places it before that group', () => {
            const { requestMove, computeOrder } = setupG();
            hover(476, 'group:g2', G2_RECT); // centre 506 -> offset 6 of 200

            drop(476, 'group:g2', G2_RECT);

            expect(computeOrder).toHaveBeenCalledWith({ beforeId: 'card:C', afterId: 'group:g2' });
            expect(requestMove).toHaveBeenCalledWith('gm', { kind: 'position', order: 25 });
        });

        it('announces "removed from the group" after the move, and not "dissolved" when nothing dissolved', async () => {
            setupG({ result: { dissolvedGroupIds: [] } });
            hover(TOP_EDGE, 'card:B');

            drop(TOP_EDGE, 'card:B');
            await flush();

            expect(liveText()).toContain(`${A11Y}removedFromGroup`);
            expect(liveText()).not.toContain('groupDissolved');
        });

        it('appends "group dissolved" to the same message when dissolvedGroupIds is non-empty', async () => {
            setupG({ result: { dissolvedGroupIds: ['g1'] } });
            hover(TOP_EDGE, 'card:B');

            drop(TOP_EDGE, 'card:B');
            await flush();

            const text = liveText();
            expect(text).toContain(`${A11Y}removedFromGroup`);
            expect(text).toContain(`${A11Y}groupDissolved`);
            expect(text.indexOf('removedFromGroup')).toBeLessThan(text.indexOf('groupDissolved'));
        });
    });

    describe('D3: an armed card target groups it with that card', () => {
        it('dwelling in the middle of card:B arms it, release requests { kind: "card", cardId: "B" }', () => {
            const { requestMove } = setupG();
            hover(MIDDLE, 'card:B');
            advance(DWELL_MS);
            expect(armed()).toBe('card:B');

            drop(MIDDLE, 'card:B');

            expect(requestMove).toHaveBeenCalledTimes(1);
            expect(requestMove).toHaveBeenCalledWith('gm', { kind: 'card', cardId: 'B' });
        });

        it('announces "group created" when the move created a group', async () => {
            setupG({ result: { createdGroupId: 'gNew', dissolvedGroupIds: [] } });
            hover(MIDDLE, 'card:B');
            advance(DWELL_MS);

            drop(MIDDLE, 'card:B');
            await flush();

            expect(liveText()).toContain(`${A11Y}groupCreated`);
        });

        it('a release before the dwell never groups', () => {
            const { requestMove } = setupG();
            hover(MIDDLE, 'card:B');
            advance(DWELL_MS - 1);

            drop(MIDDLE, 'card:B');

            expect(requestMove).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'card' }));
        });
    });

    describe('D4: an armed OTHER group receives the card', () => {
        it('dwelling in the middle of group:g2 arms it, release requests { kind: "group", groupId: "g2" }', () => {
            const { requestMove } = setupG();
            hover(570, 'group:g2', G2_RECT); // centre 600 -> offset 100
            advance(DWELL_MS);
            expect(armed()).toBe('group:g2');

            drop(570, 'group:g2', G2_RECT);

            expect(requestMove).toHaveBeenCalledTimes(1);
            expect(requestMove).toHaveBeenCalledWith('gm', { kind: 'group', groupId: 'g2' });
        });

        it('announces "added to group" and appends "group dissolved" when the old group dissolved', async () => {
            setupG({ result: { dissolvedGroupIds: ['g1'] } });
            hover(570, 'group:g2', G2_RECT);
            advance(DWELL_MS);

            drop(570, 'group:g2', G2_RECT);
            await flush();

            expect(liveText()).toContain(`${A11Y}addedToGroup`);
            expect(liveText()).toContain(`${A11Y}groupDissolved`);
        });
    });

    describe('D5: over its own group nothing happens', () => {
        it('the intent is none: nothing armed, no insertion line, even after a long dwell', () => {
            setupG();
            hover(270, 'group:g1', G1_RECT);
            advance(DWELL_MS * 5);

            expect(armed()).toBe('');
            expect(line()).toBe('');
        });

        it('releasing on its own group makes no request (also on its edges)', () => {
            const { requestMove } = setupG();
            hover(270, 'group:g1', G1_RECT);
            drop(270, 'group:g1', G1_RECT);
            hover(176, 'group:g1', G1_RECT);
            drop(176, 'group:g1', G1_RECT);

            expect(requestMove).not.toHaveBeenCalled();
        });

        it('announces the "over its own group" message', () => {
            setupG();
            hover(270, 'group:g1', G1_RECT);

            const message = dnd.props.current.accessibility.announcements.onDragOver(m(270, 'group:g1', G1_RECT));

            expect(message).toBe(`${A11Y}ownGroup`);
        });
    });

    describe('D6: the column catch-all', () => {
        it('releasing on the empty space below the items requests a position at the END of the column', () => {
            const { requestMove, computeOrder } = setupG();
            hover(800, 'column:col1', COLUMN_RECT);

            drop(800, 'column:col1', COLUMN_RECT);

            // The dragged member is not in `items`, so the last item is group:g2.
            expect(computeOrder).toHaveBeenCalledWith({ beforeId: 'group:g2', afterId: undefined });
            expect(requestMove).toHaveBeenCalledWith('gm', { kind: 'position', order: 25 });
        });
    });

    describe('outside the column (US4 handling applies unchanged)', () => {
        it('shows not-allowed, arms nothing and a release makes zero requests', () => {
            const { requestMove } = setupG();
            hover(MIDDLE, 'card:B');
            advance(DWELL_MS);
            expect(armed()).toBe('card:B');

            call('onDragOver', m(MIDDLE, null));
            call('onDragMove', m(MIDDLE, null));
            expect(document.body.style.cursor).toBe('not-allowed');
            expect(armed()).toBe('');
            drop(MIDDLE, null);

            expect(requestMove).not.toHaveBeenCalled();
            expect(document.body.style.cursor).toBe('');
        });
    });

    describe('grouping disabled (mode user)', () => {
        it('never arms a target for a member source either', () => {
            setupG({ groupingEnabled: false });
            hover(MIDDLE, 'card:B');
            advance(DWELL_MS * 5);

            expect(armed()).toBe('');
        });
    });

    describe('keyboard drag of a grouped card (research.md §5)', () => {
        it('G over a card then drop requests { kind: "card" } with the raw card id', () => {
            const { requestMove } = setupG();
            call('onDragStart', m(120, 'card:B', OVER_RECT, true));
            call('onDragOver', m(120, 'card:B', OVER_RECT, true));
            pressKey('g');
            expect(armed()).toBe('card:B');

            call('onDragEnd', m(120, 'card:B', OVER_RECT, true));

            expect(requestMove).toHaveBeenCalledWith('gm', { kind: 'card', cardId: 'B' });
        });
    });
});

describe('ColumnDndProvider overlay portal (backdrop-blur containing block fix)', () => {
    it('renders the DragOverlay as a direct child of document.body, outside the column', () => {
        const outer = {
            columnId: COLUMN, groupingEnabled: true, items: buildColumnItems(cards, [], COLUMN), groups: [],
            ungroupedCards: cards, armedTargetId: null, insertionLine: null, busyTargetId: null,
            pendingEditGroupId: null, consumePendingEdit: vi.fn(), requestMove: vi.fn(), computeOrder: vi.fn(() => 25),
        };
        const { container } = render(
            <ColumnGroupingContext.Provider value={outer as never}>
                <ColumnDndProvider className="backdrop-blur">
                    <div data-testid="child" />
                </ColumnDndProvider>
            </ColumnGroupingContext.Provider>,
        );
        const overlay = screen.getByTestId('drag-overlay');
        expect(overlay.parentElement).toBe(document.body);
        expect(container.contains(overlay)).toBe(false);
        expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
    });
});
