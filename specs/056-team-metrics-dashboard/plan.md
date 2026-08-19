# Implementation Plan: Team Retrospective Metrics Dashboard

**Branch**: `056-team-metrics-dashboard` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/056-team-metrics-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Give any current owner or member of a team a read-only panel showing that team's aggregated
retrospective activity, computed across the team's full history (no date-range or count bound):
total retrospectives, average participants per retrospective, total action items created, and each
retrospective's mood score in chronological order (`null` where no confident sentiment data exists).
Access is denied to non-members on every request (not live-monitored while a session stays open, per
Clarifications). No new persisted entity is introduced — the panel is a derived aggregation over four
already-existing Firestore collections (`teams`, `teamMemberships`, `retrospectives`, `actionItems`,
`sentimentResults`).

Technical approach: one new backend endpoint, `GET /api/teams/:id/metrics`, added to the existing
`teamsRouter` (`server/src/http/routes/teams.ts`), backed by a new `TeamMetricsPort` /
`FirestoreTeamMetricsAdapter` pair (a dedicated adapter rather than extending `FirestoreTeamsAdapter`,
`FirestoreBoardsAdapter`, `FirestoreActionItemAdapter`, or `FirestoreSentimentResultAdapter`, since
none of those existing ports "owns" a cross-collection read spanning all four). The per-retrospective
mood score reuses the two tiny, dependency-free pure functions the live per-board mood dashboard
already relies on (`isConfident`, `calculateMoodScore`), duplicated server-side under
`server/src/domain/teams/` (frontend and backend are separate TypeScript projects with no
existing cross-import precedent) with parity unit tests against the frontend originals, applied to
the *raw* (not column-role-adjusted) sentiment distribution — the column-role reclassification the
live per-board dashboard does is intentionally not replicated here (see research.md item 5). The
frontend adds one hook (`useTeamMetricsQuery`) and one panel component, surfaced from the existing
`TeamDetail` page — no new route, no new dependency (no charting library exists in `package.json`
today, so mood evolution renders as an ordered list, not a chart).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict` mode, per constitution Technology Stack standard), Node.js backend, React 18 frontend.

**Primary Dependencies**: Express 5 + `firebase-admin` 14 (Admin SDK Firestore access, backend); React 18 + `react-router-dom` + `i18next` + `framer-motion` (frontend). No new dependency introduced — every piece reuses what's already in `package.json`, including the 054-built `src/features/teams/` module (`useTeamQuery`, `backendTeamsClient`, `TeamDetail` page) and the existing sentiment domain formulas (`isConfident`, `calculateMoodScore`).

**Storage**: Firestore, backend-only via Admin SDK. No new collection and no new persisted field. Reads (read-only) four existing collections: `teamMemberships` (via `TeamsPort.getMembership`, for authorization), `retrospectives` (`where('teamId', '==', teamId)`, for count/average-participants), `actionItems` (chunked `where('retrospectiveId', 'in', chunk)`, for the created-count total), and `sentimentResults` (chunked `where('retrospectiveId', 'in', chunk)`, for per-retrospective mood).

**Testing**: Vitest (`vitest.config.ts` for frontend/jsdom, `server/vitest.config.ts` for backend/node) + `@testing-library/react`; Playwright (`@playwright/test`) for E2E against the Firebase emulator, matching the project's existing dual-suite setup.

**Target Platform**: Web — Vite-built SPA frontend, Express backend bundled for Vercel serverless functions (existing `npm run build:backend` / `vercel --prod` pipeline). No new deployment target.

**Project Type**: Web application (existing frontend `retro-rocket/src/` + backend `retro-rocket/server/src/` in one repo) — see Project Structure below.

**Performance Goals**: No new latency target beyond ordinary request-response — aggregation happens on-demand when the panel is opened (FR-011: no real-time/live-update requirement). No pagination or caching layer is introduced in this iteration; this mirrors the existing unbounded-query precedent `FirestoreBoardsAdapter.listBoardsForUser` already sets, and is revisited only if real usage shows it's needed (Simplicity/YAGNI).

**Constraints**: Must not weaken `firestore.rules` — every read goes through the Admin SDK (server-side only, exactly like every other team/board/action-item/sentiment read today); no client-side Firestore access is introduced. Access must be denied to non-members on every request per FR-002/003/004, with no requirement to actively tear down an already-open view (Clarifications, 2026-08-19). Must keep the backend coverage floor (`server/vitest.config.ts`: branches 80 / functions 68 / lines 74 / statements 74) and the frontend's floor (`vitest.config.ts`: branches 78 / functions 64 / lines 50 / statements 50).

**Scale/Scope**: Small, additive slice: 3 user stories, 0 new persisted entities, 1 new REST endpoint (`GET /api/teams/:id/metrics`), 1 new backend port + adapter, 2 new small pure domain functions (server-side mood-scoring duplicates), 1 new frontend hook, 1 new panel component (plus 2-3 small subcomponents) surfaced from the existing `TeamDetail` page.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — no changes required either pass.*

| Principle | Status | How this feature satisfies it |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | PASS | tasks.md (next phase) will sequence a failing test before each new unit: the two ported pure mood functions, `GetTeamMetrics` use-case, `FirestoreTeamMetricsAdapter`'s aggregation logic, `useTeamMetricsQuery`, and the new panel components. |
| II. Library-First | PASS | The new capability lands as a small, self-contained addition to the existing `teams` vertical slice on both sides (backend: `server/src/application/{ports,use-cases}/teamMetrics.ts`; frontend: `src/features/teams/metrics/`), with a clear boundary (`TeamMetricsPort`) rather than being scattered across existing files. |
| III. Prefer Proven Third-Party Libraries | PASS | Zero new dependencies. Mood evolution is rendered as a plain ordered list/table rather than pulling in a new charting library the project doesn't currently depend on. |
| IV. SOLID | PASS | `TeamMetricsPort` is a narrow, purpose-built interface (Interface Segregation) implemented by one adapter that owns the cross-collection read; the route handler and use-case never touch Firestore directly (Dependency Inversion). Authorization stays owned by `TeamsPort.getMembership` (054) — not re-implemented. |
| V. Simplicity (KISS + YAGNI) | PASS | No new Firestore collection or field; no pagination/caching layer; mood scoring reuses the existing formula without replicating the live dashboard's column-role reclassification (research.md item 5) — the spec's acceptance criteria only require a per-retrospective value in chronological order, not per-column breakdown. |
| VI. Unit Testing & Coverage Floor | PASS (planned) | New pure functions, the new use-case, and the new hook/components get Vitest coverage against fakes/fixtures; `FirestoreTeamMetricsAdapter` follows the project's existing, documented exception for thin Admin-SDK adapter code (E2E-covered, not unit-mocked) — same treatment every other Firestore adapter already receives. |
| VII. E2E Testing with Playwright | PASS (planned) | quickstart.md's scenarios (owner/member views metrics, non-member denied, empty-team state, mood "no data" case) become Playwright coverage extending the existing teams E2E specs. |
| VIII. WCAG 2.1 AA | PASS (planned, flagged for implementation) | The new panel (empty states, the mood list, and any trend indicator) must independently meet contrast/focus/keyboard requirements in both themes and MUST NOT convey the mood trend (up/down/stable) by color alone — flagged here so `/speckit-tasks` and the frontend-agent apply it, not deferred silently. |
| IX. Apple-Inspired Design & Motion Tooling | PASS (planned, flagged for implementation) | Any visual/motion decision for the new panel (e.g. its entrance, mirroring `TeamDetail.tsx`'s existing `motion.header` pattern) must go through the `apple-design`/`emil-design-eng`/`animate` skill package per Principle IX — flagged for the implementation phase. |

No violations. **Complexity Tracking is not needed** — no principle exception is being taken.

## Project Structure

### Documentation (this feature)

```text
specs/056-team-metrics-dashboard/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── team-metrics-api.md          # Phase 1 output (/speckit-plan command)
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/src/
│   ├── application/
│   │   ├── ports/
│   │   │   └── teamMetrics.ts                      # NEW — TeamMetricsPort, TeamMetricsSummary, RetrospectiveMoodPoint
│   │   └── use-cases/teams/
│   │       └── GetTeamMetrics.ts                   # NEW — membership check (TeamsPort.getMembership) + delegates to TeamMetricsPort
│   ├── domain/teams/                                   # EXISTING (054, already has selectNextOwner.ts)
│   │   ├── activitySummary.ts                      # NEW — pure retrospectiveCount/averageParticipants helper
│   │   ├── isConfident.ts                          # NEW — server-side duplicate of the frontend pure predicate
│   │   └── moodScore.ts                            # NEW — server-side duplicate of calculateMoodScore
│   ├── adapters/firebase/
│   │   └── FirestoreTeamMetricsAdapter.ts          # NEW — reads retrospectives/actionItems/sentimentResults by teamId
│   └── http/
│       ├── routes/teams.ts                         # + GET /api/teams/:id/metrics
│       └── teams-wiring.ts                         # + constructs FirestoreTeamMetricsAdapter, passes as teamMetricsPort dep
├── server/test/
│   ├── domain/teams/{activitySummary,isConfident,moodScore}.test.ts   # NEW — incl. parity fixtures vs. src/ originals
│   └── application/use-cases/teams/GetTeamMetrics.test.ts   # NEW
├── src/
│   ├── features/teams/
│   │   ├── metrics/
│   │   │   ├── services/backendTeamMetricsClient.ts # NEW — GET /api/teams/:id/metrics
│   │   │   ├── hooks/useTeamMetricsQuery.ts          # NEW
│   │   │   ├── components/
│   │   │   │   ├── TeamMetricsPanel.tsx              # NEW — top-level panel, empty-state handling
│   │   │   │   ├── ActivitySummary.tsx               # NEW — retrospective count + average participants
│   │   │   │   ├── ActionItemsSummary.tsx            # NEW — action items created total
│   │   │   │   └── MoodEvolutionList.tsx             # NEW — per-retrospective mood, chronological, "no data" rows
│   │   │   └── types/teamMetrics.ts                  # NEW — frontend TeamMetricsSummary/RetrospectiveMoodPoint types
│   │   └── (existing 054/055 files unchanged: useTeamQuery, backendTeamsClient, TeamMemberList, etc.)
│   └── locales/{en,es}.json                          # + new metrics-panel i18n keys
├── src/test/features/teams/metrics/
│   └── {useTeamMetricsQuery,TeamMetricsPanel,ActivitySummary,ActionItemsSummary,MoodEvolutionList}.test.tsx  # NEW
├── src/pages/TeamDetail.tsx                          # + renders TeamMetricsPanel for the current team
└── e2e/ (wherever the existing teams Playwright specs live)    # + team-metrics scenarios
```

**Structure Decision**: No new top-level directory. Backend additions stay inside the existing
`teams` vertical slice (new port/use-case/adapter files, same directories 054 already established).
Frontend additions live in a new `src/features/teams/metrics/` subfolder — kept separate from 054's
existing `teams/` files (membership CRUD) since this is a distinct read-only capability with its own
hook/components, surfaced from the existing `TeamDetail` page rather than a new route.

## Complexity Tracking

*Not applicable — no Constitution Check violations were identified; this table is intentionally empty.*
