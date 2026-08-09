# Contract: Functional Parity

**Enforces**: FR-002 through FR-017, SC-002. Applies to the redesigned
dashboard before any implementation task can be marked complete.

## Contract

Every capability below MUST behave identically to the pre-redesign
implementation (or, where marked **[CORRECTED]**, MUST behave per the fixed
requirement rather than the old, defective behavior). Each row names the
requirement it satisfies and the existing test(s) that must keep passing —
updated only for intentional selector/structure changes, never weakened or
deleted (FR-022).

| Capability | Requirement | Verified by |
|---|---|---|
| List boards created by the user | FR-002 | `Dashboard.test.tsx`, `e2e/dashboard-list.spec.ts` |
| List boards joined by the user | FR-002 | `Dashboard.test.tsx`, `e2e/dashboard-list.spec.ts` |
| Distinguish creator vs. joined role per board | FR-002 | `BoardRow.test.tsx` (consolidated — see Note below), `e2e/dashboard-list.spec.ts` |
| Display title, description, creation date, participant count | FR-003 | `BoardRow.test.tsx` |
| Create board from template, required title, navigates on success | FR-004 | `Dashboard.test.tsx`, `e2e/board-creation.spec.ts` |
| Join board by ID, inline validation/error, navigates on success | FR-005 | `JoinRetrospectiveModal.test.tsx`, `e2e/board-join.spec.ts` |
| Open a listed board and navigate into it | FR-006 | `BoardRow.test.tsx`, `e2e/dashboard-list.spec.ts` |
| Owner-only rename, required non-empty title, inline error | FR-007 | `EditRetrospectiveModal.test.tsx` (new), `e2e/dashboard-manage.spec.ts` |
| Owner-only delete, confirmation step, loading indicator, success/error feedback | FR-008 | `BoardRow.test.tsx`, `e2e/dashboard-manage.spec.ts` |
| Free-text search across title/description | FR-009 | `Dashboard.test.tsx` |
| Filter by All / Created / Joined with live counts | FR-010 | `Dashboard.test.tsx` |
| Sort by name/date with direction toggle | FR-011 | `Dashboard.test.tsx` |
| **[CORRECTED]** Every board reachable regardless of count/layout | FR-012 | `Dashboard.test.tsx` (25-board pagination-reachability guard), `e2e/dashboard-list.spec.ts` (210 real seeded boards, searched/sorted/paginated to the last one and opened) |
| Distinct empty-boards vs. no-results states | FR-013 | `Dashboard.test.tsx`, `useBoardListQuery.test.tsx` (`isEmpty`/`isNoResults`) |
| Loading state; error feedback on any failed operation | FR-014 | `Dashboard.test.tsx`, `e2e/dashboard-list.spec.ts` (error state), `e2e/accessibility.spec.ts` (all 5 List State a11y scans) |
| **[CORRECTED]** Rename/delete reachable via keyboard and touch, not hover-only | FR-015 | `BoardRow.test.tsx` (`opacity-0` regression guard), `e2e/dashboard-manage.spec.ts` (keyboard-only rename+delete flow test, dedicated touch-emulated `.tap()` test) |
| **[CORRECTED]** Board dates render in active language | FR-016 | `localeDate.test.ts`, `BoardRow.test.tsx` (en-vs-es regression guard), `e2e/dashboard-locale.spec.ts` (real language switch via the app's UI) |
| All visible text sourced from i18next (en/es) | FR-017 | `dashboard.*`/`createBoard.*`/`boardTemplates.*`/`common.*` verified in exact lockstep (117 keys each, zero drift); no hardcoded strings found in touched components |

**Note (consolidation)**: The selected direction (B — Structured Table) has
one adaptive layout, not two view modes — so `BoardCard.tsx` and
`BoardListItem.tsx` were consolidated into a single `BoardRow.tsx`
(`tasks.md` T018), with a single comprehensive `BoardRow.test.tsx`
replacing both old test files. Every capability the two old components
covered is preserved in the one new component/test.

## Non-goals

This contract does not cover new capabilities explicitly out of scope per
the spec's Assumptions (archiving, real-time presence indicators, bulk
actions) — their absence is expected, not a regression.

## Verification procedure

1. The pre-redesign baseline for every row above is established once, in
   `tasks.md` T001 (Setup phase), by running the full `type-check` /
   `lint` / `test:coverage` / `e2e` suite and recording it passing — since
   every test named in this contract is part of that suite, T001's
   full-suite pass is sufficient baseline confirmation for every row; no
   separate per-row pass is required before implementation starts.
   (`BoardListItem.test.tsx` is a new file created during implementation —
   see `tasks.md` T032 — so it has no pre-redesign baseline of its own; its
   assertions are instead written to demonstrate parity with `BoardCard`'s
   already-baselined behavior for the same fields.)
2. After implementation, re-run the full set (`tasks.md` T045) — every row
   MUST still pass, and the two **[CORRECTED]** rows MUST have new/extended
   assertions that fail against the *old* (pre-redesign) behavior and pass
   against the new behavior, proving the defect was actually fixed rather
   than incidentally avoided.
3. Coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 /
   lines 50 / statements 50) MUST NOT drop between the T001 baseline and
   the T045 final run.

## Result (2026-08-09, `tasks.md` T045)

**All rows PASS.** Final full-suite run: 164 test files / 2428 tests passing
(baseline: 160 files / 2389 tests — net gain, zero regressions), coverage
65.7% statements / 82.99% branches / 72.22% functions / 65.7% lines (all
above the 50/78/64/50 thresholds and above the T001 baseline on every
metric). Both **[CORRECTED]** rows (FR-012, FR-015, FR-016) have dedicated
regression tests verified to fail against the described pre-redesign defect
and pass against the shipped behavior. Full E2E suite re-run at T049.
