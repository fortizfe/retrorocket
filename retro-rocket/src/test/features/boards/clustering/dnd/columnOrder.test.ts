import { describe, it, expect } from 'vitest';
import { buildColumnItems, computeOrder } from '@/features/boards/clustering/dnd/columnOrder';
import type { Card, CardGroup } from '@/features/boards/types/card';

/**
 * Contract chosen for computeOrder(items, { beforeId?, afterId? }):
 *  - `beforeId` = id of the neighbour ABOVE the insertion point (a), `afterId` = id of the neighbour BELOW (b).
 *    Ids are ColumnItem ids (`card:<id>` / `group:<id>`).
 *  - both given  -> { order: (a.order + b.order) / 2 }
 *  - only afterId  (start of column) -> { order: b.order - 1 }
 *  - only beforeId (end of column)   -> { order: a.order + 1 }
 *  - gap b - a <= 1e-3 -> { renormalize } : EVERY item of `items` (in display order) with
 *    server ids (raw card/group id, NOT the prefixed ColumnItem id) and order (i + 1) * 1024.
 */

const COLUMN = 'col1';
const t0 = new Date('2026-01-01T00:00:00.000Z').getTime();

function card(id: string, order: number | undefined, extra: Partial<Card> = {}): Card {
    return {
        id,
        content: id,
        column: COLUMN,
        createdBy: 'u1',
        createdAt: new Date(t0),
        updatedAt: new Date(t0),
        retrospectiveId: 'r1',
        ...(order === undefined ? {} : { order }),
        ...extra,
    };
}

function group(id: string, order: number, extra: Partial<CardGroup> = {}): CardGroup {
    return {
        id,
        retrospectiveId: 'r1',
        column: COLUMN,
        headCardId: `${id}-head`,
        memberCardIds: [`${id}-m1`],
        isCollapsed: false,
        createdAt: new Date(t0),
        createdBy: 'u1',
        order,
        ...extra,
    };
}

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe('buildColumnItems', () => {
    it('prefixes ids with card: / group: and tags the kind', () => {
        const items = buildColumnItems([card('c1', 1)], [group('g1', 2)], COLUMN);

        expect(items).toHaveLength(2);
        expect(items[0]).toMatchObject({ kind: 'card', id: 'card:c1' });
        expect(items[1]).toMatchObject({ kind: 'group', id: 'group:g1' });
        expect((items[0] as { card: Card }).card.id).toBe('c1');
        expect((items[1] as { group: CardGroup }).group.id).toBe('g1');
    });

    it('sorts by order ascending, mixing cards and groups in one order space', () => {
        const items = buildColumnItems([card('c1', 30), card('c2', 10)], [group('g1', 20)], COLUMN);
        expect(ids(items)).toEqual(['card:c2', 'group:g1', 'card:c1']);
    });

    it('breaks order ties with groups before cards', () => {
        const items = buildColumnItems([card('c1', 5)], [group('g1', 5)], COLUMN);
        expect(ids(items)).toEqual(['group:g1', 'card:c1']);
    });

    it('then by createdAt ascending, then by id', () => {
        const older = new Date(t0 - 1000);
        const items = buildColumnItems(
            [card('b', 5), card('a', 5), card('z', 5, { createdAt: older })],
            [group('g2', 5), group('g1', 5), group('g0', 5, { createdAt: older })],
            COLUMN,
        );
        expect(ids(items)).toEqual(['group:g0', 'group:g1', 'group:g2', 'card:z', 'card:a', 'card:b']);
    });

    it('reproduces the legacy layout: groups at order 0 first, then cards 0..n', () => {
        const items = buildColumnItems(
            [card('c0', 0), card('c1', 1), card('c2', 2)],
            [group('g1', 0), group('g2', 0)],
            COLUMN,
        );
        expect(ids(items)).toEqual(['group:g1', 'group:g2', 'card:c0', 'card:c1', 'card:c2']);
    });

    it('reproduces the legacy layout when cards use Date.now()-sized orders', () => {
        const items = buildColumnItems(
            [card('late', 1.7e12 + 5), card('early', 1.7e12)],
            [group('g1', 0)],
            COLUMN,
        );
        expect(ids(items)).toEqual(['group:g1', 'card:early', 'card:late']);
    });

    it('treats a card without order as 0', () => {
        const items = buildColumnItems([card('c1', 3), card('noOrder', undefined)], [], COLUMN);
        expect(ids(items)).toEqual(['card:noOrder', 'card:c1']);
    });

    it('includes only ungrouped cards (grouped members are rendered by their group)', () => {
        const items = buildColumnItems([card('c1', 1), card('c2', 2, { groupId: 'g1' })], [group('g1', 0)], COLUMN);
        expect(ids(items)).toEqual(['group:g1', 'card:c1']);
    });

    it('includes only the requested column\'s cards and groups', () => {
        const items = buildColumnItems(
            [card('c1', 1), card('other', 1, { column: 'col2' })],
            [group('g1', 0), group('gOther', 0, { column: 'col2' })],
            COLUMN,
        );
        expect(ids(items)).toEqual(['group:g1', 'card:c1']);
    });

    it('returns an empty list for an empty column and does not mutate its inputs', () => {
        expect(buildColumnItems([], [], COLUMN)).toEqual([]);
        const cards = [card('b', 2), card('a', 1)];
        buildColumnItems(cards, [], COLUMN);
        expect(cards.map((c) => c.id)).toEqual(['b', 'a']);
    });
});

describe('computeOrder', () => {
    const items = buildColumnItems([card('a', 10), card('b', 20), card('c', 40)], [], COLUMN);

    it('returns { order: 0 } for an empty column (no neighbours)', () => {
        expect(computeOrder([], {})).toEqual({ order: 0 });
        expect(computeOrder(buildColumnItems([], [], COLUMN), {})).toEqual({ order: 0 });
    });

    it('returns the midpoint between the neighbours', () => {
        expect(computeOrder(items, { beforeId: 'card:a', afterId: 'card:b' })).toEqual({ order: 15 });
        expect(computeOrder(items, { beforeId: 'card:b', afterId: 'card:c' })).toEqual({ order: 30 });
    });

    it('returns b - 1 at the start of the column', () => {
        expect(computeOrder(items, { afterId: 'card:a' })).toEqual({ order: 9 });
    });

    it('returns a + 1 at the end of the column', () => {
        expect(computeOrder(items, { beforeId: 'card:c' })).toEqual({ order: 41 });
    });

    it('supports groups as neighbours (shared order space)', () => {
        const mixed = buildColumnItems([card('a', 10)], [group('g1', 20)], COLUMN);
        expect(computeOrder(mixed, { beforeId: 'card:a', afterId: 'group:g1' })).toEqual({ order: 15 });
    });

    it('keeps a clean midpoint when the gap is just above the precision guard', () => {
        const tight = buildColumnItems([card('a', 0), card('b', 0.002)], [], COLUMN);
        expect(computeOrder(tight, { beforeId: 'card:a', afterId: 'card:b' })).toEqual({ order: 0.001 });
    });

    it('renormalizes (spacing 1024, server ids, display order) when the gap is exactly 1e-3', () => {
        const tight = buildColumnItems([card('a', 0), card('b', 1e-3), card('c', 5)], [group('g1', 9)], COLUMN);
        const result = computeOrder(tight, { beforeId: 'card:a', afterId: 'card:b' });

        expect(result).toEqual({
            renormalize: [
                { kind: 'card', id: 'a', order: 1024 },
                { kind: 'card', id: 'b', order: 2048 },
                { kind: 'card', id: 'c', order: 3072 },
                { kind: 'group', id: 'g1', order: 4096 },
            ],
        });
    });

    it('renormalizes when two neighbours share the same order', () => {
        const same = buildColumnItems([card('a', 7), card('b', 7)], [], COLUMN);
        const result = computeOrder(same, { beforeId: 'card:a', afterId: 'card:b' });
        expect(result).toHaveProperty('renormalize');
        expect(result).not.toHaveProperty('order');
    });

    it('renormalizes at Date.now() magnitudes where double precision is ~2.4e-4', () => {
        const base = 1.7e12;
        const tight = buildColumnItems([card('a', base), card('b', base + 2.44140625e-4)], [], COLUMN);
        const result = computeOrder(tight, { beforeId: 'card:a', afterId: 'card:b' });

        expect(result).toEqual({
            renormalize: [
                { kind: 'card', id: 'a', order: 1024 },
                { kind: 'card', id: 'b', order: 2048 },
            ],
        });
    });

    it('does not renormalize for a healthy gap at Date.now() magnitudes', () => {
        const base = 1.7e12;
        const roomy = buildColumnItems([card('a', base), card('b', base + 10)], [], COLUMN);
        expect(computeOrder(roomy, { beforeId: 'card:a', afterId: 'card:b' })).toEqual({ order: base + 5 });
    });

    it('never produces an order equal to either neighbour when it returns { order }', () => {
        const result = computeOrder(items, { beforeId: 'card:a', afterId: 'card:b' });
        expect('order' in result && result.order > 10 && result.order < 20).toBe(true);
    });
});
