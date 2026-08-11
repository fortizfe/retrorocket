# Contract: Functional Parity

**Enforces**: FR-002 through FR-008, FR-007a, FR-012, SC-001, SC-009.
Applies to the redesigned export window before any implementation task can
be marked complete.

## Contract

Every capability below MUST behave identically to the pre-redesign
implementation, except where explicitly marked as newly introduced by
FR-002/FR-007a. Each row names the requirement it satisfies and the
existing test(s) that must keep passing — updated only for intentional
selector/structure changes, never weakened or deleted (FR-014).

| Capability | Requirement | Verified by |
|---|---|---|
| Format selection (PDF/TXT/DOCX), custom title, logo toggle, optional content (action items, statistics) | FR-004 | `ImprovedExportPopover.test.tsx`, `e2e/export.spec.ts` |
| Facilitator-only zone (notes, sentiment badges, team mood analysis) toggles, owner-gated | FR-004, FR-006 | `ImprovedExportPopover.test.tsx` (owner vs. non-owner rendering) |
| Always-included-content notice (participants, card authors, reactions, group details, current order) | FR-005 | `ImprovedExportPopover.test.tsx` |
| In-progress/success/error feedback, including progress percentage | FR-007 | `ImprovedExportPopover.test.tsx`, `e2e/export.spec.ts` |
| Keyboard and touch operability, Escape/outside-click dismissal | FR-008 | `ImprovedExportPopover.test.tsx`, `e2e/accessibility.spec.ts` (existing export-dialog keyboard/touch coverage) |
| **New**: selecting "Export" closes the options panel and opens the export panel anchored to the same "Options" trigger | FR-002 | New test coverage — no pre-existing anchor behavior to extend (`research.md` §2) |
| **New**: mobile bottom-sheet presentation for the export window | FR-003 | New test coverage — no pre-existing mobile-specific presentation exists (`research.md` §3) |
| **New**: dismissing the window during an active export does not cancel it; outcome surfaces via toast if the window is closed when it completes | FR-007a, SC-009 | New test coverage — the export job's lifted lifecycle (`research.md` §4) has no pre-existing behavior to extend |
| No new export format, no change to what data an export contains beyond what's already configurable | FR-012 | `unifiedExportService.test.ts`, `pdfExportService.test.ts`, `docxExportService.test.ts`, `txtExportService.test.ts` (all unchanged, still passing) |
| All visible text sourced from i18next (en/es); no hardcoded strings | FR-009 (`spec.md`) | locale-key-coverage check, `retro-rocket/src/locales/en.json`/`es.json` lockstep for `retrospective.export.*` keys touched by this feature |
| No change to real-time synchronization or export generation behavior | `spec.md` Assumptions | `useUnifiedExport.test.ts`, `retrospective-board-no-firestore.test.ts` |

## Non-goals

This contract does not cover the options menu's or facilitator menu's own
presentation (already redesigned under feature 036 — this feature only
changes how the options panel's "Export" item transitions into the export
window, per FR-002), the board grid, cards, drag-and-drop, card menu,
column header menu, or reaction picker. Their absence of change is
expected, not a regression. It also does not cover the underlying export
generation/rendering pipeline (`pdfExportService`/`docxExportService`/
`txtExportService`/`unifiedExportService`) beyond confirming it is invoked
unchanged (FR-012).

## Verification procedure

1. Establish the pre-redesign baseline once, in `tasks.md`'s Setup phase,
   by running the full `type-check` / `lint` / `test:coverage` / relevant
   `e2e` suite (`export`, `accessibility`) and recording it passing.
2. After implementation, re-run the full set — every row MUST still pass,
   plus the new FR-002/FR-003/FR-007a coverage.
3. Coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 /
   lines 50 / statements 50) MUST NOT drop between the baseline and the
   final run.

### Outcome (T033/T034)

**Baseline (T001, 2026-08-11)**: `type-check` clean; `lint` clean;
`test:coverage` — 173 files / 2395 tests passed (2/3 skipped), coverage
75.92% statements / 82.77% branches / 74.47% functions / 75.92% lines; e2e
(`export.spec.ts` + `accessibility.spec.ts`) — 50/51 passed, one pre-existing
flake unrelated to this feature.

**Final (T033/T034, 2026-08-11)**: `type-check` clean; `lint` clean;
`test:coverage` — 173 files / 2411 tests passed (2/3 skipped), coverage
76.79% statements / 82.88% branches / 75.32% functions / 76.79% lines — every
threshold clears with headroom, and every number moved up (not down) versus
baseline. e2e — full `accessibility.spec.ts` + `export.spec.ts` run (61 tests): all
export-specific tests passing consistently across multiple runs (58
accessibility tests including the 10 new export-specific ones, all 3
`export.spec.ts` tests including the critical PDF/DOCX/TXT flow). One
unrelated test (`the color picker ... is keyboard-operable`, feature 037 —
`Card.tsx`/`ColorPicker.tsx`, neither touched by this feature) failed once
and passed on immediate retry — a pre-existing flake, not a regression;
confirmed by `git status` showing zero changes to any card/color-picker
file. No direct
Firestore access introduced (`retrospective-board-no-firestore.test.ts`
still passes); `unifiedExportService.ts`/`pdfExportService.ts`/
`docxExportService.ts`/`txtExportService.ts` confirmed untouched via `git
status` (FR-012) — only `ImprovedExportPopover.tsx`,
`RetrospectiveTopbar.tsx`, and `useBoardMenuOverlay.ts` were modified, plus
two orphaned/unused files deleted (`ExportButton.tsx`,
`RetrospectivePageWithImprovedExport.tsx`, confirmed zero references before
deletion).

One real regression was caught and fixed during this final verification
pass, not before: a `review-animations`-recommended change
(`whileTap={{ scale: 0.97 }}` → `whileTap={{ transform: 'scale(0.97)' }}`)
silently broke real format-button clicks in an actual browser — invisible to
the unit test suite, since its `framer-motion` mock replaced `motion.button`
with a plain `<button>`. Caught by re-running the real `export.spec.ts`
suite against the live app, root-caused with a targeted Playwright repro,
and reverted to the proven-correct shorthand. See `design-review.md`'s
"Process note" for the full account.
