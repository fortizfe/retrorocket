import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import SortableCard from '@/features/boards/retrospective/components/SortableCard';
import { ColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import type { Card } from '@/features/boards/types/card';

/**
 * T036 (spec 059-drag-to-group-cards, US1): armed feedback / insertion line on SortableCard.
 * Behaviours B1-B4 (contracts/drag-group-ui.md).
 *
 * CONTRACTS FIXED BY THIS FILE (implementers must satisfy them or amend with justification):
 *
 *  1. SortableCard learns everything from `useOptionalColumnGroupingContext()`; it takes no new
 *     props and must still render outside a column context (no crash, no feedback).
 *  2. ARMED-ID FORMAT = the dnd-kit sortable id, i.e. the `ColumnItem.id`: `card:<id>` for a
 *     card, `group:<id>` for a group. SortableCard is armed iff
 *     `ctx.armedTargetId === 'card:' + card.id`.
 *  3. INSERTION LINE (B1): the context carries `insertionLine: { itemId: string; edge: 'before' | 'after' } | null`
 *     (itemId uses the same `card:<id>` / `group:<id>` format). The provider sets it only for
 *     the `reorder` intent and null otherwise (pendingGroup/group/none/outside). SortableCard
 *     renders it iff `insertionLine.itemId === 'card:' + card.id`, as
 *     `data-insertion-line="before|after"` on its wrapper plus a decorative
 *     `[data-testid="insertion-line"]` child (aria-hidden).
 *  4. BUSY (B5): the context carries `busyTargetId: string | null` (same id format), set by
 *     the provider while the grouping `requestMove` is pending. SortableCard sets
 *     `aria-busy="true"` on its wrapper iff it matches, and omits the attribute otherwise.
 *  5. ARMED RENDER (B3): wrapper gets `data-group-target="armed"` and contains a visible badge
 *     whose text is the i18n key `retrospective.dragGroup.dropToGroup`, with `aria-hidden="true"`.
 *     B2 (pending, < 180 ms) is simply `armedTargetId === null && insertionLine === null`:
 *     NO attribute, NO badge, NO line. "No displacement" itself is the sorting strategy's job
 *     (intentAwareSortingStrategy.test.ts), the component must not transform on its own.
 *     The dwell timing is covered at provider level (dnd/ColumnDndProvider.test.tsx).
 */

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/boards/retrospective/components/SelectableCard', () => ({
    default: ({ card }: any) => <div data-testid={`card-${card.id}`}>{card.content}</div>,
}));

const t0 = new Date('2026-01-01T00:00:00.000Z');
const cardB: Card = {
    id: 'B', content: 'content-B', column: 'col1', createdBy: 'u1',
    createdAt: t0, updatedAt: t0, retrospectiveId: 'r1', order: 10,
};
const asyncNoop = vi.fn(async () => { });

function ctxValue(overrides: Record<string, unknown> = {}) {
    return {
        columnId: 'col1', groupingEnabled: true, items: [], groups: [], ungroupedCards: [],
        armedTargetId: null, insertionLine: null, busyTargetId: null,
        pendingEditGroupId: null, consumePendingEdit: vi.fn(),
        requestMove: vi.fn(async () => { }), computeOrder: vi.fn(() => 0),
        ...overrides,
    };
}

function tree(overrides?: Record<string, unknown>, withContext = true) {
    const card = (
        <DndContext>
            <SortableContext items={['card:B']}>
                <SortableCard
                    card={cardB} onUpdate={asyncNoop} onDelete={asyncNoop} onVote={asyncNoop}
                    onLike={asyncNoop} onReaction={asyncNoop} onReactionRemove={asyncNoop} currentUser="u1"
                />
            </SortableContext>
        </DndContext>
    );
    return withContext ? (
        <ColumnGroupingContext.Provider value={ctxValue(overrides) as never}>{card}</ColumnGroupingContext.Provider>
    ) : card;
}

const wrapper = () => screen.getByTestId('card-B').parentElement as HTMLElement;

describe('SortableCard drop-to-group feedback (spec 059, T036)', () => {
    it('B2: renders no armed attribute, badge, insertion line or busy flag when nothing targets it', () => {
        render(tree());

        expect(wrapper()).not.toHaveAttribute('data-group-target');
        expect(wrapper()).not.toHaveAttribute('data-insertion-line');
        expect(wrapper()).not.toHaveAttribute('aria-busy', 'true');
        expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
        expect(screen.queryByTestId('insertion-line')).not.toBeInTheDocument();
    });

    it('B3: armedTargetId "card:B" arms it: data-group-target="armed" + aria-hidden "Drop to group" badge', () => {
        render(tree({ armedTargetId: 'card:B' }));

        expect(wrapper()).toHaveAttribute('data-group-target', 'armed');
        const badge = screen.getByText('retrospective.dragGroup.dropToGroup');
        expect(badge).toBeVisible();
        expect(badge.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(wrapper()).toContainElement(badge);
        // armed is a group intent: never an insertion line at the same time
        expect(screen.queryByTestId('insertion-line')).not.toBeInTheDocument();
    });

    it('B3: is NOT armed when a different item is the armed target', () => {
        render(tree({ armedTargetId: 'card:other' }));
        expect(wrapper()).not.toHaveAttribute('data-group-target');
        expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
    });

    it('B3: the raw card id (no "card:" prefix) does not arm it (id format is the dnd id)', () => {
        render(tree({ armedTargetId: 'B' }));
        expect(wrapper()).not.toHaveAttribute('data-group-target');
    });

    it('B4: removes the armed feedback when the armed target is cleared (leave / change target)', () => {
        const { rerender } = render(tree({ armedTargetId: 'card:B' }));
        expect(wrapper()).toHaveAttribute('data-group-target', 'armed');

        rerender(tree({ armedTargetId: null }));

        expect(wrapper()).not.toHaveAttribute('data-group-target');
        expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
    });

    it.each(['before', 'after'] as const)('B1: draws an aria-hidden insertion line on the %s edge and no armed feedback', (edge) => {
        render(tree({ insertionLine: { itemId: 'card:B', edge } }));

        expect(wrapper()).toHaveAttribute('data-insertion-line', edge);
        const line = screen.getByTestId('insertion-line');
        expect(wrapper()).toContainElement(line);
        expect(line.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(wrapper()).not.toHaveAttribute('data-group-target');
        expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
    });

    it('B1: no insertion line when the line belongs to another item', () => {
        render(tree({ insertionLine: { itemId: 'card:other', edge: 'before' } }));
        expect(wrapper()).not.toHaveAttribute('data-insertion-line');
        expect(screen.queryByTestId('insertion-line')).not.toBeInTheDocument();
    });

    it('B4: removes the insertion line when it is cleared', () => {
        const { rerender } = render(tree({ insertionLine: { itemId: 'card:B', edge: 'after' } }));
        expect(screen.getByTestId('insertion-line')).toBeInTheDocument();

        rerender(tree({ insertionLine: null }));

        expect(screen.queryByTestId('insertion-line')).not.toBeInTheDocument();
        expect(wrapper()).not.toHaveAttribute('data-insertion-line');
    });

    it('B5: sets aria-busy="true" while it is the busyTargetId, and only then', () => {
        const { rerender } = render(tree({ busyTargetId: 'card:B' }));
        expect(wrapper()).toHaveAttribute('aria-busy', 'true');

        rerender(tree({ busyTargetId: 'card:other' }));
        expect(wrapper()).not.toHaveAttribute('aria-busy', 'true');

        rerender(tree({ busyTargetId: null }));
        expect(wrapper()).not.toHaveAttribute('aria-busy', 'true');
    });

    it('still renders (no feedback, no crash) outside a ColumnGroupingContext', () => {
        render(tree(undefined, false));
        expect(screen.getByTestId('card-B')).toBeInTheDocument();
        expect(wrapper()).not.toHaveAttribute('data-group-target');
    });
});
