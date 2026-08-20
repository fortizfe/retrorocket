---

description: "Task list template for feature implementation"
---

# Tasks: Team Retrospective Metrics Dashboard

**Input**: Design documents from `/specs/056-team-metrics-dashboard/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/team-metrics-api.md, quickstart.md

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests MUST be written before their corresponding implementation task and MUST fail first. Every test task below is REQUIRED, not optional. `FirestoreTeamMetricsAdapter`'s Firestore query-composition code is exempt from Vitest-level unit tests per the codebase's own documented, pre-existing convention (`server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts`'s header comment, reaffirmed by 055's tasks.md) — only the pure helper functions it calls (`activitySummary`, `isConfident`, `moodScore`) are unit-tested directly; the adapter's own query composition is covered by the Playwright E2E tasks below.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes exact file paths, matching the layout in plan.md's Project Structure

## Path Conventions

Existing monorepo layout (plan.md): backend `retro-rocket/server/src/` + `retro-rocket/server/test/`, frontend `retro-rocket/src/` + `retro-rocket/src/test/`, E2E `retro-rocket/e2e/`. All paths below are relative to `retro-rocket/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Non-code prerequisites shared by every story.

None required. This feature introduces no new Firestore collection or field, no new npm dependency,
and no new i18n namespace prefix beyond `teams.metrics.*` (keys are added inside that namespace
per-story, below).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared `TeamMetricsPort` type surface every user story's backend task builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Define `TeamMetricsSummary`, `RetrospectiveMoodPoint`, and the `TeamMetricsPort` interface (single method `getTeamMetrics(teamId: string): Promise<TeamMetricsSummary>`) in `server/src/application/ports/teamMetrics.ts`, per data-model.md.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - View team retrospective activity summary (Priority: P1) 🎯 MVP

**Goal**: An owner or member of a team can open its metrics panel and see the total number of
retrospectives associated with the team and the average number of participants per retrospective; a
non-member is denied; a team with zero retrospectives shows a clear empty state. This story stands up
the whole endpoint/panel plumbing — `actionItemsCreated` and `moodEvolution` return placeholder
values (`0` / `[]`) until User Stories 2 and 3 fill them in.

**Independent Test**: As a team owner/member with several team-linked retrospectives, open the panel
and confirm the displayed retrospective count and average participation match the underlying data
(`GET /api/teams/:id/metrics`'s `retrospectiveCount`/`averageParticipants`); as a non-member, confirm
`403 forbidden`; as an owner/member of a team with zero retrospectives, confirm the empty state — all
independent of action items (US2) or mood evolution (US3).

### Tests for User Story 1 ⚠️ (write first, confirm they fail)

- [X] T002 [P] [US1] Unit test: `computeActivitySummary` pure helper — empty input → `{ retrospectiveCount: 0, averageParticipants: 0 }`; several participant counts → correct count and average rounded to 1 decimal — in `server/test/domain/teams/activitySummary.test.ts`.
- [X] T003 [P] [US1] Unit test: `GetTeamMetrics` use-case — throws `ForbiddenError` (`403 forbidden`) when a fake `TeamsPort.getMembership` resolves `null`; delegates to a fake `TeamMetricsPort.getTeamMetrics(teamId)` and returns its result unchanged when the requester is a current member — in `server/test/application/use-cases/teams/GetTeamMetrics.test.ts`.
- [X] T004 [P] [US1] Hook test: `useTeamMetricsQuery` — loading, error, and success states; success state exposes `retrospectiveCount`/`averageParticipants`/`actionItemsCreated`/`moodEvolution` from the fetched payload — in `src/test/features/teams/metrics/useTeamMetricsQuery.test.ts`.
- [X] T005 [P] [US1] Component test: `ActivitySummary` renders `retrospectiveCount` and `averageParticipants`, including the zero-retrospectives empty-state rendering — in `src/test/features/teams/metrics/ActivitySummary.test.tsx`.
- [X] T006 [P] [US1] Component test: `TeamMetricsPanel` renders `ActivitySummary` with data from `useTeamMetricsQuery`, shows a loading state while fetching, and shows an error state with retry on failure — in `src/test/features/teams/metrics/TeamMetricsPanel.test.tsx`.

### Implementation for User Story 1

- [X] T007 [P] [US1] Implement `computeActivitySummary(participantCounts: number[]): { retrospectiveCount: number; averageParticipants: number }` in `server/src/domain/teams/activitySummary.ts` (depends on T002, T001).
- [X] T008 [US1] Implement `GetTeamMetrics` use-case — checks `teamsPort.getMembership(teamId, requesterUid)`, throws `ForbiddenError` when `null`, otherwise delegates to `teamMetricsPort.getTeamMetrics(teamId)` — in `server/src/application/use-cases/teams/GetTeamMetrics.ts` (depends on T003, T001).
- [X] T009 [US1] Implement `FirestoreTeamMetricsAdapter implements TeamMetricsPort` — `getTeamMetrics` queries `retrospectives` where `teamId == teamId`, calls `computeActivitySummary` on the returned `participantCount`s, and returns the result with `actionItemsCreated: 0` and `moodEvolution: []` as placeholders (filled in by US2/US3) — in `server/src/adapters/firebase/FirestoreTeamMetricsAdapter.ts` (depends on T007, T001; not unit-tested per this file's documented adapter exemption — covered by T016's E2E instead).
- [X] T010 [US1] Add `GET /api/teams/:id/metrics` to `teamsRouter` — calls `requireSession`, then `getTeamMetrics({ teamsPort, teamMetricsPort }, { teamId, requesterUid })`, serializes the result (ISO-8601 `createdAt` on each `moodEvolution` entry) per contracts/team-metrics-api.md — in `server/src/http/routes/teams.ts` (depends on T008).
- [X] T011 [US1] Add `teamMetricsPort: TeamMetricsPort` to `TeamsRouterDeps`; construct `FirestoreTeamMetricsAdapter` and pass it in `server/src/http/teams-wiring.ts`'s `buildTeamsDeps` (mirrors how `teamsPort` is already built there) (depends on T009, T010).
- [X] T012 [P] [US1] Add `getTeamMetrics(teamId)` client function plus `TeamMetricsSummaryDTO`/`RetrospectiveMoodPointDTO` wire types (dates as ISO-8601 strings, converted to `Date` on the way out) in `src/features/teams/metrics/services/backendTeamMetricsClient.ts`, per contracts/team-metrics-api.md (depends on T011).
- [X] T013 [US1] Implement `useTeamMetricsQuery(teamId)` hook (loading/error/data, mirroring `useTeamQuery`'s existing shape) in `src/features/teams/metrics/hooks/useTeamMetricsQuery.ts` (depends on T004, T012).
- [X] T014 [US1] Implement `TeamMetricsPanel` (loading/error/empty-state handling, per FR-010) and `ActivitySummary` (retrospective count + average participants) components in `src/features/teams/metrics/components/{TeamMetricsPanel.tsx,ActivitySummary.tsx}` — use the `apple-design`/`emil-design-eng` skill package for the panel's visual design per constitution Principle IX (depends on T005, T006, T013).
- [X] T015 [US1] Render `TeamMetricsPanel` from `src/pages/TeamDetail.tsx` for the currently viewed team, visible to any current member (owner or not) — matching the page's existing `callerRole`-independent sections (depends on T014).
- [X] T016 [P] [US1] Add `teams.metrics.panel.*` and `teams.metrics.activity.*` i18n keys (panel heading, activity labels, empty-state copy) to `src/locales/en.json` and `src/locales/es.json`.
- [X] T017 [US1] WCAG 2.1 AA pass on `TeamMetricsPanel`/`ActivitySummary` — contrast, visible focus, keyboard operability, correct heading structure — in both light and dark themes, per constitution Principle VIII (depends on T015).
- [X] T018 [P] [US1] Playwright E2E covering quickstart.md Scenario 1 (owner and member both see matching `retrospectiveCount`/`averageParticipants`), Scenario 3 (a non-member is denied, including by direct navigation to the endpoint), and Scenario 5 (a team with zero retrospectives shows the empty state) in a new `e2e/team-metrics.spec.ts` (depends on T011, T015).

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - View action items created across the team (Priority: P2)

**Goal**: The panel additionally shows the total number of action items created across the team's
retrospectives, replacing US1's `0` placeholder with a real chunked aggregation.

**Independent Test**: With a team whose retrospectives have a known number of action items, open the
panel and confirm the displayed total matches — independent of the activity summary (US1, already
working) or mood evolution (US3, not yet built).

### Tests for User Story 2 ⚠️ (write first, confirm they fail)

- [X] T019 [P] [US2] Component test: `ActionItemsSummary` renders `actionItemsCreated`, including the zero case — in `src/test/features/teams/metrics/ActionItemsSummary.test.tsx`.

### Implementation for User Story 2

- [X] T020 [US2] Extend `FirestoreTeamMetricsAdapter.getTeamMetrics` to compute the real `actionItemsCreated` total: using the team's retrospective ids (already fetched for US1), query `actionItems` with `where('retrospectiveId', 'in', chunk)` in chunks of 30, sum `snapshot.size` across chunks, replacing the `0` placeholder — in `server/src/adapters/firebase/FirestoreTeamMetricsAdapter.ts` (depends on T009; same file as T009, do after it).
- [X] T021 [US2] Implement `ActionItemsSummary` component and render it from `TeamMetricsPanel` — in `src/features/teams/metrics/components/ActionItemsSummary.tsx` and `src/features/teams/metrics/components/TeamMetricsPanel.tsx` (depends on T019, T014).
- [X] T022 [P] [US2] Add `teams.metrics.actionItems.*` i18n keys (label, zero-state copy) to `src/locales/en.json` and `src/locales/es.json`.
- [X] T023 [US2] WCAG 2.1 AA pass on `ActionItemsSummary` — contrast, correct labeling — in both themes, per constitution Principle VIII (depends on T021).
- [X] T024 [US2] Extend `e2e/team-metrics.spec.ts` with quickstart.md Scenario 1's action-items assertion (the displayed total matches the sum across the team's retrospectives) (depends on T020, T021, T018).

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - View team mood evolution across retrospectives (Priority: P3)

**Goal**: The panel additionally shows each of the team's retrospectives' mood score in chronological
order, replacing US1's `[]` placeholder — a retrospective with no confident sentiment data shows as
an explicit "no data" state rather than a default score.

**Independent Test**: With a team whose retrospectives have analyzed sentiment data (and at least one
that doesn't), open the panel and confirm mood values appear in chronological order, matching each
retrospective's own aggregated mood, with the unanalyzed one shown as "no data" — independent of the
activity summary (US1) or action items total (US2), both already working.

### Tests for User Story 3 ⚠️ (write first, confirm they fail)

- [X] T025 [P] [US3] Unit test: server-side `isConfident` predicate — parity fixtures asserting identical output to `src/features/boards/sentiment/domain/confidence.ts`'s `isConfident` for the same `SentimentResult`/`DEFAULT_SENTIMENT_CONFIG` inputs — in `server/test/domain/teams/isConfident.test.ts`.
- [X] T026 [P] [US3] Unit test: server-side `calculateMoodScore` — parity fixtures asserting identical output to `src/features/boards/sentiment/domain/moodScore.ts`'s `calculateMoodScore` for the same `{positive, neutral, negative}` distributions, plus this feature's own "zero confident results → the caller returns `null`, not a score" contract at the call site — in `server/test/domain/teams/moodScore.test.ts`.
- [X] T027 [P] [US3] Component test: `MoodEvolutionList` renders one row per `moodEvolution` entry in the order given, a numeric score when present, and an explicit "no data" state (not a color-only cue) when `moodScore` is `null` — in `src/test/features/teams/metrics/MoodEvolutionList.test.tsx`.

### Implementation for User Story 3

- [X] T028 [P] [US3] Implement the server-side `isConfident` predicate (duplicate of the frontend's, same `DEFAULT_SENTIMENT_CONFIG` thresholds) in `server/src/domain/teams/isConfident.ts` (depends on T025).
- [X] T029 [P] [US3] Implement the server-side `calculateMoodScore` (duplicate of the frontend's formula) in `server/src/domain/teams/moodScore.ts` (depends on T026).
- [X] T030 [US3] Extend `FirestoreTeamMetricsAdapter.getTeamMetrics` to compute the real `moodEvolution`: for each team retrospective (already fetched for US1), query `sentimentResults` with chunked `where('retrospectiveId', 'in', chunk)`, filter to confident results via `isConfident`, count positive/neutral/negative, compute `moodScore` via `calculateMoodScore` (or `null` when zero confident results), and return points sorted ascending by `createdAt` — replacing the `[]` placeholder — in `server/src/adapters/firebase/FirestoreTeamMetricsAdapter.ts` (depends on T028, T029, T020; same file as T020, do after it).
- [X] T031 [US3] Implement `MoodEvolutionList` (chronological rows, numeric score or an icon+text "no data" state) and render it from `TeamMetricsPanel` — in `src/features/teams/metrics/components/MoodEvolutionList.tsx` and `src/features/teams/metrics/components/TeamMetricsPanel.tsx` — use the `apple-design`/`emil-design-eng` skill package for the trend/no-data visual treatment per constitution Principle IX (depends on T027, T014).
- [X] T032 [P] [US3] Add `teams.metrics.mood.*` i18n keys (section label, "no data" copy, trend labels) to `src/locales/en.json` and `src/locales/es.json`.
- [X] T033 [US3] WCAG 2.1 AA pass on `MoodEvolutionList` — contrast, no color-only meaning for the "no data" state or any trend indication (icon/text accompanies color), keyboard-reachable rows — in both themes, per constitution Principle VIII (depends on T031).
- [X] T034 [US3] Extend `e2e/team-metrics.spec.ts` with quickstart.md Scenario 2 (mood evolution in chronological order, including the "no data" point for the unanalyzed retrospective) (depends on T030, T031, T024).

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature validation once all desired stories are complete.

- [X] T035 Run every quickstart.md scenario (1–5) end-to-end against the emulator, including Scenario 4 (a removed member's next request — not their already-open view — gets `403`) and the out-of-scope checks (no date-range/pagination controls exist; no action-item completion UI exists), and record the outcome.
- [X] T036 [P] Run `npm run test:server:coverage` and confirm `server/src/application/use-cases/teams/GetTeamMetrics.ts` and `server/src/domain/teams/{activitySummary,isConfident,moodScore}.ts` keep the thresholds in `server/vitest.config.ts` (branches 80 / functions 68 / lines 74 / statements 74).
- [X] T037 [P] Run `npm run test:coverage` and confirm `src/features/teams/metrics/**` keeps the thresholds in `vitest.config.ts` (branches 78 / functions 64 / lines 50 / statements 50).
- [X] T038 [P] Run `npm run type-check`, `npm run type-check:server`, and `npm run lint` and fix any findings across all changed files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — nothing to do.
- **Foundational (Phase 2)**: BLOCKS all user stories (every story's backend task reads or extends the `TeamMetricsPort`/`TeamMetricsSummary` shape T001 defines).
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion.
  - US2 and US3 both extend the *same* `FirestoreTeamMetricsAdapter.getTeamMetrics` method and the *same* `TeamMetricsPanel` component US1 creates — they cannot start meaningfully before US1's T009/T014 land, even though their own logic (action-items chunked count; mood scoring) is otherwise independent of each other.
  - US3 has no dependency on US2 beyond both editing the same two files sequentially (T020 then T030 in the adapter; T021 then T031 in the panel) — a team could ship US1+US3 without US2's action-items count if reprioritized.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests MUST be written and FAIL before their corresponding implementation task (constitution Principle I).
- Port/type definition before use-case; use-case before adapter; adapter before route; route before wiring; backend contract before frontend client; client before hook; hook before components; components before page integration.
- WCAG pass is the last implementation task in each story, once that story's UI exists.

### Parallel Opportunities

- T002, T003, T004, T005, T006 (US1 tests) touch five different files — all parallel.
- T007 (US1 impl, `activitySummary.ts`) has no dependency on T008 (`GetTeamMetrics.ts`) — parallel; T009 depends on T007 and follows.
- T012 (US1, frontend client types) can proceed in parallel with T010/T011 (US1 backend route/wiring) once T009 has landed, since it only needs the contract, not the running backend.
- T016 (US1 i18n) has no dependency on T007–T015 and can proceed in parallel.
- T019 (US2 test) and T022 (US2 i18n) touch different files than the T020/T021 chain — parallel once available.
- T025, T026, T027 (US3 tests) touch three different files — parallel.
- T028 and T029 (US3 impl, `isConfident.ts` vs. `moodScore.ts`) touch different files and have no dependency on each other — parallel; T030 depends on both and follows.
- T032 (US3 i18n) has no dependency on T028–T031 and can proceed in parallel.
- T036, T037, T038 (Polish) are independent verification commands — parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test computeActivitySummary in server/test/domain/teams/activitySummary.test.ts"
Task: "Unit test GetTeamMetrics's membership-check/delegation branches in server/test/application/use-cases/teams/GetTeamMetrics.test.ts"
Task: "Hook test useTeamMetricsQuery in src/test/features/teams/metrics/useTeamMetricsQuery.test.ts"
Task: "Component test ActivitySummary in src/test/features/teams/metrics/ActivitySummary.test.tsx"
Task: "Component test TeamMetricsPanel in src/test/features/teams/metrics/TeamMetricsPanel.test.tsx"

# Launch independent-file implementation tasks for User Story 1 together:
Task: "computeActivitySummary in server/src/domain/teams/activitySummary.ts"
Task: "GetTeamMetrics use-case in server/src/application/use-cases/teams/GetTeamMetrics.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (nothing to do).
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1 (activity figures only), 3, and 5 independently.
5. Deploy/demo if ready — an owner/member can see their team's retrospective count and average
   participation, with `actionItemsCreated: 0` and `moodEvolution: []` still placeholders.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate with quickstart.md Scenarios 1 (partial), 3, 5 → deploy/demo (MVP!).
3. Add User Story 2 → validate the action-items portion of Scenario 1 → deploy/demo.
4. Add User Story 3 → validate with Scenario 2 → deploy/demo.
5. Phase 6 Polish → full quickstart.md pass (including Scenario 4), coverage/lint/type-check verification.

### Parallel Team Strategy

With multiple developers, once Foundational (Phase 2, T001) is done:

- Developer A: User Story 1 (T002–T018) — the only story with the route/wiring/panel-shell work
  every later story depends on.
- Developer B: prepares User Story 2's test scaffolding (T019) and reads research.md item 4 ahead of
  time, ready to implement (T020–T024) as soon as T009 (US1's adapter method) exists.
- Developer C: prepares User Story 3's test scaffolding (T025–T027) and the two pure mood-scoring
  duplicates (T028–T029), which only need T001 from Foundational — not US1 or US2 — before starting,
  though wiring them into the adapter (T030) still waits on T009/T020.

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them.
- [Story] labels map every user-story-phase task to its story in spec.md for traceability.
- Each user story is independently completable and testable per its Independent Test description.
- Verify each test fails before implementing the task it covers (TDD, Principle I).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- Out of scope for every task above (per spec.md Assumptions/Clarifications, do not implement): a
  date-range or "last N retrospectives" filter, an action-item completion/status field or UI, editing
  a team's metrics data (this panel is read-only), and any live/real-time re-check of membership while
  a panel session is already open.
