import { describe, it, expect } from 'vitest';
import { verticalListSortingStrategy } from '@dnd-kit/sortable';
import { intentAwareSortingStrategy } from '@/features/boards/clustering/dnd/intentAwareSortingStrategy';
import type { DragIntent } from '@/features/boards/clustering/dnd/dragIntent';

type StrategyArgs = Parameters<typeof verticalListSortingStrategy>[0];

const rects = [0, 1, 2, 3].map((i) => ({ top: i * 100, left: 0, width: 200, height: 100, bottom: i * 100 + 100, right: 200 }));

// Dragging item 0 over item 2: items 1 and 2 shift up, so the real strategy is non-null for them.
const argsFor = (index: number): StrategyArgs => ({
    activeIndex: 0,
    activeNodeRect: rects[0],
    index,
    rects,
    overIndex: 2,
});

describe('intentAwareSortingStrategy', () => {
    it('sanity: the wrapped strategy displaces items 1 and 2 for this setup', () => {
        expect(verticalListSortingStrategy(argsFor(1))).not.toBeNull();
        expect(verticalListSortingStrategy(argsFor(2))).not.toBeNull();
    });

    it.each<DragIntent>([
        { kind: 'idle' },
        { kind: 'reorder', overId: 'card:c3', edge: 'before' },
        { kind: 'none' },
        { kind: 'outside' },
    ])('delegates to verticalListSortingStrategy for intent $kind', (intent) => {
        const strategy = intentAwareSortingStrategy(() => intent);
        for (let i = 0; i < rects.length; i++) {
            expect(strategy(argsFor(i))).toEqual(verticalListSortingStrategy(argsFor(i)));
        }
    });

    it('returns null for every item while the intent is pendingGroup', () => {
        const strategy = intentAwareSortingStrategy(() => ({ kind: 'pendingGroup', target: { kind: 'card', cardId: 'c3' }, since: 1 }));
        for (let i = 0; i < rects.length; i++) expect(strategy(argsFor(i))).toBeNull();
    });

    it('returns null for every item while the intent is group', () => {
        const strategy = intentAwareSortingStrategy(() => ({ kind: 'group', target: { kind: 'group', groupId: 'g1' } }));
        for (let i = 0; i < rects.length; i++) expect(strategy(argsFor(i))).toBeNull();
    });

    it('reads the intent lazily on each call, so displacement resumes when the intent leaves group', () => {
        let intent: DragIntent = { kind: 'group', target: { kind: 'card', cardId: 'c3' } };
        const strategy = intentAwareSortingStrategy(() => intent);

        expect(strategy(argsFor(1))).toBeNull();
        intent = { kind: 'reorder', overId: 'card:c3', edge: 'after' };
        expect(strategy(argsFor(1))).toEqual(verticalListSortingStrategy(argsFor(1)));
        expect(strategy(argsFor(1))).not.toBeNull();
    });
});

/**
 * T067 (spec 059, US6): no sortable displacement for grouped (`member:*`) drag sources.
 *
 * CONTRACT: a member card is dragged with `useDraggable`, so its id is NOT one of the
 * SortableContext items and dnd-kit reports `activeIndex === -1`. The strategy returns `null`
 * (no displacement) whenever `activeIndex === -1`, whatever the intent: the insertion line is
 * the only feedback (D1). No extra flag or ref is introduced.
 */
describe('intentAwareSortingStrategy: grouped sources (activeIndex -1)', () => {
    // A foreign (non-sortable) active node over item 2: dnd-kit makes room for it by default.
    const foreignArgs = (index: number): StrategyArgs => ({
        activeIndex: -1,
        activeNodeRect: { top: 0, left: 0, width: 200, height: 100, bottom: 100, right: 200 },
        index,
        rects,
        overIndex: 2,
    });

    it('sanity: the wrapped strategy WOULD displace items below the over index for a foreign active node', () => {
        expect([1, 2, 3].some((i) => verticalListSortingStrategy(foreignArgs(i)) !== null)).toBe(true);
    });

    it.each<DragIntent>([
        { kind: 'idle' },
        { kind: 'reorder', overId: 'card:c3', edge: 'before' },
        { kind: 'none' },
        { kind: 'outside' },
    ])('returns null for every item with intent $kind when the active node is not sortable', (intent) => {
        const strategy = intentAwareSortingStrategy(() => intent);
        for (let i = 0; i < rects.length; i++) expect(strategy(foreignArgs(i))).toBeNull();
    });

    it('still delegates normally when the active node IS a sortable item', () => {
        const strategy = intentAwareSortingStrategy(() => ({ kind: 'reorder', overId: 'card:c3', edge: 'before' }));
        expect(strategy(argsFor(1))).toEqual(verticalListSortingStrategy(argsFor(1)));
    });
});
