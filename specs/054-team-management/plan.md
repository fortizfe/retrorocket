# Implementation Plan: Team Management Foundation

**Branch**: `054-team-management` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/054-team-management/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Introduce a "Team" concept: any authenticated user can create a named team (with an optional
description) and automatically becomes its owner; the owner can add existing RetroRocket users as
members by exact email lookup and remove them; any member can voluntarily leave; any team member can
view the full roster, and any user can view every team they belong to. Ownership auto-transfers to
the longest-standing remaining member if the owner leaves a non-empty team; a team is never deleted
in this iteration. Retrospective linking, team metrics, and health-check surveys are explicitly out
of scope, deferred to later iterations.

Technical approach: extend the existing Express/TypeScript backend with a new `teams` vertical slice
(ports/use-cases/Firestore adapter/routes) following the exact pattern already established by the
boards (017) and profile (018) features — session-cookie auth, Admin-SDK-only Firestore access, no
client-side Firestore reads/writes. Two new flat Firestore collections (`teams`, `teamMemberships`),
denied at the `firestore.rules` level like the existing MCP collections. A new `src/features/teams/`
frontend module and two new routes (`/teams`, `/teams/:id`) reuse the existing `AuthGuard`, fetch-based
backend-client, and i18next conventions. See research.md for the specific decisions and rationale.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict` mode, per constitution Technology Stack standard), Node.js backend, React 18 frontend.

**Primary Dependencies**: Express 5 + `firebase-admin` 14 (Admin SDK Firestore access, backend); React 18 + `react-router-dom` + `i18next` + `react-hot-toast` (frontend). No new dependency is introduced — every piece reuses what's already in `package.json`.

**Storage**: Firestore, backend-only via Admin SDK. Two new collections: `teams`, `teamMemberships` (see data-model.md). Reuses the existing `users/{uid}` profile collection read-only for the exact-email lookup (research.md item 2).

**Testing**: Vitest (`vitest.config.ts` for frontend/jsdom, `server/vitest.config.ts` for backend/node) + `@testing-library/react`; Playwright (`@playwright/test`) for E2E against the Firebase emulator, matching the project's existing dual-suite setup.

**Target Platform**: Web — Vite-built SPA frontend, Express backend bundled for Vercel serverless functions (existing `npm run build:backend` / `vercel --prod` pipeline). No new deployment target.

**Project Type**: Web application (existing frontend `retro-rocket/src/` + backend `retro-rocket/server/src/` in one repo) — see Project Structure below.

**Performance Goals**: No new performance target beyond the spec's UX time-bounds (SC-001/002/005: create/add/remove reflected within tens of seconds, i.e. ordinary request-response latency — no real-time/streaming requirement, unlike the retrospective board's live card sync).

**Constraints**: Must not weaken `firestore.rules` (constitution Technology Stack: Real-Time Data Security) — new collections get an explicit deny, Admin-SDK-only access. Must not create a Firebase Auth account as a side effect of a failed member search (FR-006). Must keep the backend coverage floor defined in `server/vitest.config.ts` (branches 80 / functions 68 / lines 74 / statements 74) and the frontend's 80/80/80/80 floor (`vitest.config.ts`).

**Scale/Scope**: Foundational CRUD-shaped feature: 3 user stories, 2 new entities, ~5 new REST endpoints, 2 new frontend pages. No metrics computation, no retrospective linkage, no health-check surveys (explicitly excluded, FR-016–FR-018).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — no changes required either pass.*

| Principle | Status | How this feature satisfies it |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | PASS | tasks.md (next phase) will sequence a failing test before each use-case/component, per the project's existing red-green-refactor convention (visible in every prior feature's `server/test/application/use-cases/**` and `src/test/features/**` structure). |
| II. Library-First | PASS | New capability isolated as its own module: `src/features/teams/` (frontend) and `server/src/application/{ports,use-cases}/teams*` + `adapters/firebase/FirestoreTeamsAdapter.ts` (backend) — decoupled from `boards`/`profile`, with a clear public interface (contracts/teams-api.md, `TeamsPort`). |
| III. Prefer Proven Third-Party Libraries | PASS | Zero new dependencies — reuses Express, `firebase-admin`, React Router, i18next, `react-hot-toast`, Vitest, Playwright, all already in `package.json`. |
| IV. SOLID | PASS | Firestore access sits behind `TeamsPort` (interface) + `FirestoreTeamsAdapter` (implementation), exactly like `BoardsPort`/`FirestoreBoardsAdapter`; use-cases depend on the port interface, never the adapter directly; UI components call the backend client, never Firestore. |
| V. Simplicity (KISS + YAGNI) | PASS | Scope is deliberately bounded to what spec.md asks for — no speculative admin/co-owner role, no team deletion, no retro-linking/metrics/health-check scaffolding (FR-015–FR-018 are explicit non-goals, not just omissions). |
| VI. Unit Testing & Coverage Floor | PASS (planned) | Every use-case gets Vitest coverage against a fake `TeamsPort` (research.md item 7); `FirestoreTeamsAdapter` follows the codebase's own pre-existing, documented exception (thin Admin SDK glue, E2E-covered) — same treatment as every other Firestore adapter, not a new carve-out. |
| VII. E2E Testing with Playwright | PASS (planned) | quickstart.md's four scenarios become a Playwright spec covering the golden path + the ownership-transfer/ownerless edge case, consistent with how boards/profile got E2E coverage for their primary flows. |
| VIII. WCAG 2.1 AA | PASS (planned, flagged for implementation) | New UI surfaces (team creation form, member add/remove controls, roster list) must independently meet contrast/focus/keyboard/color-redundancy requirements in both themes — flagged here so `/speckit-tasks` and the frontend-agent apply it, not deferred silently. |
| IX. Apple-Inspired Design & Motion Tooling | PASS (planned, flagged for implementation) | Any visual/motion decision for the new team screens (list transitions, add/remove feedback) must go through the `apple-design`/`emil-design-eng`/`animate` skill package per Principle IX — flagged for the implementation phase, which is where those skills apply (not at planning time). |

No violations. **Complexity Tracking is not needed** — no principle exception is being taken.

## Project Structure

### Documentation (this feature)

```text
specs/054-team-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── teams-api.md     # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/src/
│   ├── application/
│   │   ├── ports/
│   │   │   └── teams.ts                       # TeamsPort, TeamSummary, TeamMemberView, CreateTeamInput, etc.
│   │   └── use-cases/teams/
│   │       ├── CreateTeam.ts
│   │       ├── ListTeamsForUser.ts
│   │       ├── GetTeamWithMembers.ts
│   │       ├── AddTeamMember.ts
│   │       ├── RemoveTeamMember.ts             # handles owner-removes-other and self-leave (non-owner)
│   │       └── LeaveTeam.ts                    # owner-leaves path: selectNextOwner + transfer/empty logic
│   ├── domain/teams/
│   │   └── selectNextOwner.ts                  # pure helper, earliest-joinedAt selection (data-model.md)
│   ├── adapters/firebase/
│   │   └── FirestoreTeamsAdapter.ts            # implements TeamsPort; also does the exact-email lookup against `users`
│   └── http/
│       ├── routes/teams.ts                     # mirrors routes/boards.ts structure
│       └── teams-wiring.ts                     # mirrors boards-wiring.ts
├── server/test/
│   ├── application/use-cases/teams/*.test.ts
│   └── domain/teams/selectNextOwner.test.ts
├── src/
│   ├── features/teams/
│   │   ├── components/                          # TeamCreateForm, TeamMemberList, AddMemberByEmailForm, TeamsOverviewList
│   │   ├── hooks/                                # useTeamsQuery, useTeamQuery, useTeamMembershipActions
│   │   ├── services/backendTeamsClient.ts        # mirrors backendBoardsClient.ts
│   │   └── types/team.ts
│   ├── pages/
│   │   ├── Teams.tsx                             # /teams — overview (User Story 3) + create action (User Story 1)
│   │   └── TeamDetail.tsx                        # /teams/:id — roster + membership actions (User Stories 1–2)
│   ├── locales/{en,es}.json                      # + new "teams" key namespace
│   └── App.tsx                                   # + two new lazy routes, inside existing AuthGuard
├── src/test/features/teams/**                    # Vitest + Testing Library, mirrors src/test/features/dashboard/**
└── e2e/ (or wherever the existing Playwright specs live) team-management.spec.ts
```

**Structure Decision**: This is the existing "web application" layout already in place in this
repo — a single frontend (`retro-rocket/src/`) and a single backend (`retro-rocket/server/src/`)
sharing one `package.json`/build pipeline, not the generic `backend/` + `frontend/` two-root layout
from the template. Team management is added as a new vertical slice inside each side, following the
`boards`/`profile` precedent file-for-file (ports → use-cases → Firestore adapter → routes → wiring on
the backend; feature module → pages → routes on the frontend) rather than introducing any new
top-level directory or architectural layer.

## Complexity Tracking

*Not applicable — no Constitution Check violations were identified; this table is intentionally empty.*
