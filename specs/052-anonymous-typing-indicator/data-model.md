# Phase 1 Data Model: Anonymous Typing Indicator

This feature introduces **no new persisted entity, field, or Firestore
schema change**. `Retrospective.isAnonymous` already exists (feature
051-anonymous-board-mode) and is already synced to every connected client.
The only "model" changes are at the presentation layer: one component prop
and two locale-key additions.

## Existing entities reused (unchanged)

### `Retrospective.isAnonymous: boolean`

Source of truth for whether a board is in anonymous mode. Already defined in
`src/features/boards/types/retrospective.ts`, already parsed off the
realtime payload by `useRetrospectiveRealtimeSync.ts`, already exposed via
`BoardDataContext`, and already read in `GroupableColumn.tsx` as
`isAnonymousBoard`. This feature reads that same derived value — it does not
add a new read path.

### `TypingIndicator`

```ts
interface TypingIndicator {
    userId: string;
    username: string;
    column: ColumnType;
    lastActivity: Date;
}
```

Unchanged (`src/features/boards/types/typing.ts`). `username` continues to be
present on every element regardless of anonymity mode — anonymity is a
*display-time* concern (consistent with feature 051's approach to
`Card.createdBy`/`createdByName`, per its data-model.md), not a data
suppression concern. `TypingPreview` simply stops reading `username` off
these objects when `isAnonymous` is `true`.

## Component-level "model" (presentation layer)

### `TypingPreviewProps` (extended)

| Field | Type | Change | Description |
|---|---|---|---|
| `typingUsers` | `TypingIndicator[]` | unchanged | Typists currently active in this column. |
| `className` | `string?` | unchanged | Existing styling hook. |
| `isAnonymous` | `boolean` | **new, required** | Whether the owning board currently has anonymous mode enabled. When `true`, `TypingPreview` renders only the generic, count-invariant message and suppresses the avatar cluster; when `false`, it renders exactly as it does today. |

`isAnonymous` is required (not optional/defaulted) so that every call site
must explicitly decide the value rather than silently defaulting to the
non-anonymous (identity-revealing) behavior — the safer failure mode for a
privacy-sensitive prop is a TypeScript compile error at the call site, not a
silent default. `GroupableColumn.tsx` is the only call site and already has
the value on hand (research.md §1).

### `formatTypingText` (internal, extended signature)

```ts
function formatTypingText(
    typingUsers: TypingIndicator[],
    isAnonymous: boolean,
    t: TFunction // from useLanguage()
): string
```

Not exported; internal to `TypingPreview.tsx`. Behavior (see
research.md §2/§3 for rationale):

| `typingUsers.length` | `isAnonymous` | Output |
|---|---|---|
| `0` | any | `''` (unchanged) |
| `1` | `false` | `t('typing.single', { username })` |
| `2` | `false` | `t('typing.double', { username1, username2 })` |
| `≥3` | `false` | `t('typing.multiple', { username, count })` |
| `≥1` | `true` | `t('typing.anonymous')` |

## Locale keys (extended)

`src/locales/en.json` and `src/locales/es.json`, existing `typing` namespace:

```jsonc
"typing": {
  "single": "{{username}} is typing",                 // existing key, now wired up
  "double": "{{username1}} and {{username2}} are typing", // existing key, now wired up
  "multiple": "{{username}} and {{count}} more are typing", // existing key, now wired up
  "anonymous": "A user is typing"                      // NEW
}
```

(Spanish `es.json` mirrors the same four keys with the values already
documented in research.md §5.)

## State transitions

None — this feature adds no state machine. The only "transition" is the
existing real-time propagation of `Retrospective.isAnonymous` (feature 051,
unchanged) causing `GroupableColumn.tsx` to re-render with a new
`isAnonymousBoard` value, which flows into `TypingPreview`'s `isAnonymous`
prop on the next render — no new subscription, timer, or effect is
introduced.
