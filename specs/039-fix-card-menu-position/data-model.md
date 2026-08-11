# Phase 1 Data Model: Card Actions Menu Anchored Positioning

This feature introduces **no new persisted entity, Firestore field, or collection**, and no change to any existing one. `Card`, the `onConvertToAction` callback chain, and everything the menu's contents read or write are unchanged in shape. The fix changes *how the panel is structured in the DOM* — not what it contains, what it does, or what data flows through it.

## Existing concept touched (structure only, not shape): CardMenu floating panel

Not a domain entity — the in-memory rendering structure of `CardMenu.tsx`'s open panel, corrected from one node to two:

| Element | Before (defect) | After (fix) |
|---|---|---|
| Positioning wrapper | Same node as the animated wrapper (`motion.div` carrying both `style={floatingStyles}` and `initial`/`animate`/`exit`) | A distinct, non-animated `<div ref={refs.setFloating} style={floatingStyles}>` — carries all Floating UI/ARIA wiring (`getFloatingProps()`, `aria-label`), never a Framer Motion prop |
| Animated wrapper | N/A (collapsed into the positioning node above) | A nested `motion.div`, owning only `initial`/`animate`/`exit`/`transition`, using full `transform` strings (not `scale`/`y` shorthand) — no Floating UI props, no duplicated `aria-label` |

This mirrors the identical structural correction already applied to `FacilitatorMenu.tsx` and `ColorPicker.tsx` (`research.md` §1, §3) — same two-node shape, same reason.

## Existing entities used (unchanged shape)

- **`Card`** (`src/features/boards/types/card.ts`) — `CardMenu` reads `card.id` to call `onConvertToAction`; not modified.
- **`Participant[]`** — populates the assignee `<select>`; not modified.
- **`useBoardMenuOverlay`'s return shape** (`open`, `setOpen`, `context`, `refs`, `floatingStyles`, `getReferenceProps`, `getFloatingProps`) — consumed identically to today; the hook itself is not modified by this feature (`research.md` §2).

## Explicitly unchanged

- The `onConvertToAction(cardId, assignedTo?, assignedToName?, dueDate?)` callback signature and every call site.
- The menu's visible content (assignee select, due-date picker, convert/cancel buttons) and copy — no new or removed UI element.
- `useBoardMenuOverlay.ts` itself — no prop, option, or return-value change.
- Every other `useBoardMenuOverlay` consumer (`RetrospectiveTopbar.tsx`, `FacilitatorMenu.tsx`, `ColorPicker.tsx`, `ColumnHeaderMenu.tsx`) — none are touched by this feature.
