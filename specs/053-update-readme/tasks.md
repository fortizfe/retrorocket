---

description: "Task list template for feature implementation"
---

# Tasks: Update README to Reflect Current Product State

**Input**: Design documents from `/specs/053-update-readme/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md)

**Tests**: No test tasks are included. Per [plan.md](plan.md)'s Constitution Check, Principle I (TDD, NON-NEGOTIABLE) does not apply — this feature adds no production code, only Markdown prose in `README.md`. Verification instead uses the manual cross-check and live walkthrough in [quickstart.md](quickstart.md), captured as Polish-phase tasks (T016–T018).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Every implementation task in this feature edits the **same single file**,
[`README.md`](../../README.md) (repository root) — there is no `src/`,
`backend/`, or `frontend/` split, per [plan.md](plan.md)'s Structure
Decision. Because every edit task shares one file, **no implementation task
is marked `[P]`**, even within a story: parallelizing them would produce
conflicting concurrent edits to the same file. Only the read-only,
non-editing verification tasks in the Polish phase are marked `[P]`.

## Phase 1: Setup

**Purpose**: Confirm the evidence this feature's requirements rest on is still current before editing begins.

- [X] T001 Re-verify the facts recorded in [research.md](research.md) are still accurate by re-running the checks it documents — `npm run` script names in `retro-rocket/package.json`, CI step names in `.github/workflows/ci.yml`, and the presence of `retro-rocket/src/features/landing/`, `retro-rocket/server/`, `retro-rocket/api/`, `retro-rocket/scripts/`; if any fact has drifted since research.md was written, update research.md's affected entry before proceeding

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish a single, current baseline of the file every subsequent task edits, so no two tasks work from inconsistent line numbers or stale content

**⚠️ CRITICAL**: No user story task can begin until this phase is complete

- [X] T002 Read `README.md` (repository root) in full and note the current line ranges of every section listed in [data-model.md](data-model.md)'s table (Key Features subsections, Project Architecture, Getting Started, Firestore Security Rules, Usage Guide subsections, Testing/CI, Roadmap), so each task below edits the correct, current location

**Checkpoint**: Baseline established — user story implementation can now begin, in priority order (all tasks touch the same file, so true concurrent work across stories is not applicable here; see Path Conventions above)

---

## Phase 3: User Story 1 - Evaluator Gets an Accurate Feature Picture (Priority: P1) 🎯 MVP

**Goal**: Every user-facing capability the product currently has is described in the README, and nothing it no longer has remains described.

**Independent Test**: Read only the updated README and confirm Anonymous Board Mode, TXT export, AI-generated editable group titles, and the live typing indicator are all described in Key Features/Usage Guide, and that no Roadmap item is already implemented — per [quickstart.md](quickstart.md) Part A, steps 1, 2, and 5.

### Implementation for User Story 1

- [X] T003 [US1] Add an Anonymous Board Mode bullet group to the Key Features section of `README.md`: the create-time toggle (default off, all board templates), the facilitator-only mid-retrospective toggle, and its effects (no card author names, no "group by user" option, no typist identity, a persistent visible mode indicator) — satisfies FR-001, per [research.md](research.md) §1 and [data-model.md](data-model.md) row "Key Features → *(new)* Anonymous Board Mode"
- [X] T004 [US1] Add "TXT" to the Export bullet in the Key Features section of `README.md`, alongside PDF and DOCX, and note that anonymous-board exports omit author names in all three formats — satisfies FR-003, per [research.md](research.md) §2
- [X] T005 [US1] Add a bullet to the "Card Grouping & AI-Assisted Suggestions" subsection of the Key Features section of `README.md` stating that suggested groups carry an editable, AI-generated title — satisfies FR-004, per [research.md](research.md) §3
- [X] T006 [US1] Add a bullet to the "Real-Time Collaboration" subsection of the Key Features section of `README.md` describing the live "who's typing" indicator, noting it respects Anonymous Board Mode — satisfies FR-005, per [research.md](research.md) §4
- [X] T007 [US1] Update the "Create a retrospective" subsection of the Usage Guide section of `README.md` to describe how to mark a new board anonymous, and update the "Facilitator mode" subsection to describe the mid-retrospective anonymity toggle — satisfies FR-002, per [data-model.md](data-model.md) rows "Usage Guide → Create a retrospective" and "Usage Guide → Facilitator mode"
- [X] T008 [US1] Update the "Export results" subsection of the Usage Guide section of `README.md` to list TXT alongside PDF/DOCX and note the anonymous-export behavior — satisfies FR-003, per [data-model.md](data-model.md) row "Usage Guide → Export results"
- [X] T009 [US1] Re-verify each of the 9 Roadmap bullets in `README.md` against the current codebase (per [research.md](research.md) §8's cross-check method); leave the Roadmap section unchanged unless a bullet is found to have shipped, in which case remove or check it off — satisfies FR-011

**Checkpoint**: At this point, User Story 1 is fully complete — a reader gets an accurate feature picture from Key Features, Export, and Usage Guide alone, and the Roadmap contains no already-shipped item.

---

## Phase 4: User Story 2 - New Contributor Runs the App on the First Try (Priority: P1)

**Goal**: Following only the Getting Started section produces a fully working local environment, including sign-in.

**Independent Test**: From a clean clone, follow only the updated Getting Started section end to end and confirm the frontend loads, the backend dev server is running, and Google/GitHub sign-in works with no undocumented step — per [quickstart.md](quickstart.md) Part B.

### Implementation for User Story 2

- [X] T010 [US2] Update step 3 ("Configure environment variables") of the Getting Started section of `README.md` to describe that `.env.example` contains both `VITE_`-prefixed frontend variables and non-prefixed backend variables (`SESSION_SIGNING_KEY`, `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`, `GITHUB_OAUTH_CLIENT_ID`/`SECRET`, `OAUTH_REDIRECT_BASE_URL`, `FIREBASE_SERVICE_ACCOUNT`, `AUTH_TEST_MODE`, `BACKEND_VERSION`, `SERVER_PORT`), without printing any real secret value — satisfies FR-007, per [research.md](research.md) §5
- [X] T011 [US2] Update step 4 ("Run in development") of the Getting Started section of `README.md` to instruct running `npm run dev:all` (or `npm run dev` + `npm run dev:server` in two terminals) instead of `npm run dev` alone, so the backend the frontend proxies `/api/*` to is actually running — satisfies FR-006, per [research.md](research.md) §5

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — the README both describes the product accurately and gets a newcomer to a fully working local environment.

---

## Phase 5: User Story 3 - Contributor Trusts the Codebase Map (Priority: P2)

**Goal**: The Project Architecture file tree, Tech Stack, and Testing & CI sections match the real repository layout and scripts.

**Independent Test**: Compare the updated README's file tree and script list against the actual repository structure and `package.json`/`ci.yml` — no first-class top-level directory or script is missing or misnamed — per [quickstart.md](quickstart.md) Part A, steps 3 and 4.

### Implementation for User Story 3

- [X] T012 [US3] Add `server/`, `api/`, `scripts/`, and `features/landing/` to the Project Architecture file tree in `README.md`, in their structurally correct positions relative to the existing entries — satisfies FR-008, per [research.md](research.md) §6
- [X] T013 [US3] Add `type-check:server`, `test:server`, and `test:server:coverage` to the "Run locally" npm script list in the Testing, Quality & CI section of `README.md` — satisfies FR-009, per [research.md](research.md) §7
- [X] T014 [US3] Split the single "Type-check, lint, and test with coverage" CI bullet in the Testing, Quality & CI section of `README.md` into explicit frontend and backend CI steps, matching `.github/workflows/ci.yml`'s "Type-check", "Type-check (backend)", "Test with coverage", and "Test backend with coverage" steps — satisfies FR-009, per [research.md](research.md) §7
- [X] T015 [US3] Add a one-sentence clarifying note to the Firestore Security Rules section of `README.md` distinguishing "Anonymous Board Mode" (a display-only concept) from Firebase Authentication's anonymous sign-in, which the rules continue to block exactly as before — satisfies FR-010, per [research.md](research.md) §1

**Checkpoint**: All three user stories are now independently complete and verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the finished README against every Success Criterion, and confirm no accurate content was lost in the process

- [X] T016 [P] Run [quickstart.md](quickstart.md) Part A (content cross-check) against the fully updated `README.md` and confirm SC-002, SC-003, SC-004, and SC-005 are all met
- [X] T017 [P] Run [quickstart.md](quickstart.md) Part B (live walkthrough: `git clone` → `npm install` → `.env` setup → `npm run dev:all` → sign-in) and confirm SC-001 is met
- [X] T018 Diff the final `README.md` against its pre-feature version and confirm every changed line traces to a [data-model.md](data-model.md) row (FR-012 accuracy) and that every unchanged, still-accurate section, its structure, ordering, and tone were preserved (FR-013)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion. Because every task edits the same `README.md`, stories MUST be completed **sequentially** in priority order (P1 → P1 → P2) rather than concurrently, to avoid conflicting edits to the same file — this differs from the general template's assumption that stories can proceed in parallel across a team
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories
- **User Story 2 (P1)**: Can start after User Story 1 is complete (same-file sequencing, not a content dependency — the two stories' edits touch different sections and are independently testable per [quickstart.md](quickstart.md))
- **User Story 3 (P2)**: Can start after User Story 2 is complete (same-file sequencing only)

### Within Each User Story

- Tasks within a story are listed in the order they appear in `README.md` top to bottom, to keep each task's "current line range" assumption (from T002) valid without re-reading the file between tasks
- Story complete before moving to the next priority

### Parallel Opportunities

- **None** among implementation tasks (T003–T015) — every task edits `README.md`, so parallel execution would conflict
- T016 and T017 in the Polish phase ARE independent of each other (one reads the file, the other runs shell commands against the live repo) and MAY run in parallel once all of T003–T015 are complete

---

## Parallel Example: Polish Phase

```bash
# Once all user stories (T003–T015) are complete, these two verification
# tasks are independent and can run together:
Task: "Run quickstart.md Part A (content cross-check) against README.md"
Task: "Run quickstart.md Part B (live walkthrough) from a clean clone"
```

No other parallel groupings exist in this feature — see Path Conventions above.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T003–T009)
4. **STOP and VALIDATE**: Run [quickstart.md](quickstart.md) Part A, steps 1–2 and 5, against the README as it stands after US1 alone
5. This alone already fixes the highest-impact gap (undocumented shipped features) and can ship as-is if US2/US3 need to wait

### Incremental Delivery

1. Complete Setup + Foundational → baseline established
2. Add User Story 1 → validate independently → the README now accurately describes the product (MVP)
3. Add User Story 2 → validate independently → newcomers can now get a working local environment from the README alone
4. Add User Story 3 → validate independently → the architecture/CI map is now trustworthy
5. Run Phase 6 Polish once all three stories are in

### Single-File Reality

Unlike a typical multi-service feature, this is one document edited by one
person (or one agent) in one sitting — there is no meaningful "parallel team
strategy" to describe, since splitting `README.md` edits across contributors
would only create merge conflicts. Sequential, story-ordered execution (as
laid out above) is the only strategy that applies.

---

## Notes

- **[Story] label** maps task to specific user story for traceability
- No task in this feature is marked `[P]` except the two Polish-phase
  verification tasks — see Path Conventions above for why
- Every implementation task cites the FR it satisfies and the research.md/
  data-model.md entry backing it — no task requires re-deriving evidence
- Commit after each user story phase (T003–T009, then T010–T011, then
  T012–T015), not after every individual task, to keep the diff reviewable
- Stop at any checkpoint to validate a story independently before continuing
