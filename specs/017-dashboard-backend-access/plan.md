# Implementation Plan: Dashboard Backend-Mediated Firebase Access

**Branch**: `017-dashboard-backend-access` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-dashboard-backend-access/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The Dashboard ("My Boards") screen currently reads/writes Firestore directly from the browser (`userService.getUserBoards`, `createBoardFromTemplate`, `joinRetrospectiveById`, `updateRetrospective`, `OptimizedRetrospectiveService.deleteRetrospectiveCompletely`). This feature adds five new session-authenticated REST endpoints under `/api/boards` to the existing hexagonal backend (`server/src/`), backed by a new Firestore Admin adapter, and repoints the Dashboard's frontend service calls at those endpoints instead of the Firebase client SDK — with zero change to the screen's UI, controls, or observable behavior. It reuses the backend's existing session-cookie authentication (`014-backend-auth-foundation`) and mirrors the read pattern already proven for `015-mcp-read-server`'s owned+joined retrospective listing, rather than the frontend's more convoluted `joinedBoards`-array bookkeeping.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js, ES2022 target) — matches existing `server/tsconfig.json`

**Primary Dependencies**: Express 5, `firebase-admin` (Firestore Admin SDK), `express-rate-limit`, `zod` (request validation, already used in `mcp.ts`) — no new dependencies

**Storage**: Cloud Firestore (`retrospectives`, `retrospectives/{id}/columns`, `participants` collections), accessed only server-side via `firebase-admin`

**Testing**: Vitest (`server/vitest.config.ts` for backend unit/contract tests, root `vitest.config.ts` for frontend), Playwright E2E against the Firebase emulator (`npm run e2e`) — per constitution Principles I, VI, VII

**Target Platform**: Same-origin Vercel serverless functions under `/api/*` (`retro-rocket/api/index.ts` → `server/src/http/app.ts`), identical to the existing auth and MCP routes

**Project Type**: Web application (existing `frontend` (`retro-rocket/src`) + `backend` (`retro-rocket/server`) split, single npm package/workspace)

**Performance Goals**: List/create/join operations complete within 3 s (p95) warm / 5 s (p95) cold-start (spec SC-001, reusing the `014` baseline)

**Constraints**: Must not introduce a new required secret or dependency beyond what `014`/`015` already provisioned; must stay within Vercel's free-tier request/read budget (same constraint `015` operated under); frontend must keep working against the still-Firebase-authenticated client (custom-token bootstrap from `014`) for screens outside this feature's scope

**Scale/Scope**: Five endpoints (list, create, join, rename, delete) touching one existing collection family; no new Firestore collections; scope is strictly the Dashboard screen (spec FR-011)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)**: PASS (planned) — `tasks.md` will sequence a failing use-case/route/contract test before each corresponding implementation task, matching the existing `server/test/` structure for `auth`/`mcp`.
- **II. Library-First**: PASS — the principle's frontend-facing requirement (decoupled module inside `src/features`/`src/lib`, clear public interface, before UI wiring) is met by `src/features/dashboard/services/backendBoardsClient.ts`, mirroring `backendAuthClient.ts`/`connectedAppsService.ts`. The backend side follows the analogous, already-established `application/use-cases/*` layering from `014`/`015`, though that directory sits outside the principle's literal `src/features`/`src/lib` scope.
- **III. Prefer Proven Third-Party Libraries**: PASS — reuses `express-rate-limit`, `firebase-admin`, `zod`, all already in the project; no new dependency proposed.
- **IV. SOLID**: PASS — Firestore access sits behind a new `BoardsPort` interface (`application/ports/boards.ts`) implemented by a `FirestoreBoardsAdapter`, kept separate from the read-only `RetrospectiveReadPort` used by MCP so that port's read-only compile-time guarantee (FR-013 of `015`) is not weakened by adding write methods to it.
- **V. Simplicity (KISS+YAGNI)**: PASS — reuses the `participants`-collection-derived listing pattern already implemented and proven in `FirestoreRetrospectiveReadAdapter.listRetrospectivesForUser` instead of replicating the frontend's redundant `users.joinedBoards` array + `userBoardHistory` bookkeeping; delete semantics match today's exact behavior (single-document delete, no new cascade logic invented).
- **VI. Mandatory Unit Testing & Coverage Floor**: PASS (planned) — new use-cases, adapter, and route handlers get Vitest coverage consistent with the ≥80% floor already enforced in `server/vitest.config.ts`.
- **VII. E2E Testing with Playwright**: PASS (planned) — `tasks.md` includes updating/adding the Playwright board-creation/join/delete critical-flow specs to assert zero direct Firestore calls, per the project's existing E2E suite.
- **Technology Stack — Real-Time Data Security**: PASS — `firestore.rules` is not weakened; this feature adds a server-side (Admin SDK, rules-bypassing-by-design) path but preserves the same ownership checks in application code (FR-005/FR-006), and does not touch client-reachable rules.
- **Technology Stack — Error Handling & Resilience**: PASS (planned) — every new frontend call surfaces loading/error/empty states per FR-008, consistent with existing `backendAuthClient.ts`/`connectedAppsService.ts` conventions.
- **Technology Stack — Accessibility (WCAG 2.1 AA)**: N/A change — no UI markup changes; the Dashboard's existing components, states, and their already-compliant accessibility are preserved unchanged (spec FR-007).

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/017-dashboard-backend-access/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/server/src/
├── domain/
│   ├── errors.ts                 # MODIFIED: add ForbiddenError alongside AppError/NotFoundError/ConfigError
│   └── boards/
│       └── templates.ts          # NEW: ported BOARD_TEMPLATES/ACTION_COLUMN constants (research.md §5)
├── application/
│   ├── ports/
│   │   └── boards.ts             # NEW: BoardsPort + record/DTO types
│   └── use-cases/
│       └── boards/
│           ├── ListBoardsForUser.ts   # NEW
│           ├── CreateBoard.ts         # NEW
│           ├── JoinBoard.ts           # NEW
│           ├── RenameBoard.ts         # NEW
│           └── DeleteBoard.ts         # NEW
├── adapters/
│   └── firebase/
│       └── FirestoreBoardsAdapter.ts  # NEW: implements BoardsPort via firebase-admin
└── http/
    ├── routes/
    │   └── boards.ts             # NEW: /api/boards router (mirrors routes/mcp.ts conventions)
    ├── boards-wiring.ts          # NEW: buildBoardsDeps(...), mirrors mcp-wiring.ts
    └── app.ts                    # MODIFIED: mount boardsRouter when boardsDeps present

retro-rocket/server/test/
├── application/use-cases/boards/     # NEW: unit tests per use-case
├── adapters/firebase/                # NEW: FirestoreBoardsAdapter tests (emulator)
└── http/routes/
    └── boards.test.ts                # NEW: contract tests (mirrors mcpConnections.test.ts)

retro-rocket/src/
├── features/dashboard/services/
│   └── backendBoardsClient.ts    # NEW: fetch wrapper (mirrors backendAuthClient.ts / connectedAppsService.ts)
├── pages/Dashboard.tsx           # MODIFIED: call backendBoardsClient instead of userService/OptimizedRetrospectiveService
├── features/create-board/components/CreateBoardFlow.tsx  # MODIFIED: call backendBoardsClient.createBoard
├── features/dashboard/components/JoinRetrospectiveModal.tsx  # MODIFIED: call backendBoardsClient.joinBoard
└── features/dashboard/components/EditRetrospectiveModal.tsx  # MODIFIED: call backendBoardsClient.renameBoard

retro-rocket/src/test/
└── features/dashboard/services/backendBoardsClient.test.ts  # NEW
```

**Structure Decision**: Existing web-application split (`retro-rocket/server` = backend, `retro-rocket/src` = frontend, one npm workspace) is reused as-is — this feature adds one new vertical slice (`boards`) to each side, following the exact domain → application/ports → application/use-cases → adapters → http/routes layering already established by `014-backend-auth-foundation` and `015-mcp-read-server`, and the exact frontend `services/*Client.ts` pattern already established by `backendAuthClient.ts` and `connectedAppsService.ts`. No new top-level directories, packages, or projects are introduced.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
