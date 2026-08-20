---

description: "Task list for feature implementation"
---

# Tasks: In-App Getting Started User Guide

**Input**: Design documents from `/specs/057-getting-started-guide/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE), tests MUST be included and MUST be written before their corresponding implementation task. Tests below use Vitest + Testing Library and follow this repo's convention of a mirrored `retro-rocket/src/test/` tree (not colocated with source files) — see `src/test/pages/Landing.test.tsx`, `src/test/features/teams/`, `src/test/lib/components/layout/Header.test.tsx`.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All file paths are relative to `retro-rocket/` (the app root)

## Path Conventions

Existing project convention (plan.md Project Structure): `src/features/<domain>/{components,hooks,content}` for capability modules, `src/pages/<Route>.tsx` for thin route wrappers, `src/test/<mirrored path>` for tests, `src/locales/{en,es}.json` for all user-visible copy.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new feature module's directories and i18n namespace before any story-specific work begins.

- [X] T001 Create the `src/features/guide/` module skeleton (`components/`, `content/`, `hooks/` subdirectories) per plan.md's Project Structure
- [X] T002 [P] Add an empty `"guide": {}` namespace object to `src/locales/en.json`
- [X] T003 [P] Add an empty `"guide": {}` namespace object to `src/locales/es.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The minimal route + page shell every user story renders into. No topic content or navigation logic yet — just enough for `/guide` to resolve to something.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Write a failing test asserting `src/pages/Guide.tsx` renders the `GuidePage` layout component, in `src/test/pages/Guide.test.tsx`
- [X] T005 Create `src/pages/Guide.tsx` as a thin route wrapper rendering `GuidePage` (matches the existing `Dashboard.tsx`/`Teams.tsx` convention) — makes T004 pass
- [X] T006 [P] Write a failing test asserting `GuidePage` renders a page frame/content area, in `src/test/features/guide/GuidePage.test.tsx`
- [X] T007 Implement the base `GuidePage.tsx` layout shell (page frame only, no side nav yet) in `src/features/guide/components/GuidePage.tsx` — makes T006 pass
- [X] T008 Register a lazy-loaded `/guide` route rendering `Guide` in `src/App.tsx`, following the existing `lazy(() => import(...))` pattern used for `Dashboard`/`Teams`

**Checkpoint**: `/guide` resolves to an (empty) page shell. User story implementation can now begin.

---

## Phase 3: User Story 1 - Discover the guide from the landing page or from inside the app (Priority: P1) 🎯 MVP

**Goal**: A signed-out visitor can find and open the guide from the landing page without being asked to sign in; a signed-in user can find and open the same guide from inside the authenticated app.

**Independent Test**: Open the landing page signed out, locate and activate the new entry point, confirm `/guide` loads with visible overview content and no login prompt; separately, sign in and confirm the guide is reachable from the header/account menu.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T009 [P] [US1] Write a failing test asserting the landing page renders a labeled "Getting Started" entry point linking to `/guide`, in `src/test/features/landing/LandingHero.test.tsx`
- [X] T010 [P] [US1] Write a failing test asserting `Header.tsx` renders a guide entry point (visible once authenticated) linking to `/guide`, in `src/test/lib/components/layout/Header.test.tsx` (extend existing file)
- [X] T011 [P] [US1] Write a failing test asserting `GuidePage` renders overview welcome copy sourced from `guide.overview.*` i18n keys when no topic is selected, in `src/test/features/guide/GuidePage.test.tsx` (extend)

### Implementation for User Story 1

- [X] T012 [P] [US1] Add a "Getting Started" / "Guía de uso" entry-point element to `src/features/landing/components/LandingHero.tsx`, linking to `/guide` — makes T009 pass
- [X] T013 [P] [US1] Add a guide entry point (header nav item or account/user-menu item) to `src/lib/components/layout/Header.tsx`, linking to `/guide` — makes T010 pass
- [X] T014 [US1] Add `guide.entryPoint.*` and `guide.overview.*` i18n keys (entry-point label, overview welcome copy) to `src/locales/en.json` and `src/locales/es.json`
- [X] T015 [US1] Render the overview welcome copy from `guide.overview.*` in `GuidePage.tsx` as the default view before any topic is selected — makes T011 pass
- [X] T016 [US1] Add a "back to landing / back to app" affordance to `GuidePage.tsx` (FR-011), linking to `/` for a signed-out visitor or `/mis-tableros` for a signed-in user
- [X] T017 [US1] Confirm `/guide` is reachable without authentication (no `AuthWrapper requireAuth` wrapper, unlike `/mcp/consent`) in `src/App.tsx`, and cover it with an assertion in `src/test/pages/Guide.test.tsx` (extend)

**Checkpoint**: User Story 1 is fully functional and independently testable — the guide is discoverable and openable from both the landing page and the authenticated app.

---

## Phase 4: User Story 2 - Browse feature topics via a persistent side menu (Priority: P1)

**Goal**: A persistent, categorized side menu lists every guide topic; selecting one shows its content in place with the menu reflecting the active selection; each topic has its own deep-linkable URL.

**Independent Test**: Open the guide with the full topic registry in place, switch between at least two topics via the side menu, confirm content and active-state indicator update correctly; open a topic's direct URL and confirm it lands on the right topic with the correct active state.

### Tests for User Story 2 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T018 [P] [US2] Write a failing test asserting the topic/category registry has unique topic ids, every topic's `categoryId` resolves to a real category, and all 12 topics from spec.md FR-006 are present, in `src/test/features/guide/topics.test.ts`
- [X] T019 [P] [US2] Write a failing test asserting `useActiveGuideTopic` resolves the active topic from the `:topicSlug` route param and returns "no active topic" (overview) for an unknown slug, in `src/test/features/guide/useActiveGuideTopic.test.ts`
- [X] T020 [P] [US2] Write a failing test asserting `GuideSideNav` renders every topic grouped under its category heading and marks the active topic with `aria-current="page"`, in `src/test/features/guide/GuideSideNav.test.tsx`
- [X] T021 [P] [US2] Write a failing test asserting `GuideTopicContent` renders the selected topic's title/summary/body from its i18n keys, in `src/test/features/guide/GuideTopicContent.test.tsx`

### Implementation for User Story 2

- [X] T022 [US2] Define the `GuideCategory`/`GuideTopic` TypeScript types and the full registry (all categories + all 12 topics per data-model.md, structural fields only) in `src/features/guide/content/topics.ts` — makes T018 pass
- [X] T023 [US2] Add `guide.categories.*` and `guide.topics.*.title` / `guide.topics.*.summary` i18n keys (labels only — full body content is added in User Story 3) to `src/locales/en.json` and `src/locales/es.json`
- [X] T024 [US2] Implement `useActiveGuideTopic` in `src/features/guide/hooks/useActiveGuideTopic.ts` (research.md Decision 2), including the unknown-slug fallback — makes T019 pass
- [X] T025 [US2] Implement `GuideSideNav.tsx` as a `<nav>` landmark with category-grouped `<Link>`s using `aria-current="page"` for the active topic (research.md Decision 3) in `src/features/guide/components/GuideSideNav.tsx` — makes T020 pass
- [X] T026 [US2] Implement `GuideTopicContent.tsx` rendering the active topic's title/summary/body from i18n keys in `src/features/guide/components/GuideTopicContent.tsx` — makes T021 pass
- [X] T027 [US2] Wire `GuideSideNav` and `GuideTopicContent` into `GuidePage.tsx`, replacing the static US1 overview with topic-aware rendering driven by `useActiveGuideTopic`, while preserving the overview as the default/no-topic-selected state
- [X] T028 [US2] Register the nested `/guide/:topicSlug` route in `src/App.tsx`
- [X] T029 [US2] Verify the unknown-slug edge case end-to-end: `GuidePage.tsx` falls back to the overview when `useActiveGuideTopic` returns no match (spec.md Edge Cases), with an assertion in `src/test/features/guide/GuidePage.test.tsx` (extend)

**Checkpoint**: User Stories 1 and 2 both work independently — the full navigable menu structure is in place and deep-linkable.

---

## Phase 5: User Story 3 - Learn how to use a feature in plain language (Priority: P2)

**Goal**: Every one of the 12 topics has complete, plain-language, non-technical, step-by-step content; the MCP/AI-assistant topic summarizes and links out to the existing dedicated connector guide instead of duplicating it.

**Independent Test**: Open any topic and confirm a non-technical reader can understand what the feature does and how to use it; open the MCP topic and confirm it gives a short summary plus a working link to `docs/mcp-guia-usuario.md`'s guide rather than repeating its setup steps.

### Tests for User Story 3 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T030 [P] [US3] Write a failing test asserting every topic's `bodyKey` resolves to non-empty content in both `en.json` and `es.json`, in `src/test/features/guide/topics.test.ts` (extend)
- [X] T031 [P] [US3] Write a failing test asserting `GuideTopicContent` renders an external link for the "Connecting AI Assistants" topic when `externalGuideUrl` is set, in `src/test/features/guide/GuideTopicContent.test.tsx` (extend)

### Implementation for User Story 3

- [X] T032 [US3] Write the full plain-language `guide.topics.*.body` content (step-by-step, no framework/API/code terminology) for all 12 topics from spec.md FR-006 in `src/locales/en.json` — makes T030 pass
- [X] T033 [US3] Translate the same content into `src/locales/es.json`, matching the tone/style of the existing `docs/mcp-guia-usuario.md` guide
- [X] T034 [US3] Set `externalGuideUrl` on the "Connecting AI Assistants" topic entry in `src/features/guide/content/topics.ts`, pointing at the MCP connector guide, and render it as a link in `GuideTopicContent.tsx` — makes T031 pass
- [X] T035 [US3] Read through every topic's rendered content against the actual current UI/behavior it describes (docs-agent's verification discipline: document what exists, not what was planned) and correct any inaccurate or stale step before considering the story done

**Checkpoint**: FR-006, FR-007, FR-010, and SC-003 are satisfied — the guide is fully informative on its own.

---

## Phase 6: User Story 4 - Use the guide comfortably on a small screen (Priority: P3)

**Goal**: On mobile-sized screens, the side menu collapses behind a toggle instead of obscuring content, while remaining fully navigable.

**Independent Test**: Open the guide at a mobile-sized viewport, confirm the menu doesn't obscure content and every topic remains reachable via a toggle; select a topic and confirm the menu gets out of the way.

### Tests for User Story 4 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T036 [P] [US4] Write a failing test asserting `GuideSideNav` renders a collapse toggle and the panel is collapsed by default below the `md` breakpoint, in `src/test/features/guide/GuideSideNav.test.tsx` (extend)
- [X] T037 [P] [US4] Write a failing accessibility/E2E check asserting no overlapping or clipped content at a mobile viewport width, in `e2e/accessibility.spec.ts` (extend) or a new `e2e/guide.spec.ts`

### Implementation for User Story 4

- [X] T038 [US4] Use the `apple-design`/`emil-design-eng` skills to design the mobile collapse layout for `GuideSideNav.tsx`, per Constitution Principle IX (NON-NEGOTIABLE for any new UI/layout decision)
- [X] T039 [US4] Implement the collapsible toggle + panel behavior in `GuideSideNav.tsx`, using the `animate` skill to decide the transition (spring/duration/interruption behavior), honoring the app's existing `MotionConfig reducedMotion="user"` — makes T036 pass
- [X] T040 [US4] Ensure selecting a topic on a mobile viewport automatically collapses the panel so content is fully visible, in `GuideSideNav.tsx` / `GuidePage.tsx` — makes T037 pass

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and documentation that span all stories.

- [X] T041 [P] Extend `e2e/accessibility.spec.ts` with a WCAG 2.1 AA axe scan of the guide overview and at least one topic, in both light and dark themes (Constitution Principle VIII, NON-NEGOTIABLE)
- [X] T042 [P] Run `npm run test:coverage` and confirm the new `src/features/guide/` code doesn't drop the project's coverage thresholds (Constitution Principle VI, NON-NEGOTIABLE)
- [X] T043 [P] Add a Playwright E2E spec `e2e/guide.spec.ts` covering quickstart.md Scenarios 1–4 (recommended per plan.md — the guide isn't a named critical flow under Principle VII, but coverage here reduces regression risk)
- [X] T044 [P] Update `README.md`'s `## ✨ Key Features` section to mention the new in-app Getting Started guide (docs-agent scope, per this project's documentation conventions)
- [X] T045 Run `npm run type-check` and `npm run lint` and fix any violations introduced by this feature
- [X] T046 Execute quickstart.md Scenarios 1–6 manually end-to-end and confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only.
- **User Story 2 (Phase 4)**: Depends on Foundational only. Extends `GuidePage.tsx` from US1 (T027 modifies what T015 rendered) but is independently testable on its own once the registry/nav exist — treat as sequenced after US1 in this plan since both are P1 and US2 builds directly on the page shell US1 populates, though a second developer could start US2's registry/hook/nav tasks (T018–T026) in parallel with US1.
- **User Story 3 (Phase 5)**: Depends on US2's registry and `GuideTopicContent` component existing (T022, T026) — content is written into structures US2 created.
- **User Story 4 (Phase 6)**: Depends on US2's `GuideSideNav` existing (T025) — adds responsive behavior to it.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within Each User Story

- Tests are written and confirmed failing before their corresponding implementation task.
- Registry/types before components that read them.
- Hooks before the components that consume them.
- Story complete (checkpoint) before moving to the next priority phase.

### Parallel Opportunities

- T002 and T003 (Setup) can run in parallel.
- T004 and T006 (Foundational tests) can run in parallel; implementation tasks T005/T007 depend on their respective tests.
- Within US1: T009, T010, T011 (tests) can run in parallel; T012, T013 (implementation, different files) can run in parallel.
- Within US2: T018, T019, T020, T021 (tests) can run in parallel (different files).
- Within US3: T030, T031 (tests) can run in parallel; T032, T033 (content authoring, different locale files) can run in parallel once T022/T023 exist.
- Within US4: T036, T037 (tests) can run in parallel.
- Within Polish: T041, T042, T043, T044 can all run in parallel.

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Write failing test for the topic/category registry invariants in src/test/features/guide/topics.test.ts"
Task: "Write failing test for useActiveGuideTopic in src/test/features/guide/useActiveGuideTopic.test.ts"
Task: "Write failing test for GuideSideNav in src/test/features/guide/GuideSideNav.test.tsx"
Task: "Write failing test for GuideTopicContent in src/test/features/guide/GuideTopicContent.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1–2 — the guide is discoverable and opens from both landing and the authenticated app, even with only overview content.
5. Deploy/demo if ready — this alone answers the user's core request for a navigable landing element leading to a guide page.

### Incremental Delivery

1. Setup + Foundational → shell route ready.
2. User Story 1 → validate (quickstart Scenarios 1–2) → demo (MVP).
3. User Story 2 → validate (quickstart Scenario 3) → demo (navigable menu, still with placeholder-depth content).
4. User Story 3 → validate (quickstart Scenario 4) → demo (fully informative guide — likely the real "done" bar for the user's request).
5. User Story 4 → validate (quickstart Scenario 5) → demo (mobile-usable).
6. Polish → validate (quickstart Scenario 6 + full quality gates) → release.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: User Story 1 (landing/header entry points).
   - Developer B: User Story 2's registry/hook/nav (T018–T026), which US1 doesn't block on structurally even though this plan sequences US1 first for a single-developer flow.
3. Developer(s) then move to User Story 3 (content authoring — parallelizable across en/es) once US2's registry and `GuideTopicContent` exist, and User Story 4 once `GuideSideNav` exists.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps each task to its user story for traceability.
- Tests are written and confirmed failing before implementation, per Constitution Principle I (NON-NEGOTIABLE).
- No `contracts/` tasks: this feature introduces no backend endpoint (plan.md).
- No Firestore/backend involvement in any task — this is a frontend-only, statically-bundled content feature.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
