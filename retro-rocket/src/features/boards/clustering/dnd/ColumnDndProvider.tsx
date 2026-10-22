import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    closestCorners,
    pointerWithin,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import DraggableCard from '@/features/boards/retrospective/components/DraggableCard';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import type { Card } from '@/features/boards/types/card';
import { GroupingConflictError } from '@/features/boards/clustering/hooks/useCardGroups';
import type { MoveCardResult, MoveTarget } from '@/features/boards/types/card';
import { ColumnGroupingContext, DragFeedbackStoreContext, DragIntentRefContext, IDLE_DRAG_FEEDBACK, createDragFeedbackStore, useColumnGroupingBase } from './ColumnGroupingContext';
import type { ColumnGroupingContextValue } from './ColumnGroupingContext';
import { buildDragAnnouncements } from './dragAnnouncements';
import { useDragIntent } from './useDragIntent';

/**
 * Drop / spring-back animation (animate skill, spec 059 T046). Gate: occasional (a release
 * outside the column, or any drop), purpose = spatial consistency: the overlay visibly travels
 * back to where the card lives instead of vanishing. dnd-kit animates the overlay with a CSS
 * transform transition, so the cheapest tool is its `dropAnimation` option (no extra library).
 * Strong ease-out (entering its final slot), 200 ms (under the 300 ms UI cap). Under reduced
 * motion it is `null`: the overlay is removed instantly, with no travel.
 */
const DROP_ANIMATION = { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' } as const;

/**
 * T077 `review-animations` findings for spec 059 (applied / reviewed):
 *  - Menu panel exit (CardGroupingMenu): enter and exit were both 150 ms. A closing menu is
 *    a system response to a choice already made, so the exit now snaps (100 ms, same strong
 *    ease-out); enter keeps 150 ms with scale(0.95)+translateY(4px)+opacity from the
 *    trigger-anchored transform-origin (never scale(0), not a modal).
 *  - Member insert (GroupCard): the stagger was `min(index * 60 ms, 300 ms)` + 200 ms, so a
 *    card dropped into a group with 5+ members only finished appearing after ~500 ms, i.e.
 *    the drop's confirmation lagged the gesture. Now `min(index * 40 ms, 120 ms)` (inside
 *    the 30-80 ms stagger band), so the worst case is 320 ms and the usual 1-2 members land
 *    at once. `x` is a framer shorthand but one-shot and short.
 *  - Armed target (SortableCard): CSS `scale` + `transition: scale 180ms` (retargets from the
 *    live value, interruptible, composes with dnd-kit's `transform`), opacity-only veil/badge
 *    keyframes (150 ms strong ease-out). Removal is instant so a target change leaves no ghost.
 *    Reduced motion: scale and badge scale dropped (`useReducedMotion` / `motion-safe:`);
 *    ring, veil and badge stay, opacity being the gentle channel. Unchanged.
 *  - Armed target (GroupCard): the 1.02 scale is a framer `scale` shorthand on a `layout`
 *    root. Reviewed and kept: it runs once per deliberate dwell (not per frame) and the root
 *    already owns `transform`, so there is no cheaper non-conflicting channel. Reduced motion
 *    drops it (`useReducedMotion`).
 *  - Insertion line: intentionally unanimated (retargets tens of times per drag; easing would
 *    only add lag). Approved.
 *  - Slot cross-fade (ColumnItemList): opacity + framer layout on the slot (never on the
 *    dnd-kit element), 180 ms strong ease-out, popLayout so no height jump. Interruptible.
 *    Reduced motion: the app-root `MotionConfig reducedMotion="user"` strips the layout
 *    transform, opacity stays. Approved.
 *  - DragOverlay: lift is a spring on the full `transform` string (gesture motion), the drop
 *    animation is 200 ms strong ease-out and `null` under reduced motion. Approved.
 *  - GroupTitleEditor: deliberately no motion (direct manipulation, instant swap). Approved.
 *  - Reduced motion verified for every item above: framer motion via MotionConfig, the CSS
 *    scale and DragOverlay via `useReducedMotion`, keyframes via `motion-safe:` / opacity only.
 *
 * T078 performance: live drag feedback (armed / insertion / busy) lives in a
 * `DragFeedbackStore`, not in the context value. A context value that changes per intent
 * transition re-rendered the whole column (every card, group and slot, re-measuring each
 * framer layout slot). Items now subscribe to their own slice (`useItemDragFeedback`), so a
 * transition re-renders only the old and new armed item; pointer-move frames inside one zone
 * never reach React (useDragIntent only sets state on an actual intent change).
 * Verified by test/features/boards/clustering/dnd/ColumnDndProvider.perf.test.tsx.
 */

const CARD_PREFIX = 'card:';
const SECTION_PREFIX = 'section:';
/** Grouped (head/member) drag sources: `member:<cardId>`, dragged with useDraggable (US6, T066). */
const MEMBER_PREFIX = 'member:';

interface SortableData {
    containerId?: string | number;
    index: number;
    items: Array<string | number>;
}

export interface ColumnDndProviderProps {
    /** Full-section reorder used in mode `user` (`/cards/reorder`), confined to one author section. */
    onCardsReorder?: (updates: Array<{ cardId: string; order: number; column?: string }>) => Promise<void>;
    /** Classes for the column-wide droppable surface that wraps `children`. */
    className?: string;
    children: React.ReactNode;
}

/**
 * Pointer drags: the item under the pointer wins (pointerWithin), falling back to the
 * nearest centre when the pointer is in a gap. Keyboard drags have no pointer, so they
 * keep the sortable-friendly closestCorners the column used before (spec 059, research §1).
 */
const intentCollision: CollisionDetection = (args) => {
    if (args.pointerCoordinates) {
        const within = pointerWithin(args);
        return within.length > 0 ? within : closestCenter(args);
    }
    return closestCorners(args);
};

/** `card:<id>` / `group:<id>` of a move target: the sortable (ColumnItem) id. */
const dndIdOf = (target: MoveTarget): string | null =>
    target.kind === 'card' ? `${CARD_PREFIX}${target.cardId}` : target.kind === 'group' ? `group:${target.groupId}` : null;

const sortableOf = (data: unknown): SortableData | undefined =>
    (data as { sortable?: SortableData } | undefined)?.sortable;

/** The column-wide catch-all droppable: "below the items" resolves to the end of the column. */
const ColumnSurface: React.FC<{ columnId: string; className?: string; children: React.ReactNode }> = ({ columnId, className, children }) => {
    const { setNodeRef } = useDroppable({ id: `column:${columnId}`, data: { type: 'column' } });
    return (
        <div ref={setNodeRef} className={className}>
            {children}
        </div>
    );
};

/**
 * Owns the column's single DndContext (spec 059, T030, research §1/§5/§6): sensors,
 * collision, the lift-motion DragOverlay, intent tracking, screen-reader announcements and
 * drop resolution. Moved here from DragDropColumn so cards and groups share ONE drag
 * context per column.
 *
 * Intents at release: `reorder` resolves to `requestMove(src, {position})`; `group` (the
 * dragged card dwelled 180 ms in an item's centre, B3) resolves to
 * `requestMove(src, {card T | group G})` and the created group's title opens for editing
 * (B5). A release while still `pendingGroup` (under 180 ms) falls back to a nearest-edge
 * reorder, so a fast fly-over over an item's centre still reorders (SC-002).
 * The provider also publishes the live drag state (armed target, insertion line, busy
 * target) to SortableCard through a nested ColumnGroupingContext.
 * In mode `user` a drop inside a `section:*` container takes the legacy full-section
 * `onCardsReorder` path, confined to the same container (B8).
 */
export const ColumnDndProvider: React.FC<ColumnDndProviderProps> = ({ onCardsReorder, className, children }) => {
    const outer = useColumnGroupingBase();
    const { columnId, groupingEnabled, items, ungroupedCards, requestMove, computeOrder } = outer;
    const { t } = useLanguage();
    const [busyTargetId, setBusyTargetId] = React.useState<string | null>(null);
    const [activeCard, setActiveCard] = React.useState<Card | null>(null);
    const [liveMessage, setLiveMessage] = React.useState('');

    const { intent, intentRef, handlers, reset, toggleKeyboardIntent } = useDragIntent({ groupingEnabled });
    const reducedMotion = useReducedMotion();

    // B6: outside the column the pointer shows `not-allowed` (no indicator anywhere). Driven by
    // the intent, so it is restored on drag end/cancel (reset), when the pointer re-enters an
    // item, and on unmount (effect cleanup).
    const isOutside = intent.kind === 'outside';
    React.useEffect(() => {
        if (!isOutside) return;
        document.body.style.cursor = 'not-allowed';
        return () => {
            document.body.style.cursor = '';
        };
    }, [isOutside]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        // Keyboard operability of drag & drop (FR-018 / Constitution VIII):
        // arrow keys move a grabbed card; Space/Enter grabs and drops.
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const itemsRef = React.useRef(items);
    itemsRef.current = items;

    const accessibility = React.useMemo(() => {
        const getLabel = (id: string | number): string => {
            const item = itemsRef.current.find((i) => i.id === id);
            if (!item) return '';
            if (item.kind === 'card') return item.card.content;
            return item.group.title?.trim() || t('retrospective.groupCard.defaultGroupTitle');
        };
        return buildDragAnnouncements(t, getLabel, () => intentRef.current);
    }, [t, intentRef]);

    const resolveSectionReorder = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeSortable = sortableOf(active.data.current);
        const overSortable = sortableOf(over?.data.current);
        if (!over || !activeSortable || !overSortable || !onCardsReorder) return;
        // Confined to the author section: a drop in another section or outside is ignored.
        if (activeSortable.containerId !== overSortable.containerId) return;
        const ids = overSortable.items.map(String);
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
        const byId = new Map(ungroupedCards.map((c) => [`${CARD_PREFIX}${c.id}`, c]));
        void onCardsReorder(
            arrayMove(ids, oldIndex, newIndex).map((id, index) => ({
                cardId: id.startsWith(CARD_PREFIX) ? id.slice(CARD_PREFIX.length) : id,
                order: index,
                column: byId.get(id)?.column ?? columnId,
            })),
        ).catch((error: unknown) => console.error('Failed to reorder section cards:', error));
    };

    /** Drop on an armed target (B5/B5b): one atomic move, busy while pending, outcome announced. */
    const resolveGroupDrop = async (sourceCardId: string, target: MoveTarget) => {
        const targetDndId = dndIdOf(target);
        setBusyTargetId(targetDndId);
        try {
            const result: MoveCardResult | void = await requestMove(sourceCardId, target);
            let message = '';
            if (target.kind === 'position') {
                message = t('retrospective.dragGroup.a11y.removedFromGroup');
            } else if (result && result.createdGroupId) {
                message = t('retrospective.dragGroup.a11y.groupCreated');
            } else if (target.kind === 'group') {
                const group = itemsRef.current.find((i) => i.kind === 'group' && i.group.id === target.groupId);
                const label = group && group.kind === 'group' ? group.group.title?.trim() || t('retrospective.groupCard.defaultGroupTitle') : '';
                message = t('retrospective.dragGroup.a11y.addedToGroup', { label });
            }
            // One live-region update: a second message would overwrite the first.
            if (message && result && result.dissolvedGroupIds?.length) {
                message = `${message} ${t('retrospective.dragGroup.a11y.groupDissolved')}`;
            }
            if (message) setLiveMessage(message);
        } catch (error: unknown) {
            if (error instanceof GroupingConflictError) {
                // GroupableColumn already showed the toast; this is its screen-reader twin (X1).
                setLiveMessage(t('retrospective.dragGroup.conflict'));
            } else {
                console.error('Failed to group card:', error);
            }
        } finally {
            setBusyTargetId(null);
        }
    };

    const resolveColumnReorder = (event: DragEndEvent) => {
        const { active, over, activatorEvent } = event;
        const intent = intentRef.current;
        const isMember = String(active.id).startsWith(MEMBER_PREFIX);
        if (!over || !(isMember || String(active.id).startsWith(CARD_PREFIX))) return;
        if (intent.kind === 'none' || intent.kind === 'outside') return;
        // Keyboard drag: the member has no sortable index, so its edge comes from the intent.
        const isKeyboard = activatorEvent instanceof KeyboardEvent && !isMember;
        const sourceCardId = String(active.id).slice(isMember ? MEMBER_PREFIX.length : CARD_PREFIX.length);

        if (intent.kind === 'group') {
            void resolveGroupDrop(sourceCardId, intent.target);
            return;
        }

        const ids = itemsRef.current.map((i) => i.id as string);
        const activeId = String(active.id);
        const rest = ids.filter((id) => id !== activeId);
        const currentIndex = ids.indexOf(activeId);

        let overId: string;
        let edge: 'before' | 'after';
        if (isKeyboard) {
            // Keyboard drops use sortable indices: moving down lands after the item, up before it.
            overId = String(over.id);
            const overIndex = sortableOf(over.data.current)?.index ?? ids.indexOf(overId);
            const activeIndex = sortableOf(active.data.current)?.index ?? currentIndex;
            edge = overIndex > activeIndex ? 'after' : 'before';
        } else if (intent.kind === 'reorder') {
            overId = intent.overId;
            edge = intent.edge;
        } else if (intent.kind === 'pendingGroup') {
            // Released before the 180 ms dwell armed grouping: a fly-over, so reorder by nearest edge.
            overId = String(over.id);
            const dragged = active.rect.current.translated;
            edge = dragged && dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2 ? 'after' : 'before';
        } else {
            return;
        }

        let insertAt: number;
        if (overId.startsWith('column:')) {
            insertAt = rest.length; // catch-all below the items: end of the column
        } else {
            const overPos = rest.indexOf(overId);
            if (overPos < 0) return;
            insertAt = edge === 'before' ? overPos : overPos + 1;
        }
        // Dropping where it already sits is not a move: no write (a member is in no slot).
        if (!isMember && insertAt === currentIndex) return;

        const order = computeOrder({ beforeId: rest[insertAt - 1], afterId: rest[insertAt] });
        if (isMember) {
            // US6 D2/D6: ungroup the card at this slot; the dragged card is not in `items`.
            void resolveGroupDrop(sourceCardId, { kind: 'position', order });
            return;
        }
        void requestMove(sourceCardId, { kind: 'position', order })
            .then(() => setLiveMessage(t('retrospective.dragGroup.a11y.reordered', { position: insertAt + 1 })))
            .catch((error: unknown) => console.error('Failed to move card:', error));
    };

    // K3 (research §5): the `G` key toggles reorder <-> group. The document listener exists
    // ONLY for the duration of a keyboard drag (pointer drags never add one), and is removed
    // on end, cancel and unmount. It calls the latest closure through a ref, so the listener
    // identity stays stable for the whole drag.
    const keydownListenerRef = React.useRef<((event: KeyboardEvent) => void) | null>(null);
    const stopKeyListener = React.useCallback(() => {
        if (keydownListenerRef.current) {
            document.removeEventListener('keydown', keydownListenerRef.current);
            keydownListenerRef.current = null;
        }
    }, []);
    React.useEffect(() => stopKeyListener, [stopKeyListener]);

    const handleGKey = (event: KeyboardEvent) => {
        if ((event.key !== 'g' && event.key !== 'G') || event.ctrlKey || event.metaKey || event.altKey) return;
        const before = intentRef.current;
        toggleKeyboardIntent();
        const after = intentRef.current;
        if (after.kind === 'group' && before.kind !== 'group') {
            event.preventDefault();
            const overGroup = after.target.kind === 'group';
            const dndId = dndIdOf(after.target) ?? '';
            const found = itemsRef.current.find((i) => i.id === dndId);
            const label = !found ? '' : found.kind === 'card' ? found.card.content.slice(0, 40) : found.group.title?.trim() || t('retrospective.groupCard.defaultGroupTitle');
            setLiveMessage(t(overGroup ? 'retrospective.dragGroup.a11y.overGroupGroup' : 'retrospective.dragGroup.a11y.overTargetGroup', { label }));
        } else if (after.kind === 'reorder' && before.kind === 'group') {
            event.preventDefault();
            const ids = itemsRef.current.map((i) => i.id as string);
            setLiveMessage(t('retrospective.dragGroup.a11y.overTargetReorder', { position: ids.indexOf(after.overId) + 1, total: ids.length }));
        }
    };
    const handleGKeyRef = React.useRef(handleGKey);
    handleGKeyRef.current = handleGKey;

    const handleDragStart = (event: DragStartEvent) => {
        handlers.onDragStart(event);
        setLiveMessage('');
        stopKeyListener();
        if (event.activatorEvent instanceof KeyboardEvent) {
            const listener = (e: KeyboardEvent) => handleGKeyRef.current(e);
            keydownListenerRef.current = listener;
            document.addEventListener('keydown', listener);
        }
        const id = String(event.active.id);
        const rawId = id.startsWith(CARD_PREFIX) ? id.slice(CARD_PREFIX.length) : id;
        // Grouped sources carry their card in the draggable data (groups hold only ids).
        const memberCard = (event.active.data.current as { card?: Card } | undefined)?.card;
        setActiveCard(ungroupedCards.find((c) => c.id === rawId) ?? memberCard ?? null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        handlers.onDragEnd(event);
        stopKeyListener();
        setActiveCard(null);
        const containerId = sortableOf(event.active.data.current)?.containerId;
        if (typeof containerId === 'string' && containerId.startsWith(SECTION_PREFIX)) {
            resolveSectionReorder(event);
        } else if (event.over && event.over.id !== event.active.id) {
            resolveColumnReorder(event);
        }
        reset();
    };

    const handleDragCancel = (event: Parameters<typeof handlers.onDragCancel>[0]) => {
        handlers.onDragCancel(event);
        stopKeyListener();
        setActiveCard(null);
        reset();
    };

    // Live drag state for SortableCard / GroupCard (read through the optional context hook).
    const armedTargetId = intent.kind === 'group' ? dndIdOf(intent.target) : null;
    const insertionItemId = intent.kind === 'reorder' ? intent.overId : null;
    const insertionEdge = intent.kind === 'reorder' ? intent.edge : null;
    // Perf (T078): the feedback goes to a store, NOT into the context value, so a transition
    // re-renders only the items whose own slice changed (the old and the new armed item).
    const feedbackStore = React.useMemo(createDragFeedbackStore, []);
    React.useLayoutEffect(() => {
        feedbackStore.set({
            armedTargetId,
            insertionLine:
                insertionItemId && insertionEdge && !insertionItemId.startsWith('column:')
                    ? { itemId: insertionItemId, edge: insertionEdge }
                    : IDLE_DRAG_FEEDBACK.insertionLine,
            busyTargetId,
        });
    }, [feedbackStore, armedTargetId, insertionItemId, insertionEdge, busyTargetId]);
    const dragContext = React.useMemo<ColumnGroupingContextValue>(
        () => ({ ...outer, announce: setLiveMessage }),
        [outer],
    );

    return (
        <DragIntentRefContext.Provider value={intentRef}>
            <DndContext
                sensors={sensors}
                collisionDetection={intentCollision}
                accessibility={accessibility}
                onDragStart={handleDragStart}
                onDragMove={handlers.onDragMove}
                onDragOver={handlers.onDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <ColumnSurface columnId={columnId} className={className}>
                    <DragFeedbackStoreContext.Provider value={feedbackStore}>
                        <ColumnGroupingContext.Provider value={dragContext}>{children}</ColumnGroupingContext.Provider>
                    </DragFeedbackStoreContext.Provider>
                </ColumnSurface>

                {/* Portalled to document.body: the overlay is position:fixed, and the column panel
                    has `backdrop-blur`, whose backdrop-filter makes it the containing block for fixed
                    descendants (the overlay would be offset by the column origin). Theme classes live
                    on <html>, so the portal inherits them. */}
                {createPortal(
                <DragOverlay dropAnimation={reducedMotion ? null : DROP_ANIMATION}>
                    {activeCard ? (
                        // Tactile lift (feedback + spatial consistency, research.md §4,
                        // Direction C's "shadow intensifies while dragging" choice): a
                        // spring, not a tween — this is gesture motion, and a spring
                        // carries the grab's felt weight instead of a mechanical ease.
                        <motion.div
                            initial={{ transform: 'scale(1) translateY(0px)' }}
                            animate={{ transform: 'scale(1.03) translateY(-4px)' }}
                            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
                        >
                            <DraggableCard card={activeCard} isDragging={true} />
                        </motion.div>
                    ) : null}
                </DragOverlay>,
                document.body,
                )}

                {/* Polite live region for outcomes the provider announces itself (dnd-kit's own
                    region carries pick-up/over/cancel). */}
                <div role="status" aria-live="polite" className="sr-only" data-testid="column-drag-live-region">
                    {liveMessage}
                </div>
            </DndContext>
        </DragIntentRefContext.Provider>
    );
};

export default ColumnDndProvider;
