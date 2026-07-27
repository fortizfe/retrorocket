# Implementation Plan: Backend-Mediated Firebase Access

**Branch**: `017-backend-mediated-firebase-access` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-backend-mediated-firebase-access/spec.md`

## Summary

RetroRocket's frontend currently talks to Firestore directly (client SDK: `onSnapshot` listeners, `addDoc`/`updateDoc`/`deleteDoc`) for every board-related capability — retrospectives, cards, likes/reactions, card grouping, participants/presence, typing indicators, the facilitator countdown timer, private facilitator notes, action items, and sentiment results. Only auth (session) and the MCP connector are already backend-mediated (features 014/015), and even auth still hands the browser a Firebase custom token solely so the client SDK keeps working.

This plan extends the existing hexagonal backend (`server/src/`) with a new **boards bounded context** (ports/use-cases/adapters/routes, mirroring the auth/MCP precedent) that becomes the *only* thing touching Firestore for these capabilities, using the Firebase Admin SDK. The frontend is refactored to call a new `/api/boards/*` REST surface for all reads/writes, and to receive live updates over a **per-board Server-Sent Events (SSE) stream** that the backend derives from its own Firestore Admin SDK real-time listeners — reusing Firestore's existing real-time engine as the fan-out mechanism (so correctness is preserved across horizontally-scaled serverless instances) while requiring **zero new dependencies** on either side (native `EventSource` client-side, native Node.js streaming response server-side). The migration ships as a single atomic cutover (per spec FR-010): the Firebase client SDK, the custom-token bridge, and all direct-Firestore service files are removed in the same release that the new backend endpoints ship.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode) throughout; backend bundled by esbuild targeting `node20` (`scripts/bundle-backend.mjs`) for the Vercel serverless function — unchanged by this refactor.

**Primary Dependencies**: Backend — Express 5, `firebase-admin` (already a dependency, currently used only for auth/MCP; extended to full boards CRUD + Admin SDK real-time listeners), `jose` (session JWT), `arctic` (OAuth), `zod` (input validation, already present). Frontend — React 18, native `fetch` (`credentials: 'include'`) and native `EventSource` for the new API client layer; `@dnd-kit`, `framer-motion`, `@react-pdf/renderer`, `docx`, `@huggingface/transformers` all unaffected. **No new npm dependency is required for the real-time transport** (see research.md §1) — this is a direct application of Constitution Principle III (Prefer Proven Third-Party Libraries: prefer *no* new dependency when a native platform primitive already does the job) and Principle V (Simplicity).

**Storage**: Firebase Firestore — unchanged as the system of record. What changes is *who* talks to it: after this refactor, only the backend (Admin SDK) does; the frontend's `firebase` client package and its `firebase/firestore` usage are removed entirely.

**Testing**: Backend — Vitest (`server/vitest.config.ts`, Node environment, 80% coverage floor), `supertest` for route-level tests against `buildApp()`/test-app helpers, hand-written in-memory fake ports for use-case tests (existing pattern in `server/test/application/use-cases/**/fakes.ts`). Frontend — Vitest + Testing Library (`vitest.config.ts`, jsdom, 80% coverage floor). E2E — Playwright against the Firebase Emulator Suite (`npm run e2e`); **the Firebase Auth Emulator dependency for E2E can be dropped** once no frontend code needs `signInWithCustomToken` (E2E already authenticates via the backend's `POST /api/auth/test-login` under `AUTH_TEST_MODE`, per `e2e/fixtures/auth-helpers.ts:6-16` — only the trailing custom-token-to-Auth-Emulator step becomes dead code); the Firestore Emulator remains required so the backend's Admin SDK has something to talk to in CI.

**Target Platform**: Vercel serverless (Node.js, Fluid Compute) — the existing single Express app (`server/src/http/app.ts`), pre-bundled into one function (`api/_backend.mjs`) and mounted at `/api/*` via `vercel.json` rewrites. This refactor adds routes/use-cases to that same app; it does not change the deployment topology.

**Performance Goals**: A change made by one participant is reflected to other participants viewing the same board within 2 seconds under normal network conditions (spec SC-003) — satisfied by the SSE relay design (research.md §1), which forwards Firestore change events to connected clients with no added polling delay.

**Constraints**: Vercel serverless functions currently cap execution duration at 300s; a single SSE connection therefore cannot stay open for an entire retro session unassisted. Mitigated by relying on the browser's native `EventSource` auto-reconnect (research.md §1) rather than building custom reconnect logic — this directly satisfies spec FR-011 (best-effort reconnect, no offline write queueing) using a well-tested platform primitive. Migration ships as a single atomic cutover (FR-010): no feature flag, no dual-path period, no parallel run.

**Project Type**: Web application — already structured as frontend + backend in this repo (`retro-rocket/src/**` and `retro-rocket/server/src/**`); this refactor extends the existing structure rather than introducing a new one.

**Scale/Scope**: No new explicit concurrency ceiling is introduced (spec Assumptions carry forward today's informal scale — typical retro team sizes). Scope spans ~9 Firestore collections (`retrospectives` + `columns` subcollection, `cards`, `groups`, `participants`, `countdown_timers`, `facilitatorNotes`, `actionItems`, `sentimentResults`, `typingStatus`, `users`, `userBoardHistory`) and ~15 frontend service files (cataloged in research.md §2 and data-model.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

| Principle | Assessment |
|---|---|
| I. TDD (NON-NEGOTIABLE) | No violation. Every new backend use-case/route and every rewritten frontend service must be built red-green-refactor, same as features 014/015. Enforced at task-authoring time in `/speckit-tasks` (tests precede implementation tasks) and at review time. |
| II. Library-First | Satisfied by design: the new "boards" capability is built as an independent bounded context (`application/ports/boards.ts`, `application/use-cases/boards/*`, `adapters/firebase/Firestore*Adapter.ts`) before being wired into HTTP routes — mirrors the existing auth/MCP contexts exactly. |
| III. Prefer Proven Third-Party Libraries | Satisfied, and reinforced: the real-time transport decision (research.md §1) deliberately avoids adding a new dependency (no `ws`, no Socket.IO, no third-party realtime service) by using native `EventSource`/Node streaming plus the already-adopted `firebase-admin` real-time listener capability. |
| IV. SOLID Principles | Satisfied: Firestore access is confined to new adapter classes behind ports, exactly as the existing auth/MCP adapters are; domain authorization rules (e.g. facilitator-only note/countdown access) are modeled as pure domain functions per the existing `RetrospectiveAccess`/`FacilitatorAccess` pattern, not scattered through route handlers. |
| V. Simplicity (KISS + YAGNI) | Satisfied: SSE (one-directional push) is chosen over WebSocket specifically because no client→server data flows over the real-time channel — all writes are plain REST calls. Per-connection Firestore listeners are the initial design; a shared per-board listener multiplexer is explicitly deferred as a future optimization, not built now (research.md §1). |
| VI. Mandatory Unit Testing & Coverage Floor (NON-NEGOTIABLE) | No violation. Existing 80% floors (both `vitest.config.ts` files) are unchanged and must be maintained by new/rewritten code — tracked as a task-level gate. |
| VII. E2E Testing with Playwright (NON-NEGOTIABLE) | No violation. Existing critical-flow E2E specs (create board, add/vote/group cards, facilitator countdown, export, authentication) must be updated to exercise the new backend-mediated flows and continue running in CI against the Firebase Emulator Suite (Firestore emulator retained; Auth Emulator dependency can be dropped, see Technical Context). |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | No violation. This is a data-flow/architecture refactor with no new UI surface; existing components and their accessibility properties are unchanged. Must be re-verified only to the extent that loading/error/reconnection state UI (FR-009, FR-011) is new-ish UI that needs the same contrast/focus/no-color-alone treatment as everything else. |
| Real-Time Data Security (Tech Stack standard) | This refactor **strengthens** the Firestore rules posture: research.md §2 documents that the current `firestore.rules` global catch-all (`match /{document=**}`) already grants any authenticated non-anonymous user read/write on every collection, making the more specific ownership rules for `countdown_timers`/`facilitatorNotes`/`actionItems` dead code today. Once the frontend has zero direct Firestore access, those collections' rules can be tightened to `allow read, write: if false` (mirroring the existing MCP collections), closing a real, previously-unenforced gap. This is a justified strengthening, not a weakening, and will be called out explicitly in the implementing PR per the constitution's requirement to justify any `firestore.rules` change. |

**Result**: PASS — no unjustified violations, no Complexity Tracking entries required.

**Post-Design Re-check** (after Phase 1 research.md/data-model.md/contracts/quickstart.md): design confirms the SSE-over-Firestore-Admin-listener relay and the new `boards` bounded context require no new dependency, no deviation from the existing ports/adapters/use-cases layering, and no weakening of `firestore.rules` (only a documented strengthening, research.md §2). PASS holds unchanged; no Complexity Tracking entries added.

## Project Structure

### Documentation (this feature)

```text
specs/017-backend-mediated-firebase-access/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── boards-api.md
│   ├── cards-and-groups-api.md
│   ├── facilitator-tools-api.md
│   ├── realtime-events.md
│   └── auth-session-change.md
└── tasks.md             # /speckit-tasks output (not created by /speckit-plan)
```

### Source Code (repository root)

This feature extends the **existing** web-application layout at `retro-rocket/` — no new top-level directories are introduced; a new bounded context is added inside the existing backend, and existing frontend service files are replaced with API-client equivalents inside their existing feature folders.

```text
retro-rocket/
├── server/src/
│   ├── domain/
│   │   └── boards/                      # NEW — pure authorization/business rules
│   │       ├── BoardAccess.ts            #   participant/board-membership checks
│   │       ├── FacilitatorAccess.ts      #   countdown/notes/action-item ownership
│   │       └── CardAccess.ts             #   card-owner checks (FR-004)
│   │                                     #   (no dedicated conflict-resolution file: FR-014's
│   │                                     #   last-write-wins is achieved by plain Firestore writes
│   │                                     #   with no added optimistic-concurrency layer — see
│   │                                     #   data-model.md's cross-cutting rules)
│   ├── application/
│   │   ├── ports/
│   │   │   ├── boards.ts                # NEW — BoardReadPort/BoardWritePort/ParticipantPort/RealtimeRelayPort
│   │   │   ├── users.ts                 # NEW — UserProfilePort (US1)
│   │   │   ├── cards.ts                 # NEW — CardPort/CardGroupPort/TypingPort (US2)
│   │   │   └── facilitator.ts           # NEW — CountdownPort/FacilitatorNotesPort/ActionItemPort/SentimentPort (US3)
│   │   └── use-cases/
│   │       └── boards/                  # NEW — one file per operation (CreateBoard, JoinBoard,
│   │                                     #        CreateCard, ToggleLike, StartCountdown, …)
│   ├── adapters/
│   │   └── firebase/
│   │       ├── FirestoreBoardAdapter.ts       # NEW
│   │       ├── FirestoreCardAdapter.ts        # NEW
│   │       ├── FirestoreCardGroupAdapter.ts   # NEW
│   │       ├── FirestoreParticipantAdapter.ts # NEW
│   │       ├── FirestoreTypingAdapter.ts      # NEW
│   │       ├── FirestoreUserProfileAdapter.ts # NEW (US1)
│   │       ├── FirestoreCountdownAdapter.ts   # NEW
│   │       ├── FirestoreFacilitatorNotesAdapter.ts # NEW
│   │       ├── FirestoreActionItemAdapter.ts  # NEW
│   │       ├── FirestoreSentimentAdapter.ts   # NEW
│   │       └── FirestoreRealtimeRelay.ts      # NEW — Admin SDK onSnapshot → SSE event translator
│   └── http/
│       ├── routes/boards.ts             # NEW — mirrors routes/auth.ts, routes/mcp.ts
│       └── board-wiring.ts              # NEW — mirrors auth-wiring.ts, mcp-wiring.ts
├── server/test/
│   ├── domain/boards/                   # NEW
│   ├── application/use-cases/boards/    # NEW (+ fakes.ts)
│   ├── adapters/firebase/*Board*.test.ts, *Card*.test.ts, etc.  # NEW
│   └── http/routes/boards.test.ts       # NEW
├── src/features/
│   ├── boards/
│   │   ├── retrospective/services/       # REPLACED — retrospectiveService.ts, cardService.ts,
│   │   │                                 #   cardInteractionService.ts, actionItemsService.ts,
│   │   │                                 #   typingStatusService.ts, OptimizedTypingStatusService.ts
│   │   │                                 #   become thin fetch/EventSource-based API clients
│   │   ├── participants/services/        # REPLACED — participantService.ts, UserProfileCache.ts
│   │   ├── countdown/services/           # REPLACED — countdownService.ts
│   │   ├── facilitator/services/         # REPLACED — facilitatorNotesService.ts
│   │   ├── clustering/services/          # REPLACED — cardGroupService.ts, columnGroupingService.ts
│   │   └── sentiment/services/           # REPLACED — sentimentResultsService.ts
│   ├── create-board/                     # REPLACED — createBoardFromTemplate.ts
│   └── auth/services/                    # MODIFIED — userService.ts profile-CRUD calls removed
│                                         #   (profile bootstrap moves fully server-side into the
│                                         #   existing CompleteOAuthLogin use-case); backendAuthClient.ts
│                                         #   stops requesting/consuming firebaseCustomToken
├── src/lib/
│   ├── services/firebase.ts              # REMOVED (or reduced to a no-op stub if anything
│   │                                     #   still imports it transiently during the cutover PR)
│   └── services/OptimizedRetrospectiveService.ts  # REMOVED (superseded — see research.md §3)
├── src/lib/hooks/useFirestore.ts         # REMOVED
├── src/features/dev-tools/                # MODIFIED — Firebase metrics panel retired (spec FR-012)
└── e2e/fixtures/auth-helpers.ts           # MODIFIED — drop the custom-token-to-Auth-Emulator step
```

**Structure Decision**: Extend the existing hexagonal backend (`server/src/`) with one new bounded context ("boards") following the exact layering and naming conventions already established by the auth (014) and MCP (015) contexts — ports → use-cases → adapters → routes, composed in `composition-root.ts` via a new `buildBoardsDeps()`/`boardsRouter()` pair. On the frontend, existing feature-first folders (`src/features/boards/**`, `src/features/create-board/**`) are kept as-is; only the *service* files inside them are replaced with thin backend-API-client equivalents, following the precedent already set by `src/features/auth/services/backendAuthClient.ts`. No new top-level directory is created on either side.

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations.*
