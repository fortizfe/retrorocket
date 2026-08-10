# Contract: Functional Parity

**Enforces**: FR-002 through FR-008, FR-013a, FR-014, SC-001. Applies to the
redesigned options menu and facilitator menu before any implementation task
can be marked complete.

## Contract

Every capability below MUST behave identically to the pre-redesign
implementation, except where explicitly marked as newly introduced by
FR-013a. Each row names the requirement it satisfies and the existing
test(s) that must keep passing — updated only for intentional
selector/structure changes, never weakened or deleted (FR-016).

| Capability | Requirement | Verified by |
|---|---|---|
| Open export popover, copy board ID, copy/share link, exit to dashboard — reachable by any participant regardless of role | FR-002 | `RetrospectiveTopbar.test.tsx`, `e2e/export.spec.ts`, `e2e/retrospective-board.spec.ts` |
| Facilitator menu trigger/panel entirely absent (not disabled) for non-owners | FR-003 | `FacilitatorMenu.test.tsx`, `e2e/facilitator-countdown.spec.ts` |
| Controls tab: action-items column toggle; timer create/start/pause/reset/delete incl. quick presets; live status | FR-004 | `FacilitatorMenu.test.tsx` (Controls tab coverage), `useCountdown.test.ts`, `ActionColumnToggle.test.tsx`, `e2e/facilitator-countdown.spec.ts` |
| Sentiment tab: enable/disable, model select, pause, advanced settings (confidence threshold, batch size, auto-analysis), error state | FR-005 | `FacilitatorMenu.test.tsx` (Sentiment tab coverage), `e2e/team-mood.spec.ts` |
| Team mood tab: disabled/initializing/live-report states | FR-006 | `FacilitatorMenu.test.tsx` (Team Mood tab coverage), `e2e/team-mood.spec.ts` |
| Notes tab: add/edit/delete private note with delete confirmation, author-only visibility | FR-007 | `NotesTab.test.tsx`, `useFacilitatorNotes.test.ts`, `e2e/facilitator-countdown.spec.ts` |
| Facilitator menu tab navigation: real ARIA tablist, controls tab default, arrow-key navigation | FR-008 | `FacilitatorMenuTabs.test.tsx` |
| **New**: mobile-accessible entry point for both menus, exercising the same capabilities as the rows above | FR-013a | New tests added by this feature — no pre-existing mobile coverage exists to extend (`research.md` §1, §6) |
| Every currently non-functional placeholder (e.g. sentiment "reanalyze" no-op, unpopulated notes badge) preserved as-is, not fixed or removed | FR-014 | Same test files as the row it belongs to — asserts the placeholder's current (non-)behavior is unchanged |
| All visible text sourced from i18next (en/es); no hardcoded strings | FR-010 | locale-key-coverage check (equivalent to feature 033's `tasks.md` T063), `retro-rocket/src/locales/en.json`/`es.json` lockstep for `retrospective.*`/`retrospectivePage.*` keys touched by this feature |
| No change to real-time synchronization behavior of timer/sentiment/notes | Assumption (`spec.md`) | `useCountdown.test.ts`, `useFacilitatorNotes.test.ts`, `backendRealtimeClient.test.ts`, `retrospective-board-no-firestore.test.ts` |

## Non-goals

This contract does not cover the board grid, cards, drag-and-drop, card
menu, column header menu, reaction picker, or the export popover's own
internals (`ImprovedExportPopover.tsx`) — all already redesigned and
out of scope per `spec.md`'s Assumptions. Their absence of change is
expected, not a regression. It also does not cover fixing any
pre-existing non-functional placeholder (per FR-014) — its continued
non-function is the expected, contract-satisfying outcome.

## Verification procedure

1. Establish the pre-redesign baseline once, in `tasks.md`'s Setup phase,
   by running the full `type-check` / `lint` / `test:coverage` / relevant
   `e2e` suite (`facilitator-countdown`, `team-mood`, `export`,
   `retrospective-board`, `accessibility`) and recording it passing.
2. After implementation, re-run the full set — every row MUST still pass,
   plus the new FR-013a mobile-entry-point tests.
3. Coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 /
   lines 50 / statements 50) MUST NOT drop between the baseline and the
   final run.

### Outcome (T042)

Final run: `type-check` clean, `lint` clean, `test:coverage` — **2510 passed,
3 skipped, 0 failed** across 174 test files. Final coverage: **74.38%
statements / 82.58% branches / 73.98% functions / 74.38% lines** — every
threshold clears (branches is the tightest gate at 78 and clears at 82.58%).
No coverage-gate failure. `playwright test --list` across
`facilitator-countdown`, `team-mood`, `export`, `retrospective-board`, and
`accessibility` compiles clean (85 tests, 5 files); e2e execution itself was
not possible in this sandbox (no Playwright browsers installed) — verified
by isolated `tsc --noEmit` and `--list` throughout implementation instead.
