# Phase 1 Contract: Grouping-Mode-Switch Teardown

Documents the observable behavior of `GroupableColumn.tsx`'s grouping-mode-change handling once this feature lands (`research.md` §3–§4). Reuses `useCardGroups.ts`'s existing `disbandGroup` operation as its sole mechanism for dissolving groups — this contract adds no new persistence operation.

## Contract — Switching a column's mode away from `'suggestions'`

- **Given** a column currently on `'suggestions'` with one or more accepted `CardGroup`s, **when** the user selects `'none'` or `'user'` from the grouping-mode menu, **then** every `CardGroup` in that column MUST be disbanded (each member card's `groupId`/`isGroupHead`/`groupOrder` cleared) via the existing `disbandGroup` operation — no group formed via the suggestions flow may remain in that column afterward (spec.md FR-008, Acceptance Scenarios 1–2).
- **Given** the groups above have been disbanded, **when** the disband operations resolve (server round-trip + realtime sync), **then** the column's now-ungrouped cards MUST be re-sorted per the newly selected criteria using the column's existing, unmodified `processCards`/`groupCards` logic — no new sorting code path is introduced (spec.md FR-009).
- **Given** a column has pending (not yet accepted/rejected) suggestions visible when the mode is switched away from `'suggestions'`, **when** the switch happens, **then** the suggestions panel MUST close and those pending suggestions MUST be cleared from local state, in addition to disbanding any already-accepted groups (spec.md FR-011, Acceptance Scenario 3).
- **Given** a column on `'suggestions'` with zero accepted groups, **when** the mode is switched away, **then** no `disbandGroup` call is made (nothing to dissolve) — the switch is a no-op with respect to teardown (spec.md Acceptance Scenario 5).
- **Given** more than one participant is viewing the same board, **when** one participant triggers the teardown above, **then** every other participant MUST observe the same groups disappear and the same cards re-sort, via the board's existing realtime sync — no participant-local-only state is introduced for this behavior (spec.md FR-012, Acceptance Scenario 4).
- **Given** one of several `disbandGroup` calls in a teardown batch fails (network/server error), **when** this occurs, **then** the other calls in the batch MUST still be attempted and their successes MUST stand (no rollback of already-succeeded disbands), and the user MUST see a visible error indication for the failure (no silent failure) — mirrors the existing `handleAcceptSuggestion` error-handling precedent (`research.md` §4).

## Contract — Switching between two non-`'suggestions'` modes

- **Given** a column's mode changes from `'none'` to `'user'` (or vice versa) — neither the source nor the destination is `'suggestions'` — **when** this happens, **then** no `disbandGroup` call is made and behavior is unchanged from today (spec.md FR-013, Edge Cases).

## Contract — Re-triggering suggestions while already in `'suggestions'` mode

- **Given** a column already on `'suggestions'` mode with accepted groups, **when** the user re-opens/regenerates the suggestions panel without switching to a different mode value, **then** those accepted groups MUST NOT be disbanded — teardown is scoped strictly to an actual criteria transition away from `'suggestions'`, not to any suggestions-panel interaction while remaining in that mode (spec.md Edge Cases).

## Explicitly not covered by this contract

- Card-level data preservation during disband (content/votes/likes/reactions/authorship unchanged) — this is `disbandGroup`'s pre-existing, unmodified guarantee; not re-specified here.
- The grouping-mode dropdown's own positioning/dismissal behavior — unchanged, covered by `specs/045-fix-column-grouping-dropdown-position`.

**Verification**: a `GroupableColumn` component/integration test simulating an accepted-group column, switching mode to `'none'` and separately to `'user'`, asserting `onGroupDisband` is called once per existing group and the resulting ungrouped cards render per the new criteria; a test for the pending-suggestions-discarded case (panel open, mode switched, panel no longer rendered); a test for the zero-groups no-op case (assert `onGroupDisband` not called); a test for the non-`'suggestions'`-to-non-`'suggestions'` no-op case; a test for one-of-several-disbands-failing surfacing a visible error without preventing the others from completing.
