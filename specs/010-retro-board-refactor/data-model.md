# Phase 1 Data Model: Retrospective Board Refactor

This feature is a **behavior-preserving UI refactor**: it introduces **no
persistence/schema changes** and no new Firestore collections or fields. The
existing domain types are reused unchanged. The "model" here is therefore the
**component & prop boundaries** created by the refactor — the contract each new
or decomposed unit exposes.

## Reused domain entities (unchanged)

Defined in `src/features/boards/types/`. No modification in this feature.

- **Retrospective** (`retrospective.ts`): board/session. Fields used by the board:
  `id`, `createdBy` (facilitator check), column configuration source.
- **Card** (`card.ts`): `id`, `content` (may contain URLs and line breaks),
  `column`, `createdBy`, `createdAt`, `votes`, `color`, `reactions`
  (`EmojiReaction[]` → grouped into `GroupedReaction[]`).
- **GroupedReaction** (`card.ts`): `{ emoji, count, users }` — display shape for
  reaction badges.
- **EmojiReaction** (`card.ts`): the emoji token.
- **ColumnConfig / DynamicColumnConfig** (`retrospective.ts` /
  `useRetrospectiveColumns`): `id`, `title`, `description`, `icon`, `color`.
- **ActionItem** (`actionItem.ts`), **Participant** (`participant.ts`): unchanged.

## New / refactored component boundaries

### Presentation components (extracted)

| Component | Responsibility (single) | Key inputs (props) | Emits |
|-----------|-------------------------|--------------------|-------|
| `ReactionBadge` | Render one existing-reaction pill with count + tooltip | `reaction: GroupedReaction`, `isMine: boolean`, `disabled?` | `onToggle(emoji)` |
| `ReactionPicker` | Floating-UI-anchored emoji category grid | `anchorRef`, `open`, `activeCategory`, `userReaction`, `disabled?` | `onSelect(emoji)`, `onRemove()`, `onClose()` |
| `CardHeader` | Author identity + card menu slot | `authorName`, `menu?: ReactNode` | — |
| `CardVoteControl` | Vote up/down + count | `votes: number`, `canVoteDown: boolean` | `onVote(increment)` |
| `CardContent` | Wrapped, linkified card text | `content: string`, `editing`, `className?` | (edit handled by parent) |
| `CardFooter` | Timestamp (locale-aware) + edit/delete actions | `createdAt`, `canEdit`, `isEditing`, `isDeleting` | `onEdit()`, `onDelete()`, `onSave()`, `onCancel()` |

### Hooks (Library-First logic units)

| Hook | Responsibility | Signature (shape) |
|------|----------------|-------------------|
| `useEmojiPicker` | Open state, Floating-UI position, dismissal, selection wiring | `useEmojiPicker({ disabled }) → { open, setOpen, refs, floatingStyles, getReferenceProps, getFloatingProps, ...interactions }` |
| `useBoardGridColumns` *(optional)* | Map visible column count → safe grid definition | `useBoardGridColumns(count: 3 \| 4) → { className?, style? }` |

### Validation / invariants (enforced by contracts, not persistence)

- `CardContent` MUST wrap any token; it never widens beyond its container
  (`min-w-0` ancestry) — verified by test, not by data validation.
- `ReactionPicker` MUST report a computed position that is anchored to
  `anchorRef` (never the initial `{top:0,left:0}`) before it is visible.
- `useBoardGridColumns` MUST only ever yield literal, non-purgeable grid
  definitions for the supported counts (3, 4).
- Locale-aware date in `CardFooter` MUST derive from the active i18next language,
  not a hardcoded locale.

## State transitions

Only transient UI state (no persisted lifecycle changes):

- **Reaction picker**: `closed → open` (trigger click) → `closed` (select /
  Escape / outside-click / scroll-dismiss if configured). While `open`,
  position auto-updates on scroll/resize (stays anchored).
- **Card**: `view ↔ editing` (unchanged from current behavior).

## Removed entities (dead code)

No domain entities removed. Removed **components** (not data):
`EnhancedRetrospectiveBoard`, `RetrospectiveCard`, `RetrospectiveColumn` and
their tests — confirmed zero non-test references.
