import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ColumnDndProvider from '@/features/boards/clustering/dnd/ColumnDndProvider';
import ColumnItemList from '@/features/boards/clustering/components/ColumnItemList';
import { ColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { buildColumnItems } from '@/features/boards/clustering/dnd/columnOrder';
import { DWELL_MS } from '@/features/boards/clustering/dnd/dragIntent';
import type { Card, CardGroup } from '@/features/boards/types/card';

/**
 * T078 (spec 059, performance): on a column of ~20 items and 2 groups, a drag must not
 * re-render the card tree per pointer-move frame, and an intent transition may re-render
 * only the previously armed and the newly armed item (plus the provider itself).
 *
 * jsdom cannot drive dnd-kit's sensors, so DndContext is a pass-through that captures its
 * callbacks (same approach as ColumnDndProvider.test.tsx). The REAL ColumnItemList,
 * SortableCard and GroupCard render; only their heavy leaves are spies:
 * SelectableCard (rendered once per SortableCard render) and DraggableCard (once per card
 * inside a GroupCard render). So `renders[cardId]` counts item renders.
 */

const dnd = vi.hoisted(() => ({ props: { current: null as any } }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@dnd-kit/core')>();
    return {
        ...actual,
        DndContext: (props: any) => {
            if (props) dnd.props.current = props;
            return <>{props?.children}</>;
        },
        DragOverlay: () => null,
    };
});

vi.mock('@/lib/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const renders = vi.hoisted(() => ({ byCard: {} as Record<string, number> }));
const count = (id: string) => { renders.byCard[id] = (renders.byCard[id] ?? 0) + 1; return null; };
vi.mock('@/features/boards/retrospective/components/SelectableCard', () => ({
    default: ({ card }: any) => count(card.id),
}));
vi.mock('@/features/boards/retrospective/components/DraggableCard', () => ({
    default: ({ card }: any) => count(card.id),
}));

const COLUMN = 'col1';
const t0 = new Date('2026-01-01T00:00:00.000Z');
const mk = (id: string, order: number, groupId?: string): Card => ({
    id, content: `content-${id}`, column: COLUMN, createdBy: 'u1', createdAt: t0, updatedAt: t0,
    retrospectiveId: 'r1', order, ...(groupId ? { groupId } : {}),
});

// 18 ungrouped cards (U0..U17) + 2 groups of 2 cards each = 20 column items + 4 grouped cards.
const ungrouped = Array.from({ length: 18 }, (_, i) => mk(`U${i}`, (i + 1) * 100));
const groupedCards = [mk('H1', 1850, 'G1'), mk('M1', 1851, 'G1'), mk('H2', 1950, 'G2'), mk('M2', 1951, 'G2')];
const allCards = [...ungrouped, ...groupedCards];
const groups = [
    { id: 'G1', headCardId: 'H1', memberCardIds: ['M1'], isCollapsed: false, order: 1850, column: COLUMN, retrospectiveId: 'r1', createdAt: t0, createdBy: 'u1' },
    { id: 'G2', headCardId: 'H2', memberCardIds: ['M2'], isCollapsed: false, order: 1950, column: COLUMN, retrospectiveId: 'r1', createdAt: t0, createdBy: 'u1' },
] as CardGroup[];

const noop = vi.fn(async () => undefined);
const OVER_RECT = { top: 100, left: 0, width: 300, height: 100 };
const dragEvent = (overId: string, draggedTop: number) => ({
    active: {
        id: 'card:U0',
        data: { current: { type: 'card' } },
        rect: { current: { initial: null, translated: { top: draggedTop, left: 0, width: 300, height: 60 } } },
    },
    over: { id: overId, rect: OVER_RECT, disabled: false, data: { current: { type: overId.startsWith('group:') ? 'group' : 'card' } } },
    activatorEvent: new Event('pointerdown'),
    collisions: null, delta: { x: 0, y: 0 },
});
const MIDDLE = 120; // dragged centre y=150: middle zone of the 100px-tall target
const TOP_EDGE = 80; // dragged centre y=110: before band

const total = () => Object.values(renders.byCard).reduce((a, b) => a + b, 0);
const call = (name: string, event: unknown) => act(() => { dnd.props.current[name](event); });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

function setup() {
    const items = buildColumnItems(allCards, groups, COLUMN);
    const outer = {
        columnId: COLUMN, groupingEnabled: true, items, groups, ungroupedCards: ungrouped,
        armedTargetId: null, insertionLine: null, busyTargetId: null,
        pendingEditGroupId: null, consumePendingEdit: vi.fn(),
        requestMove: vi.fn(async () => undefined), computeOrder: vi.fn(() => 25),
    };
    render(
        <ColumnGroupingContext.Provider value={outer as never}>
            <ColumnDndProvider>
                <ColumnItemList
                    items={items} cards={allCards}
                    onCardUpdate={noop} onCardDelete={noop} onCardVote={noop} onCardLike={noop}
                    onCardReaction={noop} onCardReactionRemove={noop}
                    onGroupToggleCollapse={vi.fn()} onGroupDisband={vi.fn()} onCardRemoveFromGroup={vi.fn()}
                    onRenameGroup={noop}
                />
            </ColumnDndProvider>
        </ColumnGroupingContext.Provider>,
    );
}

describe('ColumnDndProvider render performance (spec 059, T078)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        renders.byCard = {};
        dnd.props.current = null;
    });
    afterEach(() => vi.useRealTimers());

    it('(a) a burst of onDragMove events within one zone re-renders no item', () => {
        setup();
        call('onDragStart', dragEvent('card:U3', MIDDLE));
        call('onDragOver', dragEvent('card:U3', TOP_EDGE)); // reorder/before on U3
        const before = total();
        expect(before).toBeGreaterThan(0);

        for (let frame = 0; frame < 60; frame++) {
            call('onDragMove', dragEvent('card:U3', TOP_EDGE + (frame % 5))); // same zone every frame
        }

        expect(total() - before).toBe(0);
    });

    it('(b) an intent transition re-renders only the previously and the newly armed item', () => {
        setup();
        call('onDragStart', dragEvent('card:U3', MIDDLE));

        // Arm U3 (dwell in the middle zone).
        call('onDragOver', dragEvent('card:U3', MIDDLE));
        advance(DWELL_MS);
        let snapshot = { ...renders.byCard };
        const changed = (): string[] =>
            Object.keys(renders.byCard).filter((id) => renders.byCard[id] !== snapshot[id]);

        // Move the arming to another card: only U3 (old) and U5 (new) may render.
        snapshot = { ...renders.byCard };
        call('onDragOver', dragEvent('card:U5', MIDDLE));
        advance(DWELL_MS);
        expect(changed().sort()).toEqual(['U3', 'U5']);
        const perTransition = (id: string) => renders.byCard[id] - snapshot[id];
        expect(perTransition('U3')).toBeLessThanOrEqual(1);
        expect(perTransition('U5')).toBeLessThanOrEqual(1);

        // Armed card -> armed group: the group's header card renders, nothing else but U5.
        snapshot = { ...renders.byCard };
        call('onDragOver', dragEvent('group:G1', MIDDLE));
        advance(DWELL_MS);
        expect(changed().every((id) => ['U5', 'H1', 'M1'].includes(id))).toBe(true);
        expect(changed()).toContain('H1');
        expect(document.querySelectorAll('[data-group-target]')).toHaveLength(1);
    });
});
