import type { Card, CardGroup } from '@/features/boards/types/card';

/**
 * Pure helpers for a column's shared order space (spec 059, data-model.md § Column order).
 * Ungrouped cards and groups live in ONE ordered list per column; this module builds that
 * list and computes the `order` for an insertion. No React, no I/O.
 */

export type ColumnItem =
    | { kind: 'card'; id: `card:${string}`; card: Card }
    | { kind: 'group'; id: `group:${string}`; group: CardGroup };

export interface ColumnOrderEntry {
    kind: 'card' | 'group';
    /** Raw server id (not the prefixed ColumnItem id). */
    id: string;
    order: number;
}

export interface Placement {
    /** ColumnItem id of the neighbour ABOVE the insertion point. */
    beforeId?: string;
    /** ColumnItem id of the neighbour BELOW the insertion point. */
    afterId?: string;
}

export type OrderResult = { order: number } | { renormalize: ColumnOrderEntry[] };

/** Gap at or below which a midpoint is no longer reliable and the column is renormalized. */
export const MIN_ORDER_GAP = 1e-3;
/** Spacing used when a column is renormalized. */
export const RENORMALIZE_SPACING = 1024;

const orderOf = (item: ColumnItem): number => (item.kind === 'card' ? item.card.order : item.group.order) ?? 0;
const createdAtOf = (item: ColumnItem): number => (item.kind === 'card' ? item.card.createdAt : item.group.createdAt)?.getTime() ?? 0;
const rawIdOf = (item: ColumnItem): string => (item.kind === 'card' ? item.card.id : item.group.id);

function compareItems(a: ColumnItem, b: ColumnItem): number {
    const byOrder = orderOf(a) - orderOf(b);
    if (byOrder !== 0) return byOrder;
    if (a.kind !== b.kind) return a.kind === 'group' ? -1 : 1; // groups before cards on ties
    const byCreated = createdAtOf(a) - createdAtOf(b);
    if (byCreated !== 0) return byCreated;
    return rawIdOf(a) < rawIdOf(b) ? -1 : rawIdOf(a) > rawIdOf(b) ? 1 : 0;
}

/** Ungrouped cards and groups of one column, in display order. Does not mutate its inputs. */
export function buildColumnItems(cards: Card[], groups: CardGroup[], columnId: string): ColumnItem[] {
    const items: ColumnItem[] = [
        ...groups.filter((g) => g.column === columnId).map((group): ColumnItem => ({ kind: 'group', id: `group:${group.id}`, group })),
        ...cards.filter((c) => c.column === columnId && !c.groupId).map((card): ColumnItem => ({ kind: 'card', id: `card:${card.id}`, card })),
    ];
    return items.sort(compareItems);
}

/**
 * The `order` for an insertion between two neighbours: midpoint, `b - 1` at the start,
 * `a + 1` at the end, `0` for an empty column. When the gap is too small for double
 * precision to be trusted (<= MIN_ORDER_GAP) it returns the full renormalization of
 * the column instead (every item, spaced RENORMALIZE_SPACING apart, in display order).
 */
export function computeOrder(items: ColumnItem[], placement: Placement): OrderResult {
    const before = items.find((i) => i.id === placement.beforeId);
    const after = items.find((i) => i.id === placement.afterId);

    if (before && after) {
        if (orderOf(after) - orderOf(before) <= MIN_ORDER_GAP) {
            return {
                renormalize: items.map((item, index) => ({ kind: item.kind, id: rawIdOf(item), order: (index + 1) * RENORMALIZE_SPACING })),
            };
        }
        return { order: (orderOf(before) + orderOf(after)) / 2 };
    }
    if (after) return { order: orderOf(after) - 1 };
    if (before) return { order: orderOf(before) + 1 };
    return { order: 0 };
}

/** True when `computeOrder` would have to renormalize for this placement. */
export function needsRenormalize(items: ColumnItem[], placement: Placement): boolean {
    return 'renormalize' in computeOrder(items, placement);
}
