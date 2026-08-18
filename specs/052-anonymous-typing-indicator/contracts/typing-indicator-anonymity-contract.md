# Contract: `TypingPreview` anonymity behavior

Governs `src/lib/components/ui/TypingPreview.tsx` and its single call site,
`src/features/boards/clustering/components/GroupableColumn.tsx`. Traces to
spec.md FR-001 through FR-007 and SC-001/SC-002/SC-003.

## Props contract

```ts
interface TypingPreviewProps {
    typingUsers: TypingIndicator[];
    className?: string;
    isAnonymous: boolean; // NEW — required, no default
}
```

`GroupableColumn.tsx` MUST pass its existing `isAnonymousBoard` value
(`retrospective?.isAnonymous === true`) as `isAnonymous`. No other call site
exists; if one is added later, it MUST also supply this prop explicitly
(TypeScript enforces this — the prop is required, not optional).

## Rendering contract — visible card

| Given | When | Then |
|---|---|---|
| `typingUsers = []` | any `isAnonymous` | No card renders (`AnimatePresence` shows nothing); live region text is `''`. (Unchanged from today.) |
| `typingUsers.length === 1`, `isAnonymous = false` | card renders | Text is `t('typing.single', { username: typingUsers[0].username })`; avatar cluster shows that one typist's initial. (Matches current behavior exactly.) |
| `typingUsers.length === 2`, `isAnonymous = false` | card renders | Text is `t('typing.double', { username1, username2 })`; avatar cluster shows both initials. |
| `typingUsers.length >= 3`, `isAnonymous = false` | card renders | Text is `t('typing.multiple', { username: typingUsers[0].username, count: typingUsers.length - 1 })`; avatar cluster shows first 3 initials + `+N` badge. |
| `typingUsers.length >= 1`, `isAnonymous = true` | card renders | Text is `t('typing.anonymous')` **regardless of count**; avatar cluster (initials block and `+N` badge) is **not rendered at all** — no DOM node for it. |

## Rendering contract — screen-reader live region

The `role="status"` / `aria-live="polite"` / `aria-atomic="true"` `<span>`
MUST always be present in the DOM (unchanged) and MUST contain exactly the
same text the visible card would show for the current `typingUsers`/
`isAnonymous` pair — i.e. it calls the same `formatTypingText` function with
the same arguments, not a separately-maintained string. This is required so
FR-005 (screen-reader parity with the anonymity rule) holds automatically
rather than needing independent verification of two code paths.

## Transition contract (live toggle, User Story 3)

| Given | When | Then |
|---|---|---|
| Card visible with a named typist (`isAnonymous` was `false`) | The board's `isAnonymous` becomes `true` (no page reload) | On the next render, the card's text becomes `t('typing.anonymous')` and the avatar cluster unmounts. No change to the card's mount/exit animation timing — only its internal content changes while it stays mounted (assuming `typingUsers` is still non-empty). |
| Card visible with the generic message (`isAnonymous` was `true`) | The board's `isAnonymous` becomes `false` | On the next render, the card's text becomes the appropriate named variant and the avatar cluster (re)appears. |

This is a pure consequence of `TypingPreview` being a function of its props
— no new effect, subscription, or timer is introduced to satisfy this row;
it is covered by existing React re-render semantics once `isAnonymous` is
threaded through (research.md §1).

## Non-goals (explicitly out of contract, FR-007)

- Card appearance/disappearance timing (the existing `displayedUsers`/
  `isPresent` two-step exit-freeze logic) is unchanged by this contract.
- Per-column independence (each column's `TypingPreview` instance receives
  its own `typingUsers`) is unchanged.
- The typing *dots* animation is unchanged in both modes.
- Self-typing visibility rules (whether a user sees their own typing
  reflected back) are unchanged — this contract only governs identity text,
  not whether the indicator shows at all for a given viewer.
