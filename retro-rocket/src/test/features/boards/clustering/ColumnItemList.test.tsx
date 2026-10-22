import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DndContext, useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import ColumnItemList from '@/features/boards/clustering/components/ColumnItemList';
import { ColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { buildColumnItems } from '@/features/boards/clustering/dnd/columnOrder';
import type { Card, CardGroup } from '@/features/boards/types/card';

/**
 * T027 (spec 059-drag-to-group-cards): contract tests for the NEW component
 * `clustering/components/ColumnItemList` (contracts/drag-group-ui.md, research.md §1).
 *
 * ---------------------------------------------------------------------------
 * PROPS CONTRACT ASSUMED (the implementer must satisfy this, or amend this file
 * with a justification). It deliberately mirrors what GroupableColumn passes today
 * to GroupCard (groups) and to GroupedCardList -> DragDropColumn -> SortableCard
 * (ungrouped cards):
 *
 *   interface ColumnItemListProps {
 *     items: ColumnItem[];          // output of buildColumnItems(), already in display order
 *     cards: Card[];                // every card of the column (grouped ones included);
 *                                   // used to resolve each group's head + member cards
 *     // card handlers, forwarded to SortableCard exactly as DragDropColumn does
 *     onCardUpdate, onCardDelete, onCardVote, onCardLike, onCardReaction,
 *     onCardReactionRemove, currentUser?, participants?, canConvertToAction?,
 *     onConvertToAction?
 *     // group handlers, forwarded to GroupCard exactly as GroupableColumn does
 *     onGroupToggleCollapse(groupId), onGroupDisband(groupId),
 *     onCardRemoveFromGroup(cardId),
 *     onRenameGroup(groupId, title: string | null): Promise<void>   // GroupCard prop `onRenameGroup`
 *   }
 *
 * It reads ColumnGroupingContext (NOT props) for: pendingEditGroupId and
 * consumePendingEdit() -> GroupCard `autoEditTitle` / `onAutoEditConsumed`.
 * `ColumnGroupingContext` is the React context object exported (named) from
 * dnd/ColumnGroupingContext.ts, with the value shape of data-model.md.
 *
 * Structure assumed: ONE <SortableContext> over items.map(i => i.id) (ids are
 * `card:<id>` / `group:<id>`); ungrouped cards render through the existing
 * SortableCard (sortable id must therefore become `card:<id>`); groups render
 * through GroupCard inside a wrapper that calls
 * useSortable({ id: 'group:<id>', disabled: { draggable: true } }).
 *
 * HARNESS: real @dnd-kit/core <DndContext> (no ColumnDndProvider) + a stub
 * ColumnGroupingContext value. useSortable is wrapped in a pass-through spy so we
 * can assert its arguments. GroupCard and DraggableCard are stubbed (GroupCard is
 * changed by other tasks; DraggableCard stub renders the real drag-handle wiring
 * plus the vote/delete controls so that "controls unchanged" is observable).
 * ---------------------------------------------------------------------------
 */

vi.mock('framer-motion', () => ({
    motion: {
        div: React.forwardRef<HTMLDivElement, any>(({ children, layout: _l, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _w, ...props }, ref) => (
            <div ref={ref} {...props}>{children}</div>
        )),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Pass-through spy: real behaviour, observable arguments.
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@dnd-kit/sortable')>();
    return { ...actual, useSortable: vi.fn(actual.useSortable) };
});

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/boards/retrospective/components/DraggableCard', () => ({
    default: ({ card, dragHandleProps, onVote, onDelete }: any) => (
        <div data-testid={`card-${card.id}`}>
            <span>{card.content}</span>
            {dragHandleProps && (
                <button
                    type="button"
                    ref={dragHandleProps.setActivatorNodeRef}
                    aria-label="retrospective.card.dragHandle"
                    {...dragHandleProps.attributes}
                    {...dragHandleProps.listeners}
                />
            )}
            <button type="button" onClick={() => onVote?.(card.id, true)}>vote-{card.id}</button>
            <button type="button" onClick={() => onDelete?.(card.id)}>delete-{card.id}</button>
        </div>
    ),
}));

vi.mock('@/features/boards/clustering/components/GroupCard', () => ({
    GroupCard: ({ group, cards, autoEditTitle, onAutoEditConsumed, onRenameGroup, onToggleCollapse, onDisbandGroup, onRemoveCardFromGroup }: any) => (
        <div
            data-testid={`group-card-${group.id}`}
            data-auto-edit={String(!!autoEditTitle)}
            data-member-ids={cards.map((c: Card) => c.id).sort().join(',')}
        >
            <span>group:{group.title}</span>
            <button type="button" onClick={() => onRenameGroup?.(group.id, 'Renamed')}>rename-{group.id}</button>
            <button type="button" onClick={() => onAutoEditConsumed?.()}>consumed-{group.id}</button>
            <button type="button" onClick={() => onToggleCollapse?.(group.id)}>toggle-{group.id}</button>
            <button type="button" onClick={() => onDisbandGroup?.(group.id)}>disband-{group.id}</button>
            <button type="button" onClick={() => onRemoveCardFromGroup?.('gm')}>remove-{group.id}</button>
        </div>
    ),
}));

const COLUMN = 'col1';
const t0 = new Date('2026-01-01T00:00:00.000Z');

function card(id: string, order: number, extra: Partial<Card> = {}): Card {
    return {
        id, content: `content-${id}`, column: COLUMN, createdBy: 'u1',
        createdAt: t0, updatedAt: t0, retrospectiveId: 'r1', order, ...extra,
    };
}

const cards: Card[] = [
    card('u1', 10),
    card('u2', 30),
    card('gh', 0, { groupId: 'g1', isGroupHead: true }),
    card('gm', 0, { groupId: 'g1', groupOrder: 1 }),
];
const groups: CardGroup[] = [{
    id: 'g1', retrospectiveId: 'r1', column: COLUMN, title: 'My group',
    headCardId: 'gh', memberCardIds: ['gm'], isCollapsed: false,
    createdAt: t0, createdBy: 'u1', order: 20,
}];

const asyncNoop = vi.fn(async () => { });

function DroppableIds({ onIds }: { onIds: (ids: string[]) => void }) {
    const { droppableContainers } = useDndContext();
    onIds(Array.from(droppableContainers.keys()).map(String));
    return null;
}

function setup(ctxOverrides: Record<string, unknown> = {}, propOverrides: Record<string, unknown> = {}) {
    const items = buildColumnItems(cards, groups, COLUMN);
    const ctx = {
        columnId: COLUMN, groupingEnabled: true, items, groups,
        ungroupedCards: cards.filter((c) => !c.groupId),
        armedTargetId: null, pendingEditGroupId: null, consumePendingEdit: vi.fn(),
        requestMove: vi.fn(async () => { }), computeOrder: vi.fn(() => 0),
        ...ctxOverrides,
    };
    const props = {
        items, cards,
        onCardUpdate: asyncNoop, onCardDelete: vi.fn(async () => { }), onCardVote: vi.fn(async () => { }),
        onCardLike: asyncNoop, onCardReaction: asyncNoop, onCardReactionRemove: asyncNoop,
        currentUser: 'u1', participants: [],
        onGroupToggleCollapse: vi.fn(), onGroupDisband: vi.fn(), onCardRemoveFromGroup: vi.fn(),
        onRenameGroup: vi.fn(async () => { }),
        ...propOverrides,
    };
    let ids: string[] = [];
    const utils = render(
        <ColumnGroupingContext.Provider value={ctx as never}>
            <DndContext>
                <ColumnItemList {...(props as never)} />
                <DroppableIds onIds={(v) => { ids = v; }} />
            </DndContext>
        </ColumnGroupingContext.Provider>
    );
    return { ...utils, ctx, props, getDroppableIds: () => ids };
}

describe('ColumnItemList (spec 059, T027)', () => {
    beforeEach(() => {
        vi.mocked(useSortable).mockClear();
    });

    it('renders groups and ungrouped cards interleaved in buildColumnItems order (DOM order)', () => {
        setup();

        const order = Array.from(
            document.querySelectorAll('[data-testid^="card-"], [data-testid^="group-card-"]')
        ).map((el) => el.getAttribute('data-testid'));

        // u1 (10) < g1 (20) < u2 (30); grouped member cards are NOT rendered as column items.
        expect(order).toEqual(['card-u1', 'group-card-g1', 'card-u2']);
    });

    it('renders legacy ties groups-first (group order 0 before cards with order 0)', () => {
        const legacyGroups = [{ ...groups[0], order: 0 }];
        const legacyCards = [card('u1', 0), card('u2', 5), cards[2], cards[3]];
        const items = buildColumnItems(legacyCards, legacyGroups, COLUMN);
        render(
            <ColumnGroupingContext.Provider
                value={{ columnId: COLUMN, groupingEnabled: true, items, groups: legacyGroups, ungroupedCards: [], armedTargetId: null, pendingEditGroupId: null, consumePendingEdit: vi.fn(), requestMove: vi.fn(), computeOrder: vi.fn() } as never}
            >
                <DndContext>
                    <ColumnItemList
                        {...({
                            items, cards: legacyCards,
                            onCardUpdate: asyncNoop, onCardDelete: asyncNoop, onCardVote: asyncNoop,
                            onCardLike: asyncNoop, onCardReaction: asyncNoop, onCardReactionRemove: asyncNoop,
                            onGroupToggleCollapse: vi.fn(), onGroupDisband: vi.fn(), onCardRemoveFromGroup: vi.fn(), onRenameGroup: asyncNoop,
                        } as never)}
                    />
                </DndContext>
            </ColumnGroupingContext.Provider>
        );
        const order = Array.from(document.querySelectorAll('[data-testid^="card-"], [data-testid^="group-card-"]'))
            .map((el) => el.getAttribute('data-testid'));
        expect(order).toEqual(['group-card-g1', 'card-u1', 'card-u2']);
    });

    it('passes each group its head + member cards', () => {
        setup();
        expect(screen.getByTestId('group-card-g1')).toHaveAttribute('data-member-ids', 'gh,gm');
    });

    describe('groups are droppable but NOT draggable; ungrouped cards are draggable', () => {
        it('calls useSortable for a group with disabled.draggable === true (and droppable not disabled)', () => {
            setup();
            const groupCall = vi.mocked(useSortable).mock.calls.map((c) => c[0]).find((a) => a.id === 'group:g1');

            expect(groupCall).toBeDefined();
            expect(groupCall!.disabled).toEqual(expect.objectContaining({ draggable: true }));
            expect((groupCall!.disabled as { droppable?: boolean }).droppable).not.toBe(true);
        });

        it('does not disable dragging for ungrouped cards (sortable id is prefixed card:<id>)', () => {
            setup();
            const cardCall = vi.mocked(useSortable).mock.calls.map((c) => c[0]).find((a) => a.id === 'card:u1');

            expect(cardCall).toBeDefined();
            const disabled = cardCall!.disabled;
            const draggableDisabled = typeof disabled === 'object' ? disabled.draggable : disabled;
            expect(draggableDisabled).toBeFalsy();
        });

        it('registers both cards and the group as droppable targets', async () => {
            const { getDroppableIds } = setup();
            await waitFor(() => {
                expect(getDroppableIds()).toEqual(expect.arrayContaining(['card:u1', 'card:u2', 'group:g1']));
            });
        });

        it('gives ungrouped cards a drag handle but the group wrapper none (no sortable/drag attributes)', () => {
            setup();

            // exactly one handle per ungrouped card, none for the group (its stub renders none)
            expect(screen.getAllByLabelText('retrospective.card.dragHandle')).toHaveLength(2);

            const group = screen.getByTestId('group-card-g1');
            // No ancestor of the group exposes dnd-kit's drag-activator attributes.
            expect(group.closest('[aria-roledescription="sortable"]')).toBeNull();
            expect(group.closest('[aria-roledescription]')).toBeNull();
            expect(group.closest('[role="button"]')).toBeNull();
            expect(group.closest('[tabindex="0"]')).toBeNull();

            // and the ungrouped card's handle does carry them
            const handle = within(screen.getByTestId('card-u1')).getByLabelText('retrospective.card.dragHandle');
            expect(handle).toHaveAttribute('aria-roledescription', 'sortable');
        });
    });

    describe('existing card controls are rendered unchanged', () => {
        it('forwards vote and delete to the card handlers with the raw card id (not the prefixed sortable id)', async () => {
            const user = userEvent.setup();
            const { props } = setup();

            await user.click(screen.getByText('vote-u1'));
            await user.click(screen.getByText('delete-u2'));

            expect(props.onCardVote).toHaveBeenCalledWith('u1', true);
            expect(props.onCardDelete).toHaveBeenCalledWith('u2');
        });

        it('forwards group controls (toggle, disband, remove member) to the group handlers', async () => {
            const user = userEvent.setup();
            const { props } = setup();

            await user.click(screen.getByText('toggle-g1'));
            await user.click(screen.getByText('disband-g1'));
            await user.click(screen.getByText('remove-g1'));

            expect(props.onGroupToggleCollapse).toHaveBeenCalledWith('g1');
            expect(props.onGroupDisband).toHaveBeenCalledWith('g1');
            expect(props.onCardRemoveFromGroup).toHaveBeenCalledWith('gm');
        });
    });

    describe('group title editing wiring', () => {
        it('forwards onRenameGroup(groupId, title) to GroupCard', async () => {
            const user = userEvent.setup();
            const { props } = setup();

            await user.click(screen.getByText('rename-g1'));

            expect(props.onRenameGroup).toHaveBeenCalledWith('g1', 'Renamed');
        });

        it('sets autoEditTitle only on the group in context.pendingEditGroupId and consumes it via the context', async () => {
            const user = userEvent.setup();
            const consumePendingEdit = vi.fn();
            setup({ pendingEditGroupId: 'g1', consumePendingEdit });

            expect(screen.getByTestId('group-card-g1')).toHaveAttribute('data-auto-edit', 'true');

            await user.click(screen.getByText('consumed-g1'));
            expect(consumePendingEdit).toHaveBeenCalledTimes(1);
        });

        it('does not auto-edit when no group is pending', () => {
            setup({ pendingEditGroupId: null });
            expect(screen.getByTestId('group-card-g1')).toHaveAttribute('data-auto-edit', 'false');
        });
    });

    describe('armed feedback wiring (spec 059, T036: B2/B3/B4/B1)', () => {
        // Contract (see retrospective/SortableCard.test.tsx header): armedTargetId / insertionLine /
        // busyTargetId use the dnd id format `card:<id>`; the list only has to render inside the
        // context, each SortableCard reads it. Wrapper = the element that holds the card's content.
        const wrapperOf = (id: string) => screen.getByTestId(`card-${id}`).closest('.space-y-3 > *') as HTMLElement;

        it('B2: nothing armed and no line before the dwell (armedTargetId null)', () => {
            setup({ armedTargetId: null, insertionLine: null });
            expect(document.querySelector('[data-group-target]')).toBeNull();
            expect(document.querySelector('[data-insertion-line]')).toBeNull();
            expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
        });

        it('B3: arms exactly the targeted card ("card:u2") and shows one "Drop to group" badge', () => {
            setup({ armedTargetId: 'card:u2' });
            expect(wrapperOf('u2')).toHaveAttribute('data-group-target', 'armed');
            expect(wrapperOf('u1')).not.toHaveAttribute('data-group-target');
            expect(document.querySelectorAll('[data-group-target="armed"]')).toHaveLength(1);
            expect(screen.getAllByText('retrospective.dragGroup.dropToGroup')).toHaveLength(1);
        });

        it('B4: clearing armedTargetId removes the feedback from the list', () => {
            const view = setup({ armedTargetId: 'card:u2' });
            expect(document.querySelector('[data-group-target="armed"]')).not.toBeNull();
            view.rerender(
                <ColumnGroupingContext.Provider value={{ ...view.ctx, armedTargetId: null } as never}>
                    <DndContext>
                        <ColumnItemList {...(view.props as never)} />
                    </DndContext>
                </ColumnGroupingContext.Provider>
            );
            expect(document.querySelector('[data-group-target]')).toBeNull();
        });

        it('B1: draws the insertion line only on the targeted card, on the given edge', () => {
            setup({ insertionLine: { itemId: 'card:u1', edge: 'after' } });
            expect(wrapperOf('u1')).toHaveAttribute('data-insertion-line', 'after');
            expect(wrapperOf('u2')).not.toHaveAttribute('data-insertion-line');
            expect(document.querySelectorAll('[data-testid="insertion-line"]')).toHaveLength(1);
        });

        it('B5: marks only the busy target aria-busy', () => {
            setup({ busyTargetId: 'card:u2' });
            expect(wrapperOf('u2')).toHaveAttribute('aria-busy', 'true');
            expect(wrapperOf('u1')).not.toHaveAttribute('aria-busy', 'true');
        });
    });
});

/**
 * T062 (ColumnItemList half, spec 059, US3 B5b): adding a card to a group must update the
 * group IN PLACE. The slot (and the group inside it) keeps its identity, so GroupCard's
 * collapsed/expanded state and its animation survive the add; the group simply receives the
 * extra member. (GroupCard itself is stubbed in this file: its collapsed-after-add and count
 * assertions live in GroupCard.test.tsx.)
 */
describe('ColumnItemList: a card added to a group (spec 059, T062)', () => {
    const extra = card('gm2', 0, { groupId: 'g1', groupOrder: 2 });
    const grownGroups: CardGroup[] = [{ ...groups[0], memberCardIds: ['gm', 'gm2'] }];
    const grownCards = [...cards.filter((c) => c.id !== 'u2'), extra, card('u2', 30)];

    const rerenderGrown = (view: ReturnType<typeof setup>) => {
        const items = buildColumnItems(grownCards, grownGroups, COLUMN);
        const ctx = {
            ...view.ctx, items, groups: grownGroups,
            ungroupedCards: grownCards.filter((c) => !c.groupId),
        };
        view.rerender(
            <ColumnGroupingContext.Provider value={ctx as never}>
                <DndContext>
                    <ColumnItemList {...({ ...view.props, items, cards: grownCards } as never)} />
                </DndContext>
            </ColumnGroupingContext.Provider>,
        );
    };

    it('hands the group its extra member on rerender', () => {
        const view = setup();
        expect(screen.getByTestId('group-card-g1')).toHaveAttribute('data-member-ids', 'gh,gm');

        rerenderGrown(view);

        expect(screen.getByTestId('group-card-g1')).toHaveAttribute('data-member-ids', 'gh,gm,gm2');
    });

    it('keeps the SAME group element mounted (no remount, so a collapsed group stays collapsed)', () => {
        const view = setup();
        const before = screen.getByTestId('group-card-g1');

        rerenderGrown(view);

        expect(screen.getByTestId('group-card-g1')).toBe(before);
        expect(before.isConnected).toBe(true);
    });

    it('does not render the added card as a column item of its own', () => {
        const view = setup();

        rerenderGrown(view);

        expect(screen.queryByTestId('card-gm2')).not.toBeInTheDocument();
        expect(screen.getAllByTestId(/^group-card-/)).toHaveLength(1);
    });

    it('keeps the group droppable (registered sortable id group:g1) after the add', () => {
        const view = setup();
        vi.mocked(useSortable).mockClear();

        rerenderGrown(view);

        const groupCall = vi.mocked(useSortable).mock.calls.map((c) => c[0]).find((a) => a.id === 'group:g1');
        expect(groupCall).toBeDefined();
        expect(groupCall!.disabled).toEqual(expect.objectContaining({ draggable: true }));
    });
});
