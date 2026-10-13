# UI Contract: `OwnerActionMenu` and affected card components

**Feature**: 058-card-owner-action-hub | **Date**: 2026-10-12

This is a frontend-only feature, so there are no new HTTP or real-time contracts. The contracts below are the component interfaces and the accessibility contract that the tests assert.

## 1. `OwnerActionMenu` (new)

**Location**: `retro-rocket/src/features/boards/retrospective/components/OwnerActionMenu.tsx`

```ts
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
```

**Rendering preconditions (the caller's responsibility)**: the caller renders this component only when `canEditCard && !isEditing`. The component does not re-check ownership (single gate, FR-001).

**Behavioural guarantees**

| # | Guarantee | Spec |
|---|---|---|
| B1 | The trigger is always visible at rest. No `opacity-0`/hover/focus-within gating. | FR-003 |
| B2 | Activating the trigger (click, tap, Enter, Space) opens the panel; focus moves to "Edit card". | FR-006, FR-019 |
| B3 | "Edit card" → panel closes → `onEdit()` is called once. | FR-009 |
| B4 | Swatch → `onColorChange(color)` is called once → panel closes → focus returns to the trigger. | FR-008 |
| B5 | "Delete card" → `confirmingDelete`. `onDelete` is **not** called. | FR-010 |
| B6 | Confirm → `deleting` → `onDelete()` is called exactly once, even on repeated activation. | FR-011 |
| B7 | `onDelete` rejects → `toast.error(ownerActions.deleteError)` and back to `confirmingDelete`. | FR-011 |
| B8 | Escape / Tab / outside press close the panel (except in `deleting`) and return focus to the trigger. | FR-013, FR-019 |
| B9 | `isDragging` becoming true closes the panel. | FR-013 |
| B10 | Only `opacity` + `transform` are animated, over 120–200ms. Reduced motion → opacity only, through the app `MotionConfig`. | FR-023, FR-024 |

## 2. Accessibility contract (asserted by unit + e2e tests)

| Element | Role / attributes |
|---|---|
| Trigger | `<button type="button">`, `aria-label={t('retrospective.card.ownerActions.trigger')}`, `aria-haspopup="menu"`, `aria-expanded`, visible `focus-visible` ring, 44×44px below 768px, ≥36×36px at 768px and above |
| Panel (positioning div) | `role="menu"`, `aria-labelledby` = trigger. Role **only** on this node, never on the nested `motion.div` |
| Edit | `role="menuitem"`, name `ownerActions.edit`, ≥44px tall below 768px |
| Colour group | `role="group"`, `aria-label={ownerActions.colorGroup}` |
| Swatch ×15 | `role="menuitemradio"`, `aria-checked` (exactly one true), name = localized colour aria-label, check icon on the selected one |
| Separator | `role="separator"` |
| Delete | `role="menuitem"`, name `ownerActions.delete`, destructive styling (`text-error-fg`) plus an icon, not colour alone |
| Confirm message | `aria-live="assertive"`, referenced by Confirm's `aria-describedby` |
| Confirm / Cancel | `role="menuitem"`. Confirm gets `aria-busy="true"` and shows the `ownerActions.deleting` label while deleting |
| Card live region | `aria-live="polite"` on the card (outside the panel), announces `ownerActions.colorChanged` |

**Keyboard**: Up/Down moves between items. Inside the colour grid, arrow keys move in 2-D (5 columns). Home/End go to the first and last item. Enter or Space activates. Escape and Tab close.

## 3. `CardFooter` (changed)

```ts
interface CardFooterProps {
    createdAt?: Date;
    /** Owner may edit (renders Save/Cancel while editing). */
    canEdit: boolean;
    isEditing: boolean;
    canSave: boolean;
    onSave: () => void;
    onCancel: () => void;
    /** Trailing controls: OwnerActionMenu and/or the facilitator CardMenu. */
    actions?: React.ReactNode;
}
```

- **Removed props**: `onEdit`, `onDelete`, `isDeleting`.
- **Removed rendering**: the `Edit2` / `Trash2` buttons.

## 4. `DraggableCard` (changed)

- Removes the header `ColorPicker` block. The drag handle stays where it was and keeps its hover/focus reveal (HU D4).
- Adds a new prop `isSortableDragging?: boolean`, forwarded from `SortableCard` (`useSortable().isDragging`) through `SelectableCard` and passed to `OwnerActionMenu` as `isDragging`. It is a separate prop from the existing `isDragging`, which styles the drag-overlay copy.
- Footer `actions` = `[OwnerActionMenu if canEditCard && !isEditing]` + `[CardMenu if canConvertToAction && onConvertToAction && !isEditing]`, in that order, `gap-1`.
- Root `motion.div` gains `tabIndex={-1}`, `data-card-focus-target` and a `focus-visible` ring.

## 5. `getPostDeleteFocusTarget` (new pure helper)

**Location**: `retro-rocket/src/features/boards/retrospective/utils/postDeleteFocus.ts`

```ts
/** Next card in the same column → previous card → the column's add-card trigger → null. */
export function getPostDeleteFocusTarget(cardEl: HTMLElement): HTMLElement | null;
```

## 6. `GroupableColumn` (changed, markers only)

- Root `div` gains `data-card-column`.
- The "Add card" `Button` gains `data-add-card-trigger`.

## 7. Unchanged (must not be modified)

- `CardMenu.tsx`: facilitator convert-to-action (FR-016).
- `ColorPicker.tsx`: still used by the new-card form.
- `useBoardMenuOverlay.ts`, the server, `firestore.rules` and every API contract.
