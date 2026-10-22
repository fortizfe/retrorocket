import type { MoveTarget } from '@/features/boards/types/card';

/**
 * Pure drag-intent state machine (spec 059, research §2/§3). Given where the dragged
 * card is relative to the item under it, decides whether releasing now would reorder,
 * group, or do nothing. No React, no timers: the hook feeds it events and a clock.
 */

/** Fraction of an item's height that counts as its top/bottom (reorder) band. */
export const ZONE_EDGE = 0.25;
/** A group's reorder band never exceeds this many px, so tall groups stay easy to drop into. */
export const GROUP_EDGE_MAX_PX = 16;
/** How long the dragged card must dwell in an item's centre before grouping arms. */
export const DWELL_MS = 180;

export type DragIntent =
    | { kind: 'idle' }
    | { kind: 'none' }
    | { kind: 'reorder'; overId: string; edge: 'before' | 'after' }
    | { kind: 'pendingGroup'; target: MoveTarget; since: number }
    | { kind: 'group'; target: MoveTarget }
    | { kind: 'outside' };

export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export type OverKind = 'card' | 'group' | 'column';
export type Zone = 'before' | 'center' | 'after';

export interface DragIntentInput {
    /** `id` is the dnd-kit id: `card:<id>`, `group:<id>` or the column id. */
    over: { id: string; kind: OverKind; rect: Rect } | null;
    draggedRect: Rect;
    /** False in `user` mode or without edit permission. */
    groupingEnabled: boolean;
    inputMode: 'pointer' | 'keyboard';
    /** Set when the dragged card is a group member. */
    sourceGroupId?: string;
    /** Keyboard only: the G key was pressed on this call. */
    toggle?: boolean;
}

/** Which third of the over item the dragged rect's vertical centre is in. Boundaries are 'center'. */
export function resolveZone(draggedRect: Rect, overRect: Rect, overKind: OverKind): Zone {
    const centerY = draggedRect.top + draggedRect.height / 2;
    const offset = centerY - overRect.top;
    const edgePx = overKind === 'group' ? Math.min(ZONE_EDGE * overRect.height, GROUP_EDGE_MAX_PX) : ZONE_EDGE * overRect.height;
    if (offset < edgePx) return 'before';
    if (offset > overRect.height - edgePx) return 'after';
    return 'center';
}

function targetOf(overId: string): MoveTarget | null {
    if (overId.startsWith('card:')) return { kind: 'card', cardId: overId.slice('card:'.length) };
    if (overId.startsWith('group:')) return { kind: 'group', groupId: overId.slice('group:'.length) };
    return null;
}

function sameTarget(a: MoveTarget, b: MoveTarget): boolean {
    if (a.kind === 'card' && b.kind === 'card') return a.cardId === b.cardId;
    if (a.kind === 'group' && b.kind === 'group') return a.groupId === b.groupId;
    return false;
}

/** Nearest edge by the dragged rect's centre; used where the geometry does not pick one. */
function nearestEdge(draggedRect: Rect, overRect: Rect): 'before' | 'after' {
    const draggedCenter = draggedRect.top + draggedRect.height / 2;
    return draggedCenter > overRect.top + overRect.height / 2 ? 'after' : 'before';
}

/** Pure transition; `now` is in ms. A pendingGroup is promoted once DWELL_MS has elapsed, on the next call. */
export function nextIntent(prev: DragIntent, input: DragIntentInput, now: number): DragIntent {
    const { over, draggedRect, groupingEnabled, inputMode, sourceGroupId, toggle } = input;

    if (!over) return { kind: 'outside' };
    // Empty space below the items: "end of column", the provider decides what that means.
    if (over.kind === 'column') return { kind: 'reorder', overId: over.id, edge: 'after' };
    if (sourceGroupId && over.kind === 'group' && over.id === `group:${sourceGroupId}`) return { kind: 'none' };

    const target = targetOf(over.id);
    const reorder = (edge: 'before' | 'after' = nearestEdge(draggedRect, over.rect)): DragIntent => ({ kind: 'reorder', overId: over.id, edge });

    if (!groupingEnabled || !target) return reorder();

    if (inputMode === 'keyboard') {
        const armedHere = prev.kind === 'group' && sameTarget(prev.target, target);
        if (toggle) return armedHere ? reorder() : { kind: 'group', target };
        return armedHere ? prev : reorder();
    }

    const zone = resolveZone(draggedRect, over.rect, over.kind);
    if (zone !== 'center') return reorder(zone);

    if (prev.kind === 'group' && sameTarget(prev.target, target)) return prev;
    if (prev.kind === 'pendingGroup' && sameTarget(prev.target, target)) {
        return now - prev.since >= DWELL_MS ? { kind: 'group', target } : prev;
    }
    return { kind: 'pendingGroup', target, since: now };
}
