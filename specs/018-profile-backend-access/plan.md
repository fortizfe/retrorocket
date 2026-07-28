# Implementation Plan: Mi Perfil Backend-Mediated Firebase Access

**Branch**: `018-profile-backend-access` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-profile-backend-access/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The "Mi Perfil" screen currently reads/writes a Firestore `users/{uid}` document directly from the browser via `src/features/auth/services/userService.ts` (`getUserProfile`, `createUserProfile`, `updateUserProfile`, `addProviderToUser`), invoked from `UserContext.tsx`'s bootstrap logic and its `updateDisplayName` action. This feature adds two new session-authenticated REST endpoints under `/api/profile` to the existing hexagonal backend (`server/src/`) — an idempotent get-or-create `GET /api/profile` and a `PATCH /api/profile` for the display name — backed by a new `ProfilePort`/`FirestoreProfileAdapter` (the backend's first server-side owner of the `users/{uid}` document; today only Firebase Auth custom claims exist server-side, per `FirebaseIdentityAdapter`). `UserContext.tsx` is repointed at a new `backendProfileClient.ts`, and `userService.ts` (whose remaining live call sites all move to the backend, and whose other methods are confirmed dead code) is deleted outright. Sign-out already goes through `POST /api/auth/logout` (`014-backend-auth-foundation`) and needs no change; linked-provider viewing/linking and connected-AI-assistant (MCP) viewing/revocation are already fully backend-mediated from prior features and require only regression verification. This mirrors the exact domain → ports → use-cases → adapters → http/routes layering `017-dashboard-backend-access` established for the Dashboard migration.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js, ES2022 target) — matches existing `server/tsconfig.json`

**Primary Dependencies**: Express 5, `firebase-admin` (Firestore Admin SDK), `express-rate-limit` — no new dependencies

**Storage**: Cloud Firestore (`users/{uid}` collection, existing schema, unchanged), accessed only server-side via `firebase-admin` for this feature's operations

**Testing**: Vitest (`server/vitest.config.ts` for backend unit/contract tests, root `vitest.config.ts` for frontend), Playwright E2E against the Firebase emulator (`npm run e2e`) — per constitution Principles I, VI, VII

**Target Platform**: Same-origin Vercel serverless functions under `/api/*` (`retro-rocket/api/index.ts` → `server/src/http/app.ts`), identical to the existing auth/boards/MCP routes

**Project Type**: Web application (existing `frontend` (`retro-rocket/src`) + `backend` (`retro-rocket/server`) split, single npm package/workspace)

**Performance Goals**: Load/update-display-name operations complete within 3 s (p95) warm / 5 s (p95) cold-start (spec SC-001, reusing the `014`/`017` baseline)

**Constraints**: Must not introduce a new required secret or dependency beyond what `014`/`015`/`017` already provisioned; must stay within Vercel's free-tier request/read budget; frontend must keep working against the still-Firebase-authenticated client (custom-token bootstrap from `014`) for screens outside this feature's scope (real-time board collaboration)

**Scale/Scope**: Two endpoints (get-or-create, update-display-name) touching one existing collection (`users`); no new Firestore collections; scope is strictly Mi Perfil's three directly-Firebase-coupled operations — load profile (incl. implicit first-sign-in creation), update display name, sign out (spec Assumptions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)**: PASS (planned) — `tasks.md` will sequence a failing use-case/route/contract test before each corresponding implementation task, matching the existing `server/test/` structure for `auth`/`boards`.
- **II. Library-First**: PASS — the frontend-facing requirement (decoupled module inside `src/features`/`src/lib`, clear public interface, before UI wiring) is met by `src/features/auth/services/backendProfileClient.ts`, mirroring `backendAuthClient.ts`/`backendBoardsClient.ts`. The backend side follows the already-established `application/use-cases/*` layering from `014`/`017`.
- **III. Prefer Proven Third-Party Libraries**: PASS — reuses `express-rate-limit`, `firebase-admin`, all already in the project; no new dependency proposed.
- **IV. SOLID**: PASS — Firestore access sits behind a new `ProfilePort` interface (`application/ports/profile.ts`) implemented by a `FirestoreProfileAdapter`, kept separate from `IdentityStorePort` (Firebase Auth custom claims) and `BoardsPort`/`RetrospectiveReadPort` (unrelated collections), per Interface Segregation — mirrors the existing `017` precedent of keeping `BoardsPort` separate from the MCP read port.
- **V. Simplicity (KISS+YAGNI)**: PASS — folds first-sign-in creation into an idempotent `GET /api/profile` rather than a separate endpoint (mirrors `017`'s idempotent `joinBoard`); deliberately does not port `joinedBoards`/`userBoardHistory` bookkeeping server-side, since research.md §7 confirms zero callers exist today; deletes `userService.ts` outright once it becomes fully unused rather than leaving dead code in the tree.
- **VI. Mandatory Unit Testing & Coverage Floor**: PASS (planned) — new use-cases, adapter, and route handlers get Vitest coverage consistent with the ≥80% floor already enforced in `server/vitest.config.ts` and root `vitest.config.ts`.
- **VII. E2E Testing with Playwright**: PASS (planned) — `tasks.md` includes a new `e2e/profile.spec.ts` critical-flow spec (view/edit/sign-out/error states), since Mi Perfil currently has zero dedicated E2E coverage.
- **Technology Stack — Real-Time Data Security**: PASS — `firestore.rules` is not weakened; this feature adds a server-side (Admin SDK, rules-bypassing-by-design) path to an existing collection the client no longer needs direct access to for this screen, without touching client-reachable rules.
- **Technology Stack — Error Handling & Resilience**: PASS (planned) — every new frontend call surfaces loading/error/empty states per FR-008, consistent with existing `backendAuthClient.ts`/`backendBoardsClient.ts` conventions.
- **Technology Stack — Accessibility (WCAG 2.1 AA)**: N/A change — no UI markup changes; Mi Perfil's existing components, states, and their already-compliant accessibility are preserved unchanged (spec FR-006/FR-007 require the linked-providers/MCP UI to keep working exactly as-is).

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/018-profile-backend-access/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── profile-api.yaml
├── checklists/
│   └── requirements.md  # From /speckit-specify + /speckit-clarify
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/server/src/
├── application/
│   ├── ports/
│   │   └── profile.ts                # NEW: ProfilePort + ProfileRecord/EnsureProfileInput DTOs
│   └── use-cases/
│       └── profile/
│           ├── EnsureUserProfile.ts       # NEW: get-or-create + provider union (backs GET /api/profile)
│           └── UpdateDisplayName.ts       # NEW: validate non-blank, delegate to ProfilePort
├── adapters/
│   └── firebase/
│       └── FirestoreProfileAdapter.ts     # NEW: implements ProfilePort via firebase-admin against users/{uid}
└── http/
    ├── routes/
    │   └── profile.ts                # NEW: /api/profile router (mirrors routes/boards.ts conventions)
    ├── profile-wiring.ts             # NEW: buildProfileDeps(...), mirrors boards-wiring.ts
    ├── composition-root.ts           # MODIFIED: wire buildProfileDeps alongside authDeps/boardsDeps
    └── app.ts                        # MODIFIED: mount profileRouter when profileDeps present

retro-rocket/server/test/
├── application/use-cases/profile/    # NEW: unit tests for EnsureUserProfile/UpdateDisplayName
├── adapters/firebase/
│   └── FirestoreProfileAdapter.test.ts    # NEW (emulator-backed, mirrors FirestoreBoardsAdapter.test.ts)
└── http/routes/
    └── profile.test.ts               # NEW: contract tests (mirrors boards.test.ts)

retro-rocket/src/
├── features/auth/services/
│   ├── backendProfileClient.ts       # NEW: fetch wrapper (mirrors backendAuthClient.ts / backendBoardsClient.ts)
│   └── userService.ts                # DELETED: all live call sites move to backendProfileClient (research.md §9)
├── lib/contexts/UserContext.tsx      # MODIFIED: bootstrap + updateDisplayName call backendProfileClient instead of userService
└── pages/Profile.tsx                 # UNCHANGED: already consumes userProfile/updateDisplayName/signOut from useUser()

retro-rocket/src/test/
├── architecture/
│   └── profile-no-firestore.test.ts  # NEW: static import guard (mirrors dashboard-no-firestore.test.ts)
├── features/auth/
│   ├── userService.test.ts           # DELETED: subject under test no longer exists
│   └── backendProfileClient.test.ts  # NEW
└── lib/contexts/UserContext.test.tsx # MODIFIED: swap userService mock for backendProfileClient mock

retro-rocket/e2e/
└── profile.spec.ts                   # NEW: view/edit-display-name/sign-out/error-state critical flow
```

**Structure Decision**: Existing web-application split (`retro-rocket/server` = backend, `retro-rocket/src` = frontend, one npm workspace) is reused as-is — this feature adds one new vertical slice (`profile`) to the backend and one new client module to the frontend, following the exact domain-light (no new domain types needed; `ProfileRecord` lives directly in `application/ports`) → application/ports → application/use-cases → adapters → http/routes layering already established by `014-backend-auth-foundation` and `017-dashboard-backend-access`, and the exact frontend `services/*Client.ts` pattern already established by `backendAuthClient.ts`/`backendBoardsClient.ts`/`connectedAppsService.ts`. No new top-level directories, packages, or projects are introduced. `userService.ts` is deleted rather than left in place, since it becomes fully dead code once `UserContext.tsx` is repointed.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
