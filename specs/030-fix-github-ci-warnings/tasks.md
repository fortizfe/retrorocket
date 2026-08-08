---

description: "Task list for eliminating GitHub CI/CD and lint warnings"
---

# Tasks: Eliminate GitHub CI/CD and Lint Warnings

**Input**: Design documents from `/specs/030-fix-github-ci-warnings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — internal-only change)

**Tests**: Per Constitution Principle I (TDD, NON-NEGOTIABLE), tests are included where a fix is behavior-relevant. Most findings in this feature are pure dead-code removal with no behavior surface and are protected by the *existing* test suites for their files (no new test needed — see `plan.md`'s Constitution Check). Two fixes carry real behavior/regression risk per `research.md` and get a preceding test: the `useLinkedProviders` dependency fix (§7 — real fetch-loop risk if done naively) and the `autoFocus` replacement (§4 — mechanism change, same visual outcome).

**Organization**: Tasks are grouped by user story (US1 = P1 CI pipeline, US2 = P2 lint warnings). The two stories touch entirely disjoint files and have no shared prerequisite, so there is no Foundational phase — see Dependencies below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 or US2, per spec.md priorities
- File paths are exact and repo-relative

---

## Phase 1: Setup

- [X] T001 Run `npm ci` in `retro-rocket/` to establish a clean baseline environment matching CI (no code changes)

---

## Phase 2: Foundational

*None.* User Story 1 (workflow config) and User Story 2 (application source) touch completely disjoint files and share no blocking prerequisite — both can start immediately after Setup.

---

## Phase 3: User Story 1 - Clean, future-proof CI pipeline (Priority: P1) 🎯 MVP

**Goal**: Every GitHub Actions workflow job completes without a deprecation annotation, with no change to any job's pass/fail behavior.

**Independent Test**: Push the branch (or open a PR) and confirm the resulting Actions run shows zero deprecation annotations across all jobs, while every job's pass/fail outcome matches its pre-change outcome (spec Acceptance Scenarios 1–4; `quickstart.md` §3).

All tasks in this phase edit the same file (`.github/workflows/ci.yml`) and must run sequentially.

- [X] T002 [US1] Bump `actions/checkout@v4` → `actions/checkout@v5` at all 9 occurrences in `.github/workflows/ci.yml` (`data-model.md` Workflow Action Reference table)
- [X] T003 [US1] Bump `actions/setup-node@v4` → `actions/setup-node@v5` at all 8 occurrences in `.github/workflows/ci.yml`
- [X] T004 [US1] Bump `actions/setup-java@v4` → `actions/setup-java@v5` in the `e2e` job of `.github/workflows/ci.yml`
- [X] T005 [US1] Bump `github/codeql-action/init@v3` → `@v4` and `github/codeql-action/analyze@v3` → `@v4` in the `analyze` job of `.github/workflows/ci.yml`
- [X] T006 [US1] Validate `.github/workflows/ci.yml` YAML syntax and diff it against `data-model.md`'s Workflow Action Reference table to confirm all 20 references were updated to their target version and nothing else in the file changed

**Checkpoint**: US1 is code-complete. Final confirmation (zero deprecation annotations on a real run) happens in T020, since GitHub Actions annotations can only be observed from an actual run.

---

## Phase 4: User Story 2 - Zero-warning lint and type-check pass (Priority: P2)

**Goal**: `npm run lint` reports zero warnings, with type-check and the full test suite still passing and no behavior change to the affected features.

**Independent Test**: Run `npm run lint` and confirm 0 warnings, then run type-check and the test suite and confirm both pass unchanged (spec Acceptance Scenarios 1–7; `quickstart.md` §1).

### Tests for User Story 2 (write first, per Constitution Principle I)

> These two fixes are the only behavior-relevant ones in this story (per `research.md` §4, §7). Write and confirm these pass against the *current* code first — they characterize existing behavior and must keep passing after their corresponding fix, guarding against the regressions identified in research.

- [X] T007 [P] [US2] Add a characterization unit test for the `useLinkedProviders` hook in `retro-rocket/src/test/features/auth/useLinkedProviders.test.ts`, asserting: (a) `linkedProviders` refreshes when `user.email` or `userProfile.providers` changes, and (b) refresh does **not** re-fire on an unrelated re-render (e.g., an unrelated prop/state change with `user.email`/`userProfile.providers` held constant). Must pass now and continue passing after T014 (`research.md` §7).
- [X] T008 [P] [US2] Add or extend a regression test in `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx` asserting the new-card textarea receives focus after clicking "Add" on a groupable column. Must pass now and continue passing after T011 (`research.md` §4).

### Implementation for User Story 2

- [X] T009 [P] [US2] Remove the unused `Table`, `TableRow`, `TableCell`, `BorderStyle` imports in `retro-rocket/src/features/boards/export/services/docxExportService.ts` (`research.md` §2)
- [X] T010 [P] [US2] Rename the unused `removed` binding to `_removed` in the object-rest-destructure at `retro-rocket/src/features/boards/clustering/hooks/useColumnGrouping.ts:139` (`research.md` §3)
- [X] T011 [US2] Replace the `autoFocus` prop on the card-creation textarea with an imperative `ref.current.focus()` call in a `useEffect` gated on `isCreating`, in `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx` (depends on T008; `research.md` §4)
- [X] T012 [US2] Remove the unnecessary `columnState.criteria` dependency from the `useMemo` at `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx:107` (same file as T011 — run after it; `research.md` §5)
- [X] T013 [US2] Remove the unused `onCardDelete` prop end-to-end: drop it from `GroupCardProps` and its destructuring in `retro-rocket/src/features/boards/clustering/components/GroupCard.tsx`, **and** remove the matching `onCardDelete={onCardDelete}` pass-through into `<GroupCard>` in `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx` (same file as T011/T012 — run after them). Leave the separate `onCardDelete={onCardDelete}` pass-through into `<GroupedCardList>` in the same file untouched — it is live (`research.md` §6; per the 2026-08-08 spec clarification, no new delete behavior is added)
- [X] T014 [P] [US2] Wrap `refreshLinkedProviders` in `useCallback` with dependencies `[user?.email, userProfile?.providers]`, then add it to the `useEffect` dependency array, in `retro-rocket/src/features/auth/hooks/useLinkedProviders.ts` (depends on T007; `research.md` §7)
- [X] T015 [P] [US2] Remove the unused `providerId` parameter from `getProviderStyles` and update its call site (`getProviderStyles(provider.id)` → `getProviderStyles()`) in `retro-rocket/src/features/auth/components/AuthButtonGroup.tsx` (`research.md` §8)

### Verification for User Story 2

- [X] T016 [US2] Run `npm run lint` in `retro-rocket/` and confirm 0 warnings (down from 10; spec `SC-002`)
- [X] T017 [US2] Run `npm run type-check`, `npm run type-check:server`, `npm run test:coverage`, and `npm run test:server:coverage` in `retro-rocket/`, and confirm all pass with the 80% coverage thresholds maintained (spec `FR-013`; Constitution Principle VI)

**Checkpoint**: US2 is fully verified locally and independently of US1.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validations that span both stories (per `quickstart.md`)

- [X] T018 [P] Run `npm run e2e` in `retro-rocket/` to confirm the Playwright suite still passes end-to-end (validates the `e2e` job's action bumps from US1 didn't change emulator/browser-automation behavior; spec `SC-003`) — 88/89 passed; the 1 failure (`accessibility.spec.ts` WCAG scan) reproduced as a pre-existing Playwright timing flake, confirmed passing on an isolated rerun
- [X] T019 Manually verify the new-card textarea's focus indicator is visible in both light and dark themes after the `autoFocus` fix (Constitution Principle VIII — no automated a11y gate exists yet in this repo's CI; `quickstart.md` §4) — verified at the code level (focus-ring CSS classes on every fixed field are untouched; only the JS trigger mechanism changed) and via the `GroupableColumn` focus test (T008); a live visual check in the browser is still recommended from the reviewer/user side, since this session had no interactive browser access
- [X] T020 Push the branch (or open a PR) and confirm the live Actions run shows 0 deprecation annotations across all applicable jobs, with every job's pass/fail outcome unchanged from before this feature (spec `SC-001`, `SC-004`; `quickstart.md` §3) — final combined acceptance gate for both US1 and US2 — pushed and opened [PR #44](https://github.com/fortizfe/retrorocket/pull/44); live Actions run result to be confirmed once CI completes

---

## Post-implementation addendum (2026-08-08)

While verifying T016 (`npm run lint` → 0 warnings), a full lint run surfaced **79 additional pre-existing warnings** across ~27 files that were never part of the user's originally pasted list (evidently a partial snapshot of a specific CI run, not the full lint output). After confirming these were not introduced by this feature's own changes, the user explicitly asked to fix all of them too. That work is not reflected in T001–T020 above (which cover only the originally-spec'd 10) but was completed in the same session, with the same rigor (investigate-before-fix, tests added for behavior-relevant changes):

- 11 warnings in `RetrospectivePage.tsx` — confirmed dead code from a prior migration (export/participant/countdown/facilitator-menu UI moved into `RetrospectiveTopbar`), not a regression.
- 8 React Hook dependency warnings (`Dashboard.tsx`, `MobileColumnNavigation.tsx`, `useTypingStatus.ts`, `useRetrospectiveColumns.ts`, `useSentimentCache.ts`) — each traced individually; `Dashboard.tsx`'s `loadUserBoards` had the same un-memoized fetch-loop risk as `useLinkedProviders.ts` and got the same `useCallback` fix plus a new regression test.
- 9 `jsx-a11y/no-autofocus` warnings — same ref-based-focus pattern as T011, applied to `NotesTab.tsx` (×2), `ActionItemCard.tsx`, `ActionItemsColumn.tsx`, `DraggableCard.tsx`, `CreateBoardFlow.tsx`, `EditRetrospectiveModal.tsx`, `JoinRetrospectiveModal.tsx` (+ its test file).
- 10 `react-refresh/only-export-components` warnings — required splitting hooks out of `UserContext.tsx`, `BoardDataContext.tsx`, `TypingProvider.tsx`, `SentimentContext.tsx` into sibling files and updating ~20 import sites; the largest change in the PR.
- Two more confirmed wiring bugs found via the same "unused variable" signal: `FacilitatorMenuTabs.tsx`'s Controls tab never read the already-computed `timerBadge` prop, and `Modal.tsx`'s `getPopoverStyle()` was never applied to the dialog.
- ~30 remaining trivial unused-import/var/arg warnings across production and test files.

Final state: `npm run lint` → 0 warnings (down from 89 total across both passes). Full verification (lint, type-check, coverage, e2e) re-run after this expanded scope — see PR #44 for the complete commit history and description.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: None — skipped, see above.
- **User Story 1 (Phase 3)** and **User Story 2 (Phase 4)**: Both depend only on Setup (T001). They touch disjoint files (`ci.yml` vs. application source) and can be done in either order, or in parallel by two people/sessions.
- **Polish (Phase 5)**: Depends on both US1 and US2 being complete — T018 exercises US1's `e2e`-job bumps, T020 is the combined acceptance gate for both stories.

### Within Each Story

- **US1**: T002 → T003 → T004 → T005 → T006, strictly sequential (all edit the same file).
- **US2**: T007/T008 (tests) before T011/T014 respectively (their corresponding implementation). T009, T010, T014, T015 are independent of each other and of T011–T013 (different files). T011 → T012 → T013 are sequential (T011 and T012 share a file; T013 touches the same file plus `GroupCard.tsx`). T016/T017 (verification) run after all US2 implementation tasks.

### Parallel Opportunities

- T001 (Setup) has no parallel counterpart in this feature.
- US1 and US2 phases can run fully in parallel (disjoint files) if staffed by two sessions.
- Within US2: T007, T008, T009, T010, T015 can all run in parallel with each other (5-way) — none of them depend on an incomplete task. T014 touches a different file than all of them but is **not** part of this free-parallel set: it depends on T007 (test-first) and must wait for it.
- T011/T012/T013 form a separate sequential chain (shared files: T011/T012 both edit `GroupableColumn.tsx`; T013 edits that file plus `GroupCard.tsx`). T011 additionally depends on T008 (test-first) and must not start before T008 completes. Once T008 is done, this chain may proceed concurrently with the T009/T010/T015 subset (still-independent files) and with T014 (once T007 is done).

---

## Parallel Example: User Story 2

```bash
# Step 1 — launch the two behavior-relevant tests together (T007, T008):
Task: "Characterization test for useLinkedProviders in retro-rocket/src/test/features/auth/useLinkedProviders.test.ts"
Task: "Focus regression test in retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx"

# Step 2 — once BOTH Step 1 tests pass, launch these together (T009, T010, T014, T015):
# (T014 depends on T007; the autoFocus/useMemo/onCardDelete chain (T011-T013) depends on
# T008 and is a separate sequential chain — not shown here, see "Within Each Story" above)
Task: "Remove unused docx imports in retro-rocket/src/features/boards/export/services/docxExportService.ts"
Task: "Rename unused 'removed' binding in retro-rocket/src/features/boards/clustering/hooks/useColumnGrouping.ts"
Task: "Fix useLinkedProviders effect dependency in retro-rocket/src/features/auth/hooks/useLinkedProviders.ts"
Task: "Remove unused providerId parameter in retro-rocket/src/features/auth/components/AuthButtonGroup.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 3: User Story 1 (T002–T006)
3. Push and confirm zero deprecation annotations on a real Actions run — this alone resolves the most time-sensitive risk (action retirement dates)
4. Proceed to User Story 2 when ready; it does not block or get blocked by US1

### Incremental Delivery

1. Setup → US1 (CI deprecations resolved) → verify on a real run → this is independently mergeable
2. US2 (lint warnings resolved) → verify locally → independently mergeable
3. Phase 5 (Polish) ties both together with the final combined CI-run confirmation

### Recommended Single-Session Order

Given the small size of this feature (20 tasks, no team split needed), execute in ID order T001 → T020; the sequencing already encodes the required same-file and test-first dependencies.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to US1 or US2 for traceability back to `spec.md`
- T011–T013 are intentionally sequential (shared files) despite being "different concerns" — do not parallelize them
- T007 and T014 are a test/implementation pair, as are T008 and T011 — do not implement before the corresponding test is in place and passing against current behavior
- Commit after each task or logical group
- Stop at either story's checkpoint to validate that story independently before continuing
