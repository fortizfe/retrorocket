# Phase 0 Research: Anonymous Typing Indicator

## §1. Where does `isAnonymous` already reach the typing indicator's call site?

**Decision**: Read the board's anonymity from `GroupableColumn.tsx`'s
existing `isAnonymousBoard` local (`retrospective?.isAnonymous === true`,
derived from `useBoardData()`'s `retrospective`), and pass it straight into
`<TypingPreview isAnonymous={isAnonymousBoard} />` alongside the existing
`typingUsers` prop.

**Rationale**: `GroupableColumn.tsx` is the *only* call site of
`TypingPreview` in the codebase (confirmed by a project-wide search for
`TypingPreview` usages). It already computes `isAnonymousBoard` from
`BoardDataContext` for an unrelated purpose (FR-004/FR-010 of feature
051-anonymous-board-mode, gating "group by user" display). `BoardDataContext`
is already populated by `useRetrospectiveRealtimeSync`, which already parses
`isAnonymous` off the realtime `Retrospective` payload
(`useRetrospectiveRealtimeSync.ts:181`). No new context, no new prop chain
beyond the one hop into `TypingPreview`, and no new realtime plumbing: the
live-update requirement (User Story 3 / SC-003) is already satisfied by the
existing mechanism feature 051 built for exactly this purpose — a React
re-render with the new `isAnonymous` value flows straight into
`formatTypingText`'s branch the next time `TypingPreview` renders, with no
added latency.

**Alternatives considered**:
- *Have `TypingPreview` read `BoardDataContext` itself* — rejected: couples a
  small, reusable, presentation-only component (`src/lib/components/ui/*`) to
  a board-specific context it doesn't otherwise depend on, breaking the
  Single-Responsibility boundary the component currently has (Constitution
  Principle IV). Passing a prop keeps `TypingPreview` a pure function of its
  inputs, which is also how its existing `typingUsers` prop already works.
- *Introduce a new `useTypingAnonymity()` hook* — rejected: no second call
  site exists to justify the abstraction (Constitution Principle V, YAGNI);
  a boolean prop is the simplest solution that satisfies the confirmed
  requirement.

## §2. How should the generic message vs. named message be formatted, and where?

**Decision**: Keep `formatTypingText(typingUsers: TypingIndicator[])` as the
single formatting function inside `TypingPreview.tsx`, but give it an
`isAnonymous: boolean` parameter. When `true`, it returns the translated
`typing.anonymous` string unconditionally (ignoring `typingUsers.length`
beyond the existing `=== 0` empty-string case). When `false`, it keeps its
current three-way branch (`typing.single` / `typing.double` / `typing.multiple`)
— but now sourced from `useLanguage()`'s `t()` instead of inline Spanish
template literals.

**Rationale**: This is the minimal-diff change that satisfies FR-002/FR-003/
FR-004: one function, one new boolean parameter, same call sites (the visible
card's text and the screen-reader live region both already call
`formatTypingText` — the live region calls it with the live `typingUsers`
array and the card calls it with the frozen `displayedUsers`; both must
receive the same `isAnonymous` value, so the live-region/visible-card parity
already guaranteed by the existing code (research note in the component,
`display "..." está escribiendo` comment) automatically extends to the
anonymous case with zero additional wiring — see the existing two-step
`displayedUsers`/`isPresent` transition logic in `TypingPreview.tsx`, which is
unaffected by this change (FR-007: no other behavior changes).

**Alternatives considered**:
- *Compute the final text in `GroupableColumn.tsx` and pass a pre-formatted
  string into `TypingPreview`* — rejected: moves i18n/formatting
  responsibility out of the component that owns it, would require
  `GroupableColumn.tsx` to import `useLanguage` and duplicate pluralization
  logic it has no other reason to know about, and breaks the existing unit
  tests that assert on `TypingPreview`'s own formatting logic in isolation
  (`TypingPreview.test.tsx`).

## §3. Should the generic message vary with typist count?

**Decision** (per 2026-08-18 clarification): No. `typing.anonymous` is a
single, count-invariant string ("Un usuario está escribiendo" / "A user is
typing") used whenever `isAnonymous` is `true` and `typingUsers.length > 0`,
regardless of whether 1, 2, or more people are typing.

**Rationale**: Showing "varios usuarios" (several users) when 2+ are typing
would leak a bit of information a board owner enabling anonymous mode did not
ask to leak — in a small board, "someone is typing" vs. "several people are
typing" can itself narrow down identity when cross-referenced with an online-
participants list. Always-singular is both the simplest implementation (no
new branch, no new locale keys beyond one) and the strongest privacy
guarantee, satisfying FR-004 and Constitution Principle V (Simplicity).

**Alternatives considered**:
- *Singular vs. plural without an exact count* ("Un usuario está escribiendo"
  vs. "Varios usuarios están escribiendo") — considered and explicitly
  rejected during clarification in favor of the stronger, simpler guarantee.
- *Exact count* ("3 usuarios están escribiendo") — never seriously
  considered; directly defeats the anonymity goal (edge case flagged in
  spec.md).

## §4. What happens to the avatar cluster when anonymous?

**Decision** (per 2026-08-18 clarification): The avatar cluster
(`displayedUsers.slice(0, 3).map(...)` initials block and its `+N` overflow
badge) is not rendered at all when `isAnonymous` is `true`. The card shows
only the generic text and the existing animated typing dots.

**Rationale**: Each avatar today renders `user.username.charAt(0)` as visible
text and sets `title={user.username}` (a hover tooltip) — both are direct
identity leaks, the exact thing this feature closes. Substituting a generic
placeholder icon was considered but rejected: it adds a second visual variant
to maintain for no functional gain, and even a "neutral" icon repeated N times
could still leak the typist count (contradicting §3's decision) unless
capped/faked, which is unnecessary complexity for a card that already
communicates "someone is typing" through text.

**Alternatives considered**:
- *Generic non-identifying icon per typist* — rejected by the user during
  clarification (adds a maintained visual variant, and repeating it N times
  reintroduces a count leak the text itself avoids).

## §5. i18n: reuse existing unused keys, or introduce new ones?

**Decision**: Wire up the three existing-but-unused keys
(`typing.single`/`typing.double`/`typing.multiple`, present in both
`en.json` and `es.json` already) into `TypingPreview.tsx` via
`useLanguage()`'s `t()`, replacing the current inline Spanish template
literals. Add one new key, `typing.anonymous`, to both locale files.

**Rationale**: Per the 2026-08-18 clarification, the constitution's
"Internationalization" standard (`src/locales/*.json` via `i18next`, no
hardcoded strings) applies to this change, and the cheapest way to satisfy it
is to finally use the keys that were already defined for this exact purpose
but never wired up — this is a pure bug fix to a pre-existing inconsistency,
not new surface area. The Spanish values already match the current hardcoded
text exactly (verified: `es.json`'s `typing.single` is
`"{{username}} está escribiendo"`, identical to the current inline string),
so the existing Playwright assertions on the literal Spanish text
(`retrospective-board.spec.ts`, `/está escribiendo/` regex matches) continue
to pass unchanged for the non-anonymous path — only the anonymous path is new
assertion surface.

**New key values**:
- `en.json`: `"typing": { "anonymous": "A user is typing", ... (existing three, unchanged) }`
- `es.json`: `"typing": { "anonymous": "Un usuario está escribiendo", ... (existing three, unchanged) }`

**Alternatives considered**:
- *Keep the hardcoded Spanish string, add nothing to i18n* — rejected during
  clarification (perpetuates a pre-existing constitution inconsistency and
  leaves the feature without English support, unlike every other user-facing
  string in the app).

## §6. Accessibility: does removing the avatar cluster affect the live region?

**Decision**: No change needed to the live region's structure
(`role="status"`, `aria-live="polite"`, `aria-atomic="true"`, always mounted)
— only the text content it mirrors changes, via the same `formatTypingText`
call already shared between the visible card and the live region.

**Rationale**: The avatar cluster (`title={user.username}` tooltips) was
never part of the accessible name/description exposed by the live region —
screen readers already only announce the live region's text content, which
is `formatTypingText`'s output. Removing the visual avatars in anonymous mode
therefore removes a *visual-only* identity leak (the initial letter + hover
tooltip) without touching any accessibility-relevant markup, satisfying FR-005
with zero additional work beyond §2's shared-function change.

**Alternatives considered**: None — this is a direct consequence of the
existing architecture (visible card and live region already share one
formatting function), not an independent design decision.
