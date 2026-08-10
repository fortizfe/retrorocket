# Phase 1 Data Model: Neutral Default Card Color

This feature does not add, remove, or change any persisted entity, field, or relationship. It changes only which value a local UI form pre-selects before a `Card` is created. The existing entities are documented below for completeness/traceability, with the one behavior-relevant note called out.

## Card (existing — `src/features/boards/types/card.ts`)

| Field | Type | Notes |
|---|---|---|
| `color` | `CardColor?` (optional) | **Unchanged shape.** What changes is *only* the value that the add-card form's local `selectedColor` state is initialized/reset to before a user submits — from a column-derived `CardColor` (via `getSuggestedColorForColumn`) to the fixed neutral default (`getDefaultColor()` → `'pastelWhite'`). Once persisted, `Card.color` behaves exactly as before (rendered, exported, editable via the existing `ColorPicker`). |

## CreateCardInput (existing — `src/features/boards/types/card.ts`)

| Field | Type | Notes |
|---|---|---|
| `color` | `CardColor?` (optional) | Unchanged. Still populated from whatever `selectedColor` is at submit time — manually chosen or left at the (now neutral) default. |

## Column (existing — `DynamicColumnConfig`)

No field changes. `column.title` / `column.id` are still passed around, but after this change they are no longer read by `GroupableColumn.tsx` for the purpose of deriving a card's default color (they remain in use for column identity, filtering, headers, etc.).

## State transitions

None. No new lifecycle or state machine is introduced. This is a single local-state default-value change (`useState` initializer + two reset points) inside `GroupableColumn.tsx`, described fully in `research.md` Decision 2.
