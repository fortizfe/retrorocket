import React, { useEffect, useRef, useState } from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Edit2, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardColor } from '@/features/boards/types/card';
import { getAvailableColors, getColorConfig } from '@/lib/utils/cardColors';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';
import Button from '@/lib/components/ui/Button';

/**
 * 058-card-owner-action-hub — design & motion decisions (T010/T011, condensed
 * from research.md §13; the full rationale lives there).
 *
 * Trigger icon: `Settings2` (lucide-react), 16px, `text-text-secondary`
 * (exported below as `OWNER_TRIGGER_ICON_TOKEN` so cardColors.a11y.test.ts
 * can't drift from the component — T024). Rejected: dot-family icons
 * (MoreHorizontal/CircleEllipsis — confusable with the facilitator's
 * MoreVertical, the one hard exclusion), Pencil/PenSquare/Palette/Wand2/Cog
 * (each over-promises a single action this hub doesn't have).
 *
 * Panel: same material weight as CardMenu/ColorPicker
 * (`bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border
 * border-border-default/40`), `p-2` menu padding (not CardMenu's `p-4`
 * dialog padding — this is a `role="menu"` list). Edit row reuses `Edit2`
 * (today's footer icon); colour group is a caption + `grid-cols-5` swatch
 * grid (44px below `md`, 32px at `md`+); separator is a hairline inset;
 * Delete row reuses `Trash2`, text + icon both `text-error-fg` (colour is
 * never the only destructive cue — WCAG). Confirm state swaps the item list
 * for a message + Confirm/Cancel controls rendered through the shared
 * `Button` component itself (`variant="danger"`/`"ghost"`, `size="sm"`,
 * `loading` on Confirm while deleting) — the project's existing
 * delete-confirmation idiom, reused rather than hand-copied (T019; the
 * `role="menuitem"`/`aria-busy`/`aria-describedby` contract passes straight
 * through `Button`'s prop spread onto its underlying `motion.button`).
 *
 * Motion: panel open/exit — 150ms, `cubic-bezier(0.23, 1, 0.32, 1)`, full
 * transform strings `scale(0.95) translateY(4px)` → `scale(1)
 * translateY(0px)`, `transformOrigin` from the hook (never hardcoded).
 * Confirm-state cross-fade — 120ms, opacity only, no height animation,
 * wrapped in its own nested `AnimatePresence mode="wait"` so the two states
 * never co-render. Trigger press feedback is a plain CSS
 * `active:scale-[0.97]` (not a `whileTap` Framer Motion treatment) to match
 * its real sibling, `CardMenu`'s plain button — a deliberate deviation from
 * ColorPicker's `whileHover`/`whileTap` convention. No per-swatch stagger
 * (15 items would blow past FR-023's 200ms cap). `isDragging` force-unmounts
 * the whole portal with no exit animation (gated at the `FloatingPortal`
 * level, not routed through `setOpen(false)`) — a drag start is a fast,
 * physically-driven interrupt, not a dismissal. Reduced motion needs no
 * extra code: the app-wide `<MotionConfig reducedMotion="user">` already
 * strips the `transform` component of every animation here.
 *
 * T029 `review-animations` findings (applied): the trigger's documented
 * `active:scale-[0.97]` press feedback was wired with `transition-colors`
 * only, so the only enabled transition-property was background-color —
 * `transform` was never in that list, meaning the press scale snapped
 * instead of transitioning. Fixed to an explicit
 * `transition-[background-color,transform]` (not `transition`/`transition-
 * all`, to keep the animated property list bounded). Also added
 * `transition-colors` to the Edit/Delete item rows, which had none — their
 * sibling `CardMenu` rows transition their hover background, so these
 * snapped out of step with that convention. Both fixes stay inside
 * FR-023 (bounded GPU properties, well under the 300ms UI ceiling) and
 * touch nothing outside this file. Reviewed and left unchanged: the
 * swatch grid's ungated `hover:scale-110` (reused verbatim from
 * `ColorPicker`, already flagged as a pre-existing, out-of-scope pointer-
 * media-query gap in research.md §13); the pre-existing card
 * exit-on-delete animation in `DraggableCard.tsx` (opacity+`y` shorthand,
 * 180ms, unchanged by this feature, already within FR-023/FR-024).
 *
 * T029 axe finding (confirming-delete state): any descendant of `role="menu"`
 * that carries a global ARIA attribute such as `aria-live` is checked by axe's
 * `aria-required-children` rule as an owned element, and a roleless `<p>` fails
 * it. Giving the message `role="menuitem"` silenced axe, but screen readers
 * would then announce a status sentence as a menu item. Instead, the visible
 * message is plain text that only describes Confirm (`aria-describedby`), and
 * the announcement comes from an always-mounted `aria-live="assertive"` region
 * rendered next to the trigger, outside the menu.
 */

/** Trigger icon colour token (FR-021, SC-004) — kept as a named export so
 * `cardColors.a11y.test.ts` (T024) asserts against the exact value this
 * component renders, rather than a hardcoded duplicate that could drift. */
export const OWNER_TRIGGER_ICON_TOKEN = 'text-text-secondary';

type MenuPhase = 'closed' | 'menu' | 'confirmingDelete' | 'deleting';

const SWATCH_COLUMNS = 5;

interface OwnerActionMenuProps {
    /** Used for element ids (aria-describedby etc.). */
    cardId: string;
    /** The colour currently shown on the card (optimistic value included). */
    color: CardColor;
    /** Enter edit mode. Called after the panel closes. */
    onEdit: () => void;
    /** Persist a new colour. The caller owns optimistic display + revert + error toast. */
    onColorChange: (color: CardColor) => void;
    /** Delete the card. Rejects on failure; the menu shows the error and returns to confirmingDelete. */
    onDelete: () => Promise<void>;
    /** True while the card is being dragged: forces the panel closed and the trigger inert. */
    isDragging?: boolean;
    /** When true on mount/update, the trigger takes focus once and then calls onFocusRestored. */
    restoreFocus?: boolean;
    onFocusRestored?: () => void;
}

const OwnerActionMenu: React.FC<OwnerActionMenuProps> = ({
    cardId,
    color,
    onEdit,
    onColorChange,
    onDelete,
    isDragging = false,
    restoreFocus = false,
    onFocusRestored,
}) => {
    const { t } = useLanguage();
    const [phase, setPhase] = useState<MenuPhase>('closed');
    const isDeletingInFlight = useRef(false);

    const open = phase !== 'closed';

    const { setOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        open,
        onOpenChange: (next) => setPhase(next ? 'menu' : 'closed'),
        placement: 'top-end',
        role: 'menu',
        disabled: isDragging || phase === 'deleting',
    });

    const triggerId = `owner-action-trigger-${cardId}`;
    const messageId = `owner-action-delete-message-${cardId}`;

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const setTriggerRef = (el: HTMLButtonElement | null) => {
        triggerRef.current = el;
        refs.setReference(el);
    };

    const editItemRef = useRef<HTMLButtonElement | null>(null);
    const deleteItemRef = useRef<HTMLButtonElement | null>(null);
    const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const colors = getAvailableColors();

    // A drag start is a fast, physically-driven interrupt (research.md §13,
    // T011) — force the panel closed immediately, not through the normal
    // dismiss path (which the `deleting` guard above would otherwise block
    // anyway, and which would play the ordinary exit animation).
    useEffect(() => {
        if (isDragging) setPhase('closed');
    }, [isDragging]);

    // Focus restore after edit mode ends (Save/Cancel) — the trigger, which
    // remounts at that point, takes focus once (data-model.md, DraggableCard
    // additions: `restoreTriggerFocus`).
    useEffect(() => {
        if (restoreFocus) {
            triggerRef.current?.focus();
            onFocusRestored?.();
        }
        // Only re-run when `restoreFocus` itself toggles — `onFocusRestored`
        // is expected to be a fresh closure on every render from the caller.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restoreFocus]);

    const handleEdit = () => {
        setOpen(false);
        onEdit();
    };

    const handleColorSelect = (next: CardColor) => {
        onColorChange(next);
        setOpen(false);
    };

    const handleDeleteRequest = () => {
        setPhase('confirmingDelete');
    };

    const handleCancelDelete = () => {
        setPhase('menu');
    };

    const handleConfirmDelete = async () => {
        if (isDeletingInFlight.current) return;
        isDeletingInFlight.current = true;
        setPhase('deleting');
        try {
            await onDelete();
            setOpen(false);
        } catch {
            toast.error(t('retrospective.card.ownerActions.deleteError'));
            setPhase('confirmingDelete');
        } finally {
            isDeletingInFlight.current = false;
        }
    };

    const focusSwatch = (index: number) => swatchRefs.current[index]?.focus();

    const getPosition = (target: EventTarget | null): 'edit' | 'delete' | number | null => {
        if (target === editItemRef.current) return 'edit';
        if (target === deleteItemRef.current) return 'delete';
        const index = swatchRefs.current.indexOf(target as HTMLButtonElement);
        return index === -1 ? null : index;
    };

    const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            setOpen(false);
            return;
        }

        if (phase !== 'menu') return;

        const position = getPosition(event.target);
        if (position === null) return;

        switch (event.key) {
            case 'Home':
                event.preventDefault();
                editItemRef.current?.focus();
                return;
            case 'End':
                event.preventDefault();
                deleteItemRef.current?.focus();
                return;
            case 'ArrowDown':
                event.preventDefault();
                if (position === 'edit') {
                    focusSwatch(0);
                } else if (position !== 'delete') {
                    const next = position + SWATCH_COLUMNS;
                    if (next < colors.length) focusSwatch(next);
                    else deleteItemRef.current?.focus();
                }
                return;
            case 'ArrowUp':
                event.preventDefault();
                if (position === 'delete') {
                    const lastRowStart = Math.floor((colors.length - 1) / SWATCH_COLUMNS) * SWATCH_COLUMNS;
                    focusSwatch(lastRowStart);
                } else if (position !== 'edit') {
                    const prev = position - SWATCH_COLUMNS;
                    if (prev >= 0) focusSwatch(prev);
                    else editItemRef.current?.focus();
                }
                return;
            case 'ArrowRight':
                if (typeof position !== 'number') return;
                event.preventDefault();
                if (position % SWATCH_COLUMNS !== SWATCH_COLUMNS - 1 && position + 1 < colors.length) {
                    focusSwatch(position + 1);
                }
                return;
            case 'ArrowLeft':
                if (typeof position !== 'number') return;
                event.preventDefault();
                if (position % SWATCH_COLUMNS !== 0) {
                    focusSwatch(position - 1);
                }
                return;
            default:
                return;
        }
    };

    return (
        <>
            <button
                ref={setTriggerRef}
                {...getReferenceProps()}
                id={triggerId}
                type="button"
                aria-label={t('retrospective.card.ownerActions.trigger')}
                title={t('retrospective.card.ownerActions.trigger')}
                className="min-w-11 min-h-11 md:min-w-9 md:min-h-9 inline-flex items-center justify-center rounded-lg hover:bg-surface transition-[background-color,transform] active:scale-[0.97] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
            >
                <Settings2 className={`w-4 h-4 ${OWNER_TRIGGER_ICON_TOKEN}`} />
            </button>

            {/* Announces the delete confirmation (FR-020). Always mounted so screen
                readers pick up the text change, and kept outside role="menu" so it is
                not counted as one of the menu's owned elements. */}
            <span aria-live="assertive" className="sr-only">
                {phase === 'confirmingDelete' ? t('retrospective.card.ownerActions.deleteConfirmMessage') : ''}
            </span>

            {!isDragging && (
                <FloatingPortal preserveTabOrder={false}>
                    <AnimatePresence>
                        {open && (
                            <FloatingFocusManager
                                context={context}
                                modal={false}
                                initialFocus={0}
                                returnFocus
                                guards={false}
                            >
                                {/* Positioning wrapper carries Floating UI's ref/style and the
                                    `role="menu"` ARIA attributes (from getFloatingProps). The
                                    nested motion.div below carries only the animation — putting
                                    both on one node lets Framer Motion's transform overwrite
                                    Floating UI's positioning (research.md §1).

                                    `guards={false}` here, plus `preserveTabOrder={false}` on the
                                    `FloatingPortal` above (T029, 058-card-owner-action-hub): with
                                    `modal={false}`, Floating UI renders TWO independent pairs of
                                    focus-guard `<span data-floating-ui-focus-guard>` elements —
                                    `FloatingFocusManager`'s own `data-type="inside"` pair (this
                                    prop) and `FloatingPortal`'s separate `data-type="outside"`
                                    pair (its own `preserveTabOrder` prop, default `true`,
                                    unrelated to this one). The T026 axe finding (tasks.md Notes)
                                    is specifically the `outside` pair — both are disabled here
                                    for the same reason: this panel already closes on Tab via the
                                    onKeyDown below and returns focus to the trigger
                                    (`returnFocus`), so nothing needs guard spans to redirect Tab
                                    order, and rendering them anyway trips axe's
                                    `aria-hidden-focus` rule (a focusable, aria-hidden node).
                                    Safe because `modal=false` already skips `markOthers`'s
                                    inert/aria-hidden pass on the rest of the page
                                    (@floating-ui/react's `FloatingFocusManager` source, `useInert`
                                    is only consulted when `modal` is true), so disabling both has
                                    no effect on anything outside this panel. */}
                                <div
                                    ref={refs.setFloating}
                                    // Explicit `role="menu"` (eslint-visible) in addition to
                                    // the one `getFloatingProps()` also provides — eslint
                                    // can't statically see through that spread, and this node
                                    // needs its own `onKeyDown` (Tab must close even when the
                                    // key event is dispatched directly on this element, not
                                    // only when it bubbles up from a descendant item).
                                    role="menu"
                                    tabIndex={-1}
                                    style={floatingStyles}
                                    {...getFloatingProps()}
                                    aria-labelledby={triggerId}
                                    onKeyDown={handlePanelKeyDown}
                                    className="z-[9999]"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, transform: 'scale(0.95) translateY(4px)' }}
                                        animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
                                        exit={{ opacity: 0, transform: 'scale(0.95) translateY(4px)' }}
                                        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                        style={{ transformOrigin: floatingStyles.transformOrigin }}
                                        className="bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40 w-[260px] max-h-[90vh] overflow-auto p-2"
                                    >
                                        <AnimatePresence mode="wait">
                                            {phase === 'menu' ? (
                                                <motion.div
                                                    key="items"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.12 }}
                                                >
                                                    <button
                                                        ref={editItemRef}
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={handleEdit}
                                                        className="w-full flex items-center gap-2 px-3 min-h-11 md:min-h-9 rounded-lg hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus text-left"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-text-secondary" />
                                                        <span className="text-sm text-text-primary">
                                                            {t('retrospective.card.ownerActions.edit')}
                                                        </span>
                                                    </button>

                                                    <div
                                                        role="group"
                                                        aria-label={t('retrospective.card.ownerActions.colorGroup')}
                                                    >
                                                        <p className="px-3 pt-2 pb-1 text-xs font-medium text-text-secondary uppercase tracking-wide">
                                                            {t('retrospective.card.ownerActions.colorGroup')}
                                                        </p>
                                                        <div className="grid grid-cols-5 gap-2 md:gap-1.5 px-3 pb-2">
                                                            {colors.map((swatchColor, index) => {
                                                                const swatchConfig = getColorConfig(swatchColor);
                                                                const isSelected = swatchColor === color;
                                                                return (
                                                                    <button
                                                                        key={swatchColor}
                                                                        ref={(el) => { swatchRefs.current[index] = el; }}
                                                                        type="button"
                                                                        role="menuitemradio"
                                                                        aria-checked={isSelected}
                                                                        aria-label={t(swatchConfig.ariaLabelKey)}
                                                                        title={t(swatchConfig.nameKey)}
                                                                        onClick={() => handleColorSelect(swatchColor)}
                                                                        className={`relative w-11 h-11 md:w-8 md:h-8 rounded-full ${swatchConfig.preview} border-2 transition-[transform,box-shadow,border-color] duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 ${isSelected ? 'border-text-primary scale-110' : 'border-border-default/60 hover:border-border-strong'}`}
                                                                    >
                                                                        {isSelected && (
                                                                            <Check
                                                                                className="absolute inset-0 m-auto w-4 h-4 text-text-primary drop-shadow-sm"
                                                                                strokeWidth={3}
                                                                            />
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div role="separator" className="mx-3 my-1 h-px bg-border-default/40" />

                                                    <button
                                                        ref={deleteItemRef}
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={handleDeleteRequest}
                                                        className="w-full flex items-center gap-2 px-3 min-h-11 md:min-h-9 rounded-lg hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus text-left"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-error-fg" />
                                                        <span className="text-sm text-error-fg font-medium">
                                                            {t('retrospective.card.ownerActions.delete')}
                                                        </span>
                                                    </button>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="confirm"
                                                    role="group"
                                                    aria-label={t('retrospective.card.ownerActions.delete')}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.12 }}
                                                >
                                                    {/* Plain text: no role, no aria-live (see the T029 note in the
                                                        top comment). It only describes Confirm; the announcement is
                                                        made by the live region outside role="menu". */}
                                                    <p
                                                        id={messageId}
                                                        className="text-sm text-text-primary leading-snug px-3 py-2"
                                                    >
                                                        {t('retrospective.card.ownerActions.deleteConfirmMessage')}
                                                    </p>
                                                    <div className="flex gap-2 px-3 py-2">
                                                        <Button
                                                            type="button"
                                                            role="menuitem"
                                                            variant="danger"
                                                            size="sm"
                                                            loading={phase === 'deleting'}
                                                            aria-busy={phase === 'deleting'}
                                                            aria-describedby={messageId}
                                                            onClick={handleConfirmDelete}
                                                        >
                                                            {phase === 'deleting'
                                                                ? t('retrospective.card.ownerActions.deleting')
                                                                : t('retrospective.card.ownerActions.deleteConfirm')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            role="menuitem"
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={phase === 'deleting'}
                                                            onClick={handleCancelDelete}
                                                        >
                                                            {t('retrospective.card.ownerActions.deleteCancel')}
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                            </FloatingFocusManager>
                        )}
                    </AnimatePresence>
                </FloatingPortal>
            )}
        </>
    );
};

export default OwnerActionMenu;
