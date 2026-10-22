import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { MutableRefObject } from 'react';
import type { Card, CardGroup, MoveCardResult, MoveTarget } from '@/features/boards/types/card';
import type { ColumnItem, Placement } from './columnOrder';
import type { DragIntent } from './dragIntent';

/**
 * Per-column grouping/drag context (spec 059, data-model.md § ColumnGroupingContext,
 * research.md §12). GroupableColumn provides it; ColumnDndProvider, ColumnItemList and
 * (in later tasks) GroupCard, the card menus and the title editor consume it, so that a
 * drop, a menu pick and a reorder all go through the same `requestMove` path.
 */
export interface ColumnGroupingContextValue {
    columnId: string;
    /** False in `user` mode: no group intent, no member handles, no menu (FR-010, B8). */
    groupingEnabled: boolean;
    /** Ungrouped cards and groups of the column, interleaved in display order. */
    items: ColumnItem[];
    groups: CardGroup[];
    ungroupedCards: Card[];
    /**
     * Live drag state, published by ColumnDndProvider through a nested provider (the
     * GroupableColumn value carries inert defaults). All three use the sortable/ColumnItem id
     * format: `card:<id>` / `group:<id>`.
     * `armedTargetId`: the group-intent target (renders the armed feedback).
     */
    armedTargetId: string | null;
    /** The reorder intent on an item: where its 2px insertion line is drawn. */
    insertionLine: { itemId: string; edge: 'before' | 'after' } | null;
    /** The group target while its `requestMove` is pending (`aria-busy`). */
    busyTargetId: string | null;
    /** Group whose title should open in edit mode on this client only (auto-edit after create). */
    pendingEditGroupId: string | null;
    consumePendingEdit: () => void;
    /** The single orchestration path for drop, menu and reorder. */
    requestMove: (sourceCardId: string, target: MoveTarget) => Promise<MoveCardResult | void>;
    /**
     * Synchronous order for an insertion between two neighbours (midpoint, b-1, a+1). When
     * the precision guard trips it starts the column renormalisation itself and returns the
     * order computed on the renormalised items; `requestMove` waits for that write first.
     */
    computeOrder: (placement: Placement) => number;
    /**
     * Pushes a message into the column's polite live region. Provided by ColumnDndProvider's
     * nested context (spec 059, T061); optional because GroupableColumn's own value (and test
     * doubles) have no region. Consumers (CardGroupingMenu) must work without it.
     */
    announce?: (message: string) => void;
}

export const ColumnGroupingContext = createContext<ColumnGroupingContextValue | null>(null);

/**
 * Live drag feedback (armed target, insertion line, busy target), kept OUT of the context
 * value on purpose (spec 059, T078): a context value that changes per intent transition
 * re-renders every consumer, i.e. every card and group of the column. ColumnDndProvider
 * owns one store per column; items subscribe to just their own slice through
 * `useItemDragFeedback`, so a transition re-renders only the items whose slice changed.
 */
export interface DragFeedbackState {
    armedTargetId: string | null;
    insertionLine: { itemId: string; edge: 'before' | 'after' } | null;
    busyTargetId: string | null;
}

export const IDLE_DRAG_FEEDBACK: DragFeedbackState = { armedTargetId: null, insertionLine: null, busyTargetId: null };

export interface DragFeedbackStore {
    subscribe: (listener: () => void) => () => void;
    getState: () => DragFeedbackState;
    /** Replaces the state; a no-op (no notification) when nothing changed. */
    set: (next: DragFeedbackState) => void;
}

export function createDragFeedbackStore(): DragFeedbackStore {
    let state = IDLE_DRAG_FEEDBACK;
    const listeners = new Set<() => void>();
    return {
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getState: () => state,
        set: (next) => {
            const same =
                next.armedTargetId === state.armedTargetId &&
                next.busyTargetId === state.busyTargetId &&
                next.insertionLine?.itemId === state.insertionLine?.itemId &&
                next.insertionLine?.edge === state.insertionLine?.edge;
            if (same) return;
            state = next;
            listeners.forEach((listener) => listener());
        },
    };
}

export const DragFeedbackStoreContext = createContext<DragFeedbackStore | null>(null);

const noopSubscribe = () => () => undefined;

/**
 * The column's STATIC grouping context (never re-renders on drag feedback): what cards,
 * groups, menus and the item list use. Throws outside a GroupableColumn: a missing provider
 * is a programming error.
 */
export function useColumnGroupingBase(): ColumnGroupingContextValue {
    const value = useContext(ColumnGroupingContext);
    if (!value) throw new Error('useColumnGroupingContext must be used within a ColumnGroupingContext provider');
    return value;
}

/**
 * The full context INCLUDING the live drag feedback. Subscribes to the whole store, so only
 * use it where a re-render per intent transition is acceptable (tests, one-off probes);
 * items use `useItemDragFeedback`, everything else `useColumnGroupingBase`.
 */
export function useColumnGroupingContext(): ColumnGroupingContextValue {
    const base = useColumnGroupingBase();
    const store = useContext(DragFeedbackStoreContext);
    const live = useSyncExternalStore(store ? store.subscribe : noopSubscribe, store ? store.getState : () => IDLE_DRAG_FEEDBACK);
    return useMemo(() => (store ? { ...base, ...live } : base), [base, live, store]);
}

/** Non-throwing variant of the STATIC context for components that may render outside a column. */
export function useOptionalColumnGroupingContext(): ColumnGroupingContextValue | null {
    return useContext(ColumnGroupingContext);
}

export interface ItemDragFeedback {
    isArmed: boolean;
    isBusy: boolean;
    insertionEdge: 'before' | 'after' | null;
}

/**
 * What the item `dndId` (`card:<id>` / `group:<id>`) shows right now. The snapshot is a small
 * string, so useSyncExternalStore re-renders the item only when ITS armed/busy/insertion
 * state changes. Without a store (a column rendered outside ColumnDndProvider, test doubles)
 * it derives the same answer from the context value's own fields.
 */
export function useItemDragFeedback(dndId: string): ItemDragFeedback {
    const base = useContext(ColumnGroupingContext);
    const store = useContext(DragFeedbackStoreContext);
    const keyOf = (s: DragFeedbackState): string =>
        `${s.armedTargetId === dndId ? 'a' : '-'}${s.busyTargetId === dndId ? 'b' : '-'}${s.insertionLine?.itemId === dndId ? s.insertionLine.edge : '-'}`;
    const key = useSyncExternalStore(
        store ? store.subscribe : noopSubscribe,
        () => keyOf(store ? store.getState() : base ?? IDLE_DRAG_FEEDBACK),
    );
    return useMemo(
        () => ({
            isArmed: key[0] === 'a',
            isBusy: key[1] === 'b',
            insertionEdge: key.endsWith('before') ? 'before' : key.endsWith('after') ? 'after' : null,
        }),
        [key],
    );
}

/**
 * The live drag intent, exposed as a ref (not state) so the sorting strategy can read it
 * on every call without re-rendering the whole list on each pointer move. Provided by
 * ColumnDndProvider; absent outside a drag context.
 */
export const DragIntentRefContext = createContext<MutableRefObject<DragIntent> | null>(null);

const IDLE_INTENT_REF: MutableRefObject<DragIntent> = { current: { kind: 'idle' } };

/** The provider's intent ref, or a permanently idle one (plain vertical-list behaviour). */
export function useDragIntentRef(): MutableRefObject<DragIntent> {
    return useContext(DragIntentRefContext) ?? IDLE_INTENT_REF;
}
