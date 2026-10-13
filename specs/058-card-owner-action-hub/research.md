# Research: Card Owner Action Hub

**Feature**: 058-card-owner-action-hub | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

All findings below come from the current code (RetroRocket v1.31.0). The Technical Context has no open NEEDS CLARIFICATION items.

---

## §1 Overlay foundation: reuse `useBoardMenuOverlay`

- **Decision**: Build `OwnerActionMenu` on `src/features/boards/retrospective/hooks/useBoardMenuOverlay.ts` with `role: 'menu'` and `placement: 'top-end'`. Render it as `FloatingPortal` → `FloatingFocusManager` → a plain positioning `div` (the Floating UI ref/styles and the ARIA role) wrapping an inner `motion.div` (animation only).
- **Rationale**: Every board menu already uses this hook: `CardMenu`, `ColorPicker`, the facilitator menu and the topbar menus. It already gives us:
  - `flip` and `shift` (FR-014);
  - a `size` middleware that caps the height to the space available (FR-014: never beyond the viewport);
  - `autoUpdate` while open, so the panel stays anchored on scroll and resize (spec edge case "Click outside / scroll");
  - `useDismiss`, which closes on Escape and on outside press (FR-013).

  The two-node split is mandatory. Putting both on one node lets Framer Motion's `transform` overwrite Floating UI's positioning (documented regression in features 034, 037 and 039; see the header comments of `CardMenu.tsx` and `ColorPicker.tsx`).
- **Placement**: `top-end`, not the `top-start` in the HU. The trigger is right-aligned in the footer, so `top-end` grows the panel up and to the left over the card's own body instead of off the card's right edge. Opening upward avoids covering the next card. `flip` falls back to `bottom-end` near the top of the viewport.
- **Alternatives considered**: Hand-rolled positioning was rejected because the codebase consolidated away from it (feature 033). A bottom sheet (Proposal C) was rejected in clarification Q1.

## §2 "One menu at a time" and closing on drag

- **Decision**: No new global state. `useDismiss`'s outside-press already closes an open panel when the user presses any other control, including another card's trigger, the facilitator `CardMenu` or a drag handle. As a safeguard, `DraggableCard` passes `isDragging` (from `SortableCard`'s `useSortable().isDragging`, newly forwarded) to `OwnerActionMenu`, which closes itself and keeps the trigger inert while it is true.
- **Rationale**: This meets FR-013 and FR-015 with the dismissal behaviour that already exists (KISS, Principle V). Keyboard-started drags begin on the drag handle, which takes focus away from the panel and closes it.
- **Alternatives considered**: A board-level "open menu id" context was rejected as extra state with no behaviour the hook doesn't already provide.

## §3 ARIA pattern and keyboard model

- **Decision**: WAI-ARIA **menu** pattern.
  - **Trigger**: `button` with `aria-haspopup="menu"` and `aria-expanded` (both from `useRole`), plus a localized `aria-label`.
  - **Panel**: `role="menu"`, labelled by the trigger. It contains:
    - `menuitem` "Edit card";
    - a `group` labelled "Change colour" holding 15 `menuitemradio` swatches, the current one with `aria-checked="true"`;
    - a `separator`;
    - `menuitem` "Delete card".
  - **Confirming delete**: the panel's children are replaced by a short message (`id` referenced by `aria-describedby` on Confirm) and two `menuitem`s, Confirm and Cancel. The message sits in an `aria-live="assertive"` region so entering the state is announced (FR-020).
  - **Keys**:
    - Up/Down moves between the top-level items (Edit, the colour group, Delete). Inside the colour grid, Left/Right/Up/Down move between swatches (roving `tabIndex`, the same technique as `ColorPicker.handleStripKeyDown`).
    - Home/End go to the first and last item.
    - Escape closes and returns focus to the trigger (`FloatingFocusManager returnFocus`).
    - Tab closes the panel and returns focus to the trigger. This is the WAI-ARIA menu convention and satisfies FR-019's "Tab MUST NOT escape the open panel to the rest of the board".
  - **Focus on open**: the first item ("Edit card") receives focus (`FloatingFocusManager initialFocus={0}`).
  - **Colour announcement**: selecting a colour announces "Colour changed to {name}" through a polite live region that lives in the card. It must stay mounted after the panel closes.
- **Rationale**: This matches the existing `useBoardMenuOverlay` default role (`menu`). It also avoids the `aria-required-children` violation that `ColorPicker` already hit (role duplicated on nested nodes): the role stays only on the positioning div.
- **Alternatives considered**: `role="dialog"` (what ColorPicker uses) is less precise for a list of actions and has no expected arrow-key semantics. Floating UI's `useListNavigation` was rejected because the 2-D swatch grid inside a 1-D menu needs custom handling anyway, and a ~30-line handler matches the existing ColorPicker code.

## §4 Colour section layout

- **Decision**: Show the 15 swatches as a **5 × 3 grid** in the panel. Swatches are 44px below 768px and 32px at 768px and above (spacing keeps 44px hit targets on mobile). The selected swatch carries a `Check` icon as well as its border, so selection is not shown by colour alone (Principle VIII). There is no detail/name row: each swatch's localized name is its accessible name and `title`.
- **Rationale**: A 15-item horizontal strip in a ~264px panel needs horizontal scrolling (today's `ColorPicker` uses `overflow-x-auto`). That is hard to discover in a menu, and 44px touch swatches make it worse. A grid fits within roughly 260px on mobile with no scrolling. Dropping the detail row keeps the panel compact on small cards, and names stay available to assistive technology (FR-007).
- **Reuse**: `getAvailableColors()`, `getColorConfig()` and `resolveCardColor()` from `src/lib/utils/cardColors.ts`, plus the existing `retrospective.card.colorPicker.*` name and aria-label keys. No palette change.
- **Alternatives considered**: Embedding the full `ColorPicker` panel (strip + detail) was rejected: horizontal scroll and the nested-overlay complexity. A swatch strip identical to `ColorPicker` was rejected for the same scroll problem.

## §5 Optimistic colour update and failure handling

- **Finding**: The colour change is **not** optimistic today. `handleColorChange` awaits `onUpdate` → `useOptimizedCards.updateCardFn` → `backendRetrospectiveClient.editCard`, and the card only repaints when the real-time sync returns the new value. Failures are only `console.error`'d, which breaks the constitution rule against silent failures.
- **Decision**: `DraggableCard` keeps a local `pendingColor: CardColor | null`. The card renders with `pendingColor ?? validateColor(card.color)`.
  - On selection: set `pendingColor`, then call `onUpdate(card.id, { color })`.
  - On success: clear `pendingColor` once `card.color` equals it (effect on `card.color`). This avoids a flash back to the old colour before sync arrives.
  - On rejection: clear `pendingColor`, which reverts, and show `toast.error(t('retrospective.card.ownerActions.colorError'))`.
- **Rationale**: Meets FR-008 (immediate update, revert on failure, localized error). `react-hot-toast` is already the app's notification mechanism (`useJoinRetrospective`, `useRetrospectiveRealtimeSync`), so no new dependency (Principle III).
- **Server**: No change. `PATCH /api/cards/:id` already allows only the owner (`FirestoreCardAdapter.editCard` → `ForbiddenError`). Real-time sync to other participants already exists.

## §6 Delete flow, busy state and failure

- **Decision**: The deletion state machine (`menu` → `confirmingDelete` → `deleting`) lives inside `OwnerActionMenu`, together with an `isDeleting` guard that ignores repeat activations (spec edge case "Repeated activation").
  - On Confirm: enter `deleting`, show a spinner and `aria-busy="true"` on the Confirm item, and await `onDelete()`.
  - On success: the card unmounts through the real-time sync, and `DragDropColumn`'s existing `AnimatePresence` plays the exit animation (`opacity` + `y`, 180ms).
  - On failure: return to `confirmingDelete` (so the user can retry or cancel), and show `toast.error(t('retrospective.card.ownerActions.deleteError'))`.
- **Moves**: `CardFooter` loses its `onEdit`, `onDelete` and `isDeleting` props. `DraggableCard.handleDelete` and `isDeleting` state move into the menu.
- **Server**: No change. `DELETE /api/cards/:id` already allows only the owner.

## §7 Focus after delete and after edit

- **Finding**: `DraggableCard`'s root `motion.div` (`data-testid="draggable-card"`) is not focusable. The column's add-card *input* exists only while its creation form is open, so the stable fallback target is the column's **"Add card" button** (`aria-label={t('retrospective.columns.add')}` in `GroupableColumn.tsx`).
- **Decision**:
  - **Pure helper** `getPostDeleteFocusTarget(cardEl: HTMLElement): HTMLElement | null` in `src/features/boards/retrospective/utils/postDeleteFocus.ts` (Principle II, unit-testable with plain DOM). It finds the nearest `[data-card-column]` ancestor, lists its `[data-card-focus-target]` cards in DOM order, and returns the next card, else the previous card, else the column's `[data-add-card-trigger]` button.
  - **Markup**: The card root gains `tabIndex={-1}`, `data-card-focus-target` and a `focus-visible` ring. It is programmatically focusable but not added to the Tab order. `GroupableColumn`'s root gains `data-card-column`, and its "Add card" button gains `data-add-card-trigger`.
  - **Timing**: The target is resolved **before** `onDelete` runs, while the DOM still has the card, and is focused after `onDelete` resolves.
  - **Edit return**: `DraggableCard` sets `restoreTriggerFocus = true` when edit mode ends (Save or Cancel). The `OwnerActionMenu` trigger, which remounts at that point, takes focus in a `useEffect` when that flag is set, and the flag is then cleared (spec US1 scenario 5).
- **Spec alignment**: Spec FR-012 and US1 scenario 7 now say the column's "add card" *control* instead of *input*, to match the real UI.
- **Alternatives considered**: Focusing the next card's owner trigger was rejected because non-owned cards have none, so the target would be inconsistent. Keeping a focus registry in `DragDropColumn` was rejected because it adds state across components for something the DOM already encodes.

## §8 Trigger icon, size and contrast

- **Icon**: `Settings2` from lucide-react, as proposed in the HU and already a project dependency. It is clearly different from the facilitator's `MoreVertical` (FR-005). The final choice is checked with the `apple-design` skill during implementation (Principle IX). If the skill recommends something else, the only binding constraint is that it is not a vertical-dots glyph.
- **Size**: `min-w-11 min-h-11` (44px) below `md`, and `md:min-w-9 md:min-h-9` (36px) at `md` (768px) and above. These are real dimensions, not pseudo-element hit-area expansion. With the facilitator `CardMenu` right next to it, expanded hit areas would overlap. The footer grows on mobile only, which the spec accepts.
- **Contrast**: The icon uses the `text-text-secondary` token. **Verification**: extend `src/test/lib/utils/cardColors.a11y.test.ts`, which already parses every card background for light and dark from `globals.css` and uses `contrastRatio` from `src/lib/theme/contrast.ts`, with an assertion that the trigger icon token meets ≥ 4.5:1 on all 15 backgrounds in both themes (SC-004, FR-021). If any pair fails, the token moves to `text-text-primary`, which the same test already proves passes on all 15.
- **Focus ring**: Reuse `focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1`, the same as `ColorPicker`. Its 3:1 non-text contrast is already covered by `contrast.focus.test.ts`.

## §9 Motion

- **Decision**: Panel enter/exit animates only `opacity` and `transform`, using full transform strings: `initial: { opacity: 0, transform: 'scale(0.95) translateY(4px)' }` → `animate: { opacity: 1, transform: 'scale(1) translateY(0px)' }`, over 150ms with `ease: [0.23, 1, 0.32, 1]`, and `transformOrigin` taken from the hook. The upward `translateY` sign matches the `top-end` placement. The confirm-delete swap is a 120ms opacity cross-fade inside the same panel, with no height animation, so nothing reflows outside the portal (FR-023).
- **Reduced motion**: Already handled app-wide. `src/App.tsx` wraps the app in `<MotionConfig reducedMotion="user">`, which turns off transform animation and keeps opacity for the panel and the existing card exit animation (FR-024). No extra code is needed, only a test.
- **Principle IX**: The `animate` skill makes and records the motion decisions during implementation. `review-animations` reviews the result before the PR. The PR description names both.
- **No layout shift**: The panel is portalled (`FloatingPortal`), so opening it cannot reflow the card. Removing the header `ColorPicker` and swapping the footer buttons for the trigger is a one-time static layout change, not a shift during interaction.

## §10 Grouped cards (clarification Q3)

- **Finding**: `GroupCard.tsx` renders member cards with the same `DraggableCard` (`canEdit={!isReadOnly}`). `GroupSuggestionModal` renders previews with `canEdit={false}`. `SelectableCard` passes `canEdit && !isGroupingMode`.
- **Decision**: Changing `DraggableCard` gives grouped member cards the hub automatically, and the existing `canEdit` inputs already hide it in grouping mode and in previews. No group-specific code is needed. Tests cover a grouped owned card and a suggestions-preview card.
- **Focus helper inside groups**: Group member cards still sit under the same `[data-card-column]` root, so post-delete focus moves to the next card in DOM order. This may be the next member of the same group or the next card in the column, which is the expected reading order.

## §11 `ColorPicker` stays

- **Finding**: `ColorPicker` is still used by the new-card form in `GroupableColumn.tsx` (line ~387) and by the dev-tools `ColorSystemTest`.
- **Decision**: Only the import in `DraggableCard` is removed. `ColorPicker.tsx` itself is unchanged (HU D5).

## §12 Test impact (existing suites)

| Suite | Impact |
|---|---|
| `src/test/features/boards/retrospective/CardFooter.test.tsx` | Edit/delete button cases (lines ~57–80) are rewritten: the footer now renders only timestamp, Save/Cancel and the `actions` slot. |
| `src/test/features/boards/retrospective/DraggableCard.test.tsx` | Cases that click `retrospective.card.editCard` / `deleteCard` (lines ~250–320) now open the hub first. New cases: owner/non-owner/`canEdit=false`/anonymous gating, no header ColorPicker, optimistic colour + revert, focus restore after edit. |
| `e2e/card-lifecycle.spec.ts`, `e2e/accessibility.spec.ts` | No existing selector targets the old edit/delete/colour controls, so no breakage expected. New scenarios are added (see quickstart). |
| `src/test/lib/utils/cardColors.a11y.test.ts` | Gains the trigger-icon contrast assertion (§8). |

## §13 Implementation design & motion decisions (T010/T011)

Produced by actually invoking `apple-design` and `emil-design-eng` (T010) and `animate` (T011) against this feature's concrete panel, per Principle IX. All decisions below stay inside FR-023's mandatory 120–200ms band, introduce no new dependency, and require no change to the props interface in `contracts/owner-action-menu.md`. Copy this section's header into `OwnerActionMenu.tsx`'s top comment per T010/T011's instructions.

### T010 — `apple-design` + `emil-design-eng`

- **Trigger icon**: `Settings2` (lucide-react) **confirmed**, 16px (`w-4 h-4`, matching `CardMenu`'s `MoreVertical` sizing so the two sibling triggers read as the same weight class), `text-text-secondary`. Rejected alternatives and why: `CircleEllipsis`/`MoreHorizontal` (dot family — the one explicit exclusion, confusable with the facilitator's `MoreVertical`); `Pencil`/`PenSquare`/`SquarePen` (imply edit-only, over-promising a scope the hub doesn't have — violates the "direct, specific labels" / familiarity principle); `Palette`/`Wand2` (imply colour-only or "magic", same scope mismatch); `Cog` (reads as app-level settings, a weaker "adjust this item" metaphor than sliders). `Settings2` is the only remaining candidate that is not dots, does not over-promise a single action, and reads as "controls for this card."
- **Panel material**: unchanged from §1/contract — `bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40`. Same material weight as `CardMenu`/`ColorPicker` (apple-design: material weight encodes hierarchy; this is a small transient control, not a heavier modal-class surface).
- **Panel layout** (menu convention — `p-2` outer padding, not the `p-4` dialog padding `CardMenu` uses, because this is a `role="menu"` list, not a form):
  - "Edit card" row: `menuitem`, icon `Edit2` (reused from today's footer button, not a new icon) 16px `text-text-secondary`, label `text-sm text-text-primary`; row `flex items-center gap-2 px-3 min-h-11 md:min-h-9 rounded-lg hover:bg-surface focus-visible:ring-2 focus-visible:ring-focus`.
  - Colour group label: `px-3 pt-2 pb-1 text-xs font-medium text-text-secondary uppercase tracking-wide` — a caption, not a dialog-style icon+`h4` header (that heavier treatment belongs to `CardMenu`'s one-off form).
  - Swatch grid: `grid grid-cols-5 gap-2 md:gap-1.5 px-3 pb-2`; swatches `w-11 h-11 md:w-8 md:h-8 rounded-full` (44/32px per §4). Selected swatch: `border-text-primary` ring **and** a `Check` icon overlay — never colour alone (WCAG).
  - Separator: `<div role="separator" className="mx-3 my-1 h-px bg-border-default/40" />` — a hairline inset from the panel's own border, not a full-bleed divider.
  - "Delete card" row: `menuitem`, `Trash2` 16px, icon **and** label both `text-error-fg font-medium`, same row sizing as Edit. Colour + icon + the separator's physical isolation = three independent destructive cues, never colour alone.
- **Confirm-state layout** (replaces the item list in place):
  - Message: `<p id={messageId} className="text-sm text-text-primary leading-snug px-3 py-2">`, inside an `aria-live="assertive"` wrapper, text from `ownerActions.deleteConfirmMessage`.
  - Buttons: reuse the shared `Button` primitive instead of inventing classes (Principle V; emil "extend tokens, don't fork them") — `variant="danger"` + `variant="ghost"`, `size="sm"`, is the project's own existing delete-confirmation idiom, already shipping in `BoardRow.tsx` and `ControlsTab.tsx`. Confirm: `<Button variant="danger" size="sm" loading={isDeleting} aria-describedby={messageId}>`. Cancel: `<Button variant="ghost" size="sm">`. Row: `flex gap-2 px-3 py-2`, Confirm then Cancel (FR-010's stated order).
  - Hierarchy: Confirm's solid `bg-red-700` fill (the project's documented fixed-danger exception, AA-verified in both themes) is deliberately the heavier of the two. This is not "make destructive the default" — it's that the user already made one deliberate choice (clicking "Delete card") to reach this state, so a bold, unambiguous Confirm is the correct "yes, I mean it" affordance (same pattern as `BoardRow.tsx`), while Cancel stays a quiet ghost button and remains just as easy to reach (`size="sm"`, same height).

### T011 — `animate`

- **Panel open/exit**: §9 defaults **confirmed, no change** — 150ms, `cubic-bezier(0.23, 1, 0.32, 1)` (the project's own strong ease-out; correct per the skill's easing table for an entering/exiting element), full transform strings `scale(0.95) translateY(4px)` → `scale(1) translateY(0px)` (never bare `scale(0)`; the translateY sign keeps the panel rising toward rest from a point nearer the trigger, matching `ColorPicker`/`CardMenu`'s own convention for their placements), `transformOrigin` from `floatingStyles.transformOrigin` (never hardcoded `center`). 150ms sits inside FR-023's 120–200ms band and matches `CardMenu`'s own popover duration. Exit mirrors entry exactly (symmetric path) — no asymmetric fast-exit, since this isn't a held gesture.
- **Confirm-state cross-fade**: 120ms, opacity-only, no transform, no height animation — **confirmed, no change**. Addition beyond §9's text: wrap the swap in its own nested `AnimatePresence mode="wait"` (separate from the panel's own outer open/exit `AnimatePresence`) so the option list fully exits (opacity → 0) before the confirm content enters (opacity → 1), rather than both being mounted at once — the two states briefly co-rendering is exactly the defect an opacity-only swap could otherwise introduce when their heights differ.
- **Trigger press feedback — deviation**: do **not** replicate `ColorPicker`'s `whileHover{scale:1.05}`/`whileTap{scale:0.95}` Framer Motion treatment. The trigger's real sibling in the footer is now `CardMenu`'s plain `<button>` (ColorPicker leaves the card entirely per §11) — CSS `hover:bg-surface` only, no scale motion. Giving two adjacent same-weight controls different motion treatments breaks visual parity. Use the cheapest tool that still satisfies "buttons must feel responsive": a plain CSS `active:scale-[0.97] transition-transform duration-150` on the trigger `<button>`, no `motion.button`, no `whileHover`. This is a deliberate deviation from the literal "whileTap like ColorPicker" framing in T011's task text, justified by matching the actual current sibling.
- **Colour swatches**: no per-swatch stagger on open — 15 swatches at the skill's 30–80ms/item band would take 450–1200ms, blowing past the 300ms UI ceiling and FR-023's 200ms cap. The grid enters as one unit with the panel fade. Swatch hover/selected feedback reuses `ColorPicker`'s existing CSS (`hover:scale-110`, `duration-150`, focus ring) for consistency with that still-shipping sibling; not re-litigated as a pointer-media-query gap here (pre-existing, out of this feature's scope).
- **Interruption**: all panel transitions are Framer Motion's declarative `animate` prop (tween, not spring). On re-trigger (same trigger toggled faster than 150ms, or card B opened while card A is still exiting), Framer Motion interpolates from the DOM's current live value automatically — no extra interruption-handling code needed; this already satisfies "retarget from current value, don't restart from zero" (`AnimatePresence`-driven `animate`/`exit` behaves like a transition here, not a keyframe).
- **Exit per dismissal path**:
  - Escape / outside click / action completed (Edit chosen, colour chosen) → standard 150ms exit, symmetric with entry; focus returns to the trigger (contract B4/B8).
  - `isDragging` becoming `true` → close **without** the exit animation (immediate unmount, no `AnimatePresence` exit), not a symmetric close. A drag start is a fast, physically-driven interrupt; the user's attention is on the card lifting off the board, not the menu (apple-design "Causality" — feedback must match what's actually happening), and Floating UI's `autoUpdate` may not keep the anchor correctly positioned mid-fast-drag anyway. Implementation: gate the render with `open && !isDragging` so it force-unmounts, rather than routing through the normal `setOpen(false)` close path.
  - Deletion in progress (`deleting`) → no exit while busy; the panel stays open, and only the card itself exits afterward via `DragDropColumn`'s existing `AnimatePresence` (opacity+y, 180ms) — unchanged.
- **Reduced motion**: confirmed sufficient with no extra code. The app-wide `<MotionConfig reducedMotion="user">` (`src/App.tsx`) strips the `transform` component of the panel's open/exit automatically under the OS/user preference, leaving only the opacity fade; the confirm-state swap is already opacity-only, so it needs no behaviour change at all. Satisfies FR-024 for both the panel and the (unchanged) card exit-on-delete animation.
