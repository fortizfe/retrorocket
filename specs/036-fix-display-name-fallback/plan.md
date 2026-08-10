# Implementation Plan: Fix Configured Display Name Not Used on New Boards

**Branch**: `036-fix-display-name-fallback` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-fix-display-name-fallback/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Six write paths in `server/src/http/routes/retrospectives.ts` and `server/src/http/routes/boards.ts` (card creation, board creation, board/retrospective join, likes, reactions, typing status) all derive the acting user's captured display name via a local `displayNameOf(session.user)` helper that reads `session.user.displayName` — the raw Google/GitHub name baked into the session at login and never refreshed — instead of the user's actual `users/{uid}.displayName` Firestore profile field (the "Mi Perfil" configurable value, already exposed via `ProfilePort`/`GET /api/profile`). This is invisible on a board a user has interacted with before, because a prior Profile-page rename already patched that board's `participants` doc via the existing `renameParticipantsForUser` fan-out (spec 022); it is fully visible the moment a user creates or joins a board for the first time, since there is no pre-existing patched record to mask the wrong value. The fix replaces `displayNameOf(session.user)` at all six call sites with a lookup through the existing `ensureUserProfile` use case (the same one `GET /api/profile` already uses), threading `ProfilePort` into `RetrospectiveRouterDeps`/`BoardsRouterDeps` and their wiring — no new module, no schema change, no wire-protocol change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js (backend)

**Primary Dependencies**: Express 5 (`server/`), `firebase-admin` 14 (Firestore), existing `ProfilePort`/`FirestoreProfileAdapter` (feature 018) and `ensureUserProfile` use case — no new dependency

**Storage**: Firestore `users/{uid}` (profile, unchanged shape — read only, via the existing get-or-create `ensureProfile`), `participants`, `cards`, and `typingStatus` collections (unchanged shape — only the `name`/`createdByName`/`username` string value written at creation changes source)

**Testing**: Vitest 3 (`server/vitest.config.ts`, route-level tests in `server/test/http/routes/*.test.ts` and use-case tests) + Playwright E2E (`e2e/*.spec.ts`) against the Firebase emulator (`npm run e2e`)

**Target Platform**: Web (Node.js/Express backend only — no client-side change; the client already renders whatever name each record carries)

**Project Type**: Web application — single repo (`retro-rocket/`) with a Vite/React client under `src/` and an Express/Firebase-admin backend under `server/`

**Performance Goals**: No new performance goal. Each affected write path gains one additional Firestore read (`ensureProfile`'s `docRef.get()`) that it did not previously make; this is the same read `GET /api/profile` already performs on every profile-page load and is not expected to be perceptible on card/like/reaction/join/typing actions, which are already network round-trips.

**Constraints**: No change to any REST endpoint's URL, method, or response shape; no change to the WebSocket `entity_change` event shapes; no change to `ParticipantPort`/`CardPort`/`TypingStatusPort`/`BoardsPort` doc shapes — only the *source* of the `name`/`createdByName`/`username` string value passed into their existing write methods changes, from `session.user.displayName` to the resolved `ProfileRecord.displayName`. Per clarification, no backfill/migration of already-affected records.

**Scale/Scope**: Two route files (six call sites total), two wiring files, two route-level test-app builders, plus new/extended unit and E2E test coverage — no new files beyond tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Yes | Failing unit tests must be added first to `server/test/http/routes/boards.test.ts` and `retrospectives.test.ts` (and a new E2E test) that seed a session with one display name and a profile with a *different* one, then assert the created/joined record uses the profile's name — currently red against `displayNameOf`, turned green by the fix. |
| II. Library-First | Yes | No new module. Reuses the existing `ensureUserProfile` use case and `ProfilePort` (feature 018), already the sole owner of "resolve a user's configured display name." |
| III. Prefer Proven Third-Party Libraries | Yes | No new dependency — the fix is wiring an existing internal port into two more routers. |
| IV. SOLID | Yes | Dependency Inversion preserved: routes depend on `ProfilePort` (already an interface), not directly on `FirestoreProfileAdapter`; the two wiring files remain the only place a concrete adapter is constructed, mirroring `profile-wiring.ts`'s existing pattern. Single Responsibility preserved: `ensureUserProfile` remains the one place "resolve/seed a user's current profile" is decided; the routes only call it, same as `profile.ts` already does. |
| V. Simplicity (KISS/YAGNI) | Yes | No new caching layer, no session-refresh redesign, no new abstraction — reuses the get-or-create `ensureProfile` call exactly as `GET /api/profile` already does, at each of the six point-of-write call sites. |
| VI. Unit Testing & 80% Coverage Floor | Yes | New branch (profile-resolved name vs. session-cached name) requires new unit test cases in both route test files; `inMemoryProfilePort` (already exists in `server/test/application/use-cases/profile/profileFakes.ts`) is reused as the fake for both test-app builders, avoiding new test infrastructure. |
| VII. E2E Testing with Playwright | Yes | Adds one new `e2e/retrospective-board.spec.ts` (or `board-creation.spec.ts`) scenario: sign in with a raw test-login name, PATCH `/api/profile` to a different configured name, then create a *brand-new* board and card, and assert the card/participant list show the configured name immediately — the exact previously-uncovered gap (existing coverage at `retrospective-board.spec.ts:440` only tests renaming *after* content already exists on an existing board). |
| VIII. Accessibility (WCAG 2.1 AA) | No | No user-facing markup, styling, or interaction change — the client already renders whatever name string a record carries; only the backend-selected string changes. |
| IX. Apple-Inspired Design & Motion Tooling | No | No frontend/visual/motion work involved — this is a backend data-source correction. |

**Initial gate result**: PASS — no violations, no entries needed in Complexity Tracking.

**Post-Phase 1 re-check**: PASS — `data-model.md` confirms no schema/field changes to any Firestore collection; `contracts/README.md` confirms no REST/WebSocket interface change; `quickstart.md` exercises only existing test commands. Design artifacts introduce nothing that revises the initial assessment.

## Project Structure

### Documentation (this feature)

```text
specs/036-fix-display-name-fallback/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — no interface changes; see contracts/README.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/src/http/routes/
│   ├── retrospectives.ts        # MODIFIED — replace displayNameOf(session.user) at 5 call sites (join, card creation, like, reaction, typing status) with a profile-resolved name; add profilePort to RetrospectiveRouterDeps
│   └── boards.ts                 # MODIFIED — replace displayNameOf(session.user) at 2 call sites (board creation, board join) with a profile-resolved name; add profilePort to BoardsRouterDeps
├── server/src/http/
│   ├── retrospective-wiring.ts   # MODIFIED — construct and inject FirestoreProfileAdapter as profilePort, mirroring profile-wiring.ts
│   └── boards-wiring.ts          # MODIFIED — construct and inject FirestoreProfileAdapter as profilePort, mirroring profile-wiring.ts
├── server/test/http/routes/
│   ├── retrospectivesTestApp.ts  # MODIFIED — default profilePort to inMemoryProfilePort([]) so existing tests keep passing unmodified
│   ├── boardsTestApp.ts          # MODIFIED — same default
│   ├── retrospectives.test.ts    # MODIFIED — new test cases: seeded profile name wins over session displayName at each affected call site
│   └── boards.test.ts            # MODIFIED — same, for board creation/join
└── e2e/
    └── retrospective-board.spec.ts  # MODIFIED — new test: a user with a custom Profile display name, differing from their test-login name, sees the configured name on a brand-new board's card/participant list immediately (no rename event needed)
```

**Structure Decision**: Existing single-repo web app layout (Vite/React client under `src/`, Express/Firebase-admin backend under `server/`, both already present). This fix is entirely backend: two route files, two wiring files, and their tests — no client-side change, since the client's `resolveDisplayName` (`src/lib/utils/cardHelpers.ts`) already correctly prefers a live participant record and only needs that record's `name` field to be correct at the source.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Not applicable — the Constitution Check above reports no violations.
