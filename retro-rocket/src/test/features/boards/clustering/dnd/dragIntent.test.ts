import { describe, it, expect } from 'vitest';
import {
    ZONE_EDGE,
    GROUP_EDGE_MAX_PX,
    DWELL_MS,
    resolveZone,
    nextIntent,
} from '@/features/boards/clustering/dnd/dragIntent';
import type { DragIntent } from '@/features/boards/clustering/dnd/dragIntent';

/**
 * CONTRACT for the implementer (dragIntent.ts):
 *
 *   type Rect = { top: number; left: number; width: number; height: number };
 *   type OverKind = 'card' | 'group' | 'column';
 *   resolveZone(draggedRect: Rect, overRect: Rect, overKind: OverKind): 'before' | 'center' | 'after'
 *     - uses the dragged rect's vertical centre; ratio = (centerY - over.top) / over.height
 *     - ratio <  edge -> 'before'; ratio > 1 - edge -> 'after'; otherwise 'center' (boundaries are 'center')
 *     - edge = ZONE_EDGE for cards; for groups the band is min(ZONE_EDGE * height, GROUP_EDGE_MAX_PX) px
 *
 *   interface DragIntentInput {
 *     over: { id: string; kind: OverKind; rect: Rect } | null;   // id is the dnd-kit id: 'card:<id>' | 'group:<id>' | column id
 *     draggedRect: Rect;
 *     groupingEnabled: boolean;                                   // false in 'user' mode / no permission
 *     inputMode: 'pointer' | 'keyboard';
 *     sourceGroupId?: string;                                     // set when the dragged card is a group member
 *     toggle?: boolean;                                           // keyboard only: the G key was pressed on this call
 *   }
 *   nextIntent(prev: DragIntent, input: DragIntentInput, now: number): DragIntent   // pure, `now` in ms
 *
 *   DragIntent (from data-model.md): idle | none | reorder{overId, edge} | pendingGroup{target, since} | group{target} | outside
 *   MoveTarget for card/group over ids: 'card:c1' -> { kind:'card', cardId:'c1' }, 'group:g1' -> { kind:'group', groupId:'g1' }
 *   Dwell: pendingGroup -> group once now - since >= DWELL_MS, evaluated on the next nextIntent call
 *   (the hook calls it from a timer and on every move).
 */

type Rect = { top: number; left: number; width: number; height: number };
type Input = Parameters<typeof nextIntent>[1];

const rect = (top: number, height: number): Rect => ({ top, left: 0, width: 200, height });
/** A 20px-tall dragged rect whose vertical centre is at `centerY`. */
const dragged = (centerY: number): Rect => rect(centerY - 10, 20);

// Over items live at top=100. Card height 100 -> edges at 125/175. Group height 400.
const CARD_RECT = rect(100, 100);
const GROUP_RECT = rect(100, 400);

function pointer(overrides: Partial<Input> & { centerY?: number } = {}): Input {
    const { centerY = 150, ...rest } = overrides;
    return {
        over: { id: 'card:c2', kind: 'card', rect: CARD_RECT },
        draggedRect: dragged(centerY),
        groupingEnabled: true,
        inputMode: 'pointer',
        ...rest,
    };
}

const IDLE: DragIntent = { kind: 'idle' };
const T0 = 10_000;

describe('constants', () => {
    it('exposes the tuned values', () => {
        expect(ZONE_EDGE).toBe(0.25);
        expect(GROUP_EDGE_MAX_PX).toBe(16);
        expect(DWELL_MS).toBe(180);
    });
});

describe('resolveZone', () => {
    it('card: top 25% is before, bottom 25% is after, middle is center', () => {
        expect(resolveZone(dragged(110), CARD_RECT, 'card')).toBe('before');
        expect(resolveZone(dragged(150), CARD_RECT, 'card')).toBe('center');
        expect(resolveZone(dragged(190), CARD_RECT, 'card')).toBe('after');
    });

    it('card: the 0.25 / 0.75 boundaries themselves belong to center', () => {
        expect(resolveZone(dragged(124.9), CARD_RECT, 'card')).toBe('before');
        expect(resolveZone(dragged(125), CARD_RECT, 'card')).toBe('center');
        expect(resolveZone(dragged(175), CARD_RECT, 'card')).toBe('center');
        expect(resolveZone(dragged(175.1), CARD_RECT, 'card')).toBe('after');
    });

    it('uses the dragged rect centre, not its top edge', () => {
        // top is inside the "before" band but the centre is in the middle
        expect(resolveZone(rect(110, 80), CARD_RECT, 'card')).toBe('center');
    });

    it('group: the edge band is capped at 16px for a tall group', () => {
        expect(resolveZone(dragged(115), GROUP_RECT, 'group')).toBe('before');
        expect(resolveZone(dragged(117), GROUP_RECT, 'group')).toBe('center');
        expect(resolveZone(dragged(150), GROUP_RECT, 'group')).toBe('center'); // 25% (100px) would have been 'before'
        expect(resolveZone(dragged(100 + 400 - 15), GROUP_RECT, 'group')).toBe('after');
        expect(resolveZone(dragged(100 + 400 - 17), GROUP_RECT, 'group')).toBe('center');
    });

    it('group: a short group (25% < 16px) uses 25%', () => {
        const small = rect(100, 40); // 25% = 10px
        expect(resolveZone(dragged(109), small, 'group')).toBe('before');
        expect(resolveZone(dragged(111), small, 'group')).toBe('center');
        expect(resolveZone(dragged(131), small, 'group')).toBe('after');
    });
});

describe('nextIntent: pointer, ungrouped source', () => {
    it('idle -> reorder(before) over the top edge of a card', () => {
        expect(nextIntent(IDLE, pointer({ centerY: 110 }), T0)).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'before' });
    });

    it('idle -> reorder(after) over the bottom edge', () => {
        expect(nextIntent(IDLE, pointer({ centerY: 190 }), T0)).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'after' });
    });

    it('entering the centre of a card starts pendingGroup with since = now and a card target', () => {
        const reorder: DragIntent = { kind: 'reorder', overId: 'card:c2', edge: 'before' };
        expect(nextIntent(reorder, pointer({ centerY: 150 }), T0)).toEqual({
            kind: 'pendingGroup',
            target: { kind: 'card', cardId: 'c2' },
            since: T0,
        });
    });

    it('entering the centre of a group yields a group target', () => {
        const input = pointer({ over: { id: 'group:g1', kind: 'group', rect: GROUP_RECT }, centerY: 300 });
        expect(nextIntent(IDLE, input, T0)).toEqual({ kind: 'pendingGroup', target: { kind: 'group', groupId: 'g1' }, since: T0 });
    });

    it('stays pendingGroup (keeping the original since) before the dwell elapses', () => {
        const pending: DragIntent = { kind: 'pendingGroup', target: { kind: 'card', cardId: 'c2' }, since: T0 };
        expect(nextIntent(pending, pointer({ centerY: 150 }), T0 + DWELL_MS - 1)).toEqual(pending);
    });

    it('becomes group once DWELL_MS has elapsed', () => {
        const pending: DragIntent = { kind: 'pendingGroup', target: { kind: 'card', cardId: 'c2' }, since: T0 };
        expect(nextIntent(pending, pointer({ centerY: 150 }), T0 + DWELL_MS)).toEqual({ kind: 'group', target: { kind: 'card', cardId: 'c2' } });
        expect(nextIntent(pending, pointer({ centerY: 150 }), T0 + DWELL_MS + 500)).toEqual({ kind: 'group', target: { kind: 'card', cardId: 'c2' } });
    });

    it('stays group while the pointer remains in the centre of the same target', () => {
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        expect(nextIntent(armed, pointer({ centerY: 155 }), T0 + 1000)).toEqual(armed);
    });

    it('leaving the centre cancels pendingGroup back to reorder', () => {
        const pending: DragIntent = { kind: 'pendingGroup', target: { kind: 'card', cardId: 'c2' }, since: T0 };
        expect(nextIntent(pending, pointer({ centerY: 110 }), T0 + 50)).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'before' });
    });

    it('leaving the centre disarms group back to reorder', () => {
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        expect(nextIntent(armed, pointer({ centerY: 190 }), T0 + 400)).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'after' });
    });

    it('changing the over target while in the centre restarts the dwell on the new target', () => {
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        const other = pointer({ over: { id: 'card:c3', kind: 'card', rect: CARD_RECT }, centerY: 150 });
        expect(nextIntent(armed, other, T0 + 500)).toEqual({ kind: 'pendingGroup', target: { kind: 'card', cardId: 'c3' }, since: T0 + 500 });
    });

    it('the dwell restarts from zero after re-entering the centre (no carry-over)', () => {
        let intent = nextIntent(IDLE, pointer({ centerY: 150 }), T0);
        intent = nextIntent(intent, pointer({ centerY: 110 }), T0 + 100); // leave
        intent = nextIntent(intent, pointer({ centerY: 150 }), T0 + 150); // re-enter
        expect(intent).toEqual({ kind: 'pendingGroup', target: { kind: 'card', cardId: 'c2' }, since: T0 + 150 });
        expect(nextIntent(intent, pointer({ centerY: 150 }), T0 + 150 + DWELL_MS - 1).kind).toBe('pendingGroup');
    });

    it('over the column catch-all (below the items) -> reorder after the column id, from any state', () => {
        const over = { id: 'col1', kind: 'column' as const, rect: GROUP_RECT };
        const expected = { kind: 'reorder', overId: 'col1', edge: 'after' };
        // regardless of vertical position within the catch-all, and never arms group
        for (const centerY of [105, 300, 495]) {
            expect(nextIntent(IDLE, pointer({ over, centerY }), T0)).toEqual(expected);
        }
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        expect(nextIntent(armed, pointer({ over, centerY: 300 }), T0)).toEqual(expected);
    });

    it('the column catch-all also applies to a grouped source (end of column)', () => {
        const over = { id: 'col1', kind: 'column' as const, rect: GROUP_RECT };
        expect(nextIntent(IDLE, pointer({ over, sourceGroupId: 'g1' }), T0)).toEqual({ kind: 'reorder', overId: 'col1', edge: 'after' });
    });

    it('over = null -> outside, from any state', () => {
        const states: DragIntent[] = [
            IDLE,
            { kind: 'reorder', overId: 'card:c2', edge: 'before' },
            { kind: 'pendingGroup', target: { kind: 'card', cardId: 'c2' }, since: T0 },
            { kind: 'group', target: { kind: 'card', cardId: 'c2' } },
            { kind: 'none' },
        ];
        for (const prev of states) {
            expect(nextIntent(prev, pointer({ over: null }), T0 + 10)).toEqual({ kind: 'outside' });
        }
    });

    it('outside -> reorder when the pointer returns over an item edge', () => {
        expect(nextIntent({ kind: 'outside' }, pointer({ centerY: 110 }), T0)).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'before' });
    });
});

describe('nextIntent: grouping disabled (mode user / no permission)', () => {
    it('always reorders, even in the centre, and never arms', () => {
        const a = nextIntent(IDLE, pointer({ groupingEnabled: false, centerY: 140 }), T0);
        expect(a).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'before' });
        const b = nextIntent(a, pointer({ groupingEnabled: false, centerY: 160 }), T0 + 10_000);
        expect(b).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'after' });
    });

    it('disarms an armed intent when grouping becomes disabled', () => {
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        expect(nextIntent(armed, pointer({ groupingEnabled: false, centerY: 150 }), T0).kind).toBe('reorder');
    });
});

describe('nextIntent: grouped source (member drag)', () => {
    it('over its own group -> none, in every zone', () => {
        for (const centerY of [105, 300, 495]) {
            const input = pointer({ sourceGroupId: 'g1', over: { id: 'group:g1', kind: 'group', rect: GROUP_RECT }, centerY });
            expect(nextIntent(IDLE, input, T0)).toEqual({ kind: 'none' });
        }
    });

    it('leaving its own group resolves normally again', () => {
        const input = pointer({ sourceGroupId: 'g1', centerY: 110 });
        expect(nextIntent({ kind: 'none' }, input, T0)).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'before' });
    });

    it('can still target a different group (dwell applies)', () => {
        const input = pointer({ sourceGroupId: 'g1', over: { id: 'group:g2', kind: 'group', rect: GROUP_RECT }, centerY: 300 });
        expect(nextIntent(IDLE, input, T0)).toEqual({ kind: 'pendingGroup', target: { kind: 'group', groupId: 'g2' }, since: T0 });
    });

    it('can target an ungrouped card to start a new group', () => {
        expect(nextIntent(IDLE, pointer({ sourceGroupId: 'g1', centerY: 150 }), T0)).toEqual({
            kind: 'pendingGroup',
            target: { kind: 'card', cardId: 'c2' },
            since: T0,
        });
    });
});

describe('nextIntent: keyboard mode', () => {
    const kb = (overrides: Partial<Input> = {}): Input => ({
        over: { id: 'card:c2', kind: 'card', rect: CARD_RECT },
        draggedRect: dragged(150),
        groupingEnabled: true,
        inputMode: 'keyboard',
        ...overrides,
    });

    it('defaults to reorder over a card, ignoring geometry and never entering pendingGroup', () => {
        const intent = nextIntent(IDLE, kb({ draggedRect: dragged(150) }), T0); // would be centre for a pointer
        expect(intent).toMatchObject({ kind: 'reorder', overId: 'card:c2' });
        expect(nextIntent(intent, kb(), T0 + 10_000)).toMatchObject({ kind: 'reorder', overId: 'card:c2' });
    });

    it('toggle switches reorder -> group immediately (no dwell) with the over target', () => {
        const reorder = nextIntent(IDLE, kb(), T0);
        expect(nextIntent(reorder, kb({ toggle: true }), T0 + 1)).toEqual({ kind: 'group', target: { kind: 'card', cardId: 'c2' } });
    });

    it('toggle over a group targets the group', () => {
        const over = { id: 'group:g1', kind: 'group' as const, rect: GROUP_RECT };
        const reorder = nextIntent(IDLE, kb({ over }), T0);
        expect(nextIntent(reorder, kb({ over, toggle: true }), T0 + 1)).toEqual({ kind: 'group', target: { kind: 'group', groupId: 'g1' } });
    });

    it('toggle again switches group -> reorder', () => {
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        expect(nextIntent(armed, kb({ toggle: true }), T0)).toMatchObject({ kind: 'reorder', overId: 'card:c2' });
    });

    it('the group intent persists across calls without toggle while the target is unchanged', () => {
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        expect(nextIntent(armed, kb(), T0 + 5000)).toEqual(armed);
    });

    it('moving to another item resets group back to reorder on the new item', () => {
        const armed: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        const moved = kb({ over: { id: 'card:c3', kind: 'card', rect: CARD_RECT } });
        expect(nextIntent(armed, moved, T0)).toMatchObject({ kind: 'reorder', overId: 'card:c3' });
    });

    it('toggle is ignored when grouping is disabled', () => {
        const reorder = nextIntent(IDLE, kb({ groupingEnabled: false }), T0);
        expect(nextIntent(reorder, kb({ groupingEnabled: false, toggle: true }), T0)).toMatchObject({ kind: 'reorder' });
    });

    it('toggle over the grouped source\'s own group stays none', () => {
        const over = { id: 'group:g1', kind: 'group' as const, rect: GROUP_RECT };
        const none = nextIntent(IDLE, kb({ over, sourceGroupId: 'g1' }), T0);
        expect(none).toEqual({ kind: 'none' });
        expect(nextIntent(none, kb({ over, sourceGroupId: 'g1', toggle: true }), T0)).toEqual({ kind: 'none' });
    });

    it('toggle over the column catch-all does nothing (no card or group target)', () => {
        const over = { id: 'col1', kind: 'column' as const, rect: GROUP_RECT };
        const intent = nextIntent(IDLE, kb({ over }), T0);
        expect(nextIntent(intent, kb({ over, toggle: true }), T0).kind).toBe('reorder');
    });

    it('over = null -> outside', () => {
        expect(nextIntent(IDLE, kb({ over: null }), T0)).toEqual({ kind: 'outside' });
    });
});
