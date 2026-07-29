# Implementation Plan: Retrospective Board Backend-Mediated Access

**Branch**: `019-retro-board-backend-access` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-retro-board-backend-access/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The retrospective board screen (`src/pages/RetrospectivePage.tsx` → `RetrospectiveBoard.tsx`) currently makes ~10 collections' worth of direct browser-to-Firestore calls across 9 service files (cards, card interactions, groups, column-grouping, action items, countdown timer, facilitator notes, sentiment results, participants, typing status), including ~7 live `onSnapshot` listeners. This feature moves every write and the initial load behind a new `retrospectiveRouter` (`/api/retrospectives`, `/api/cards`, `/api/groups`, `/api/action-items`, `/api/notes`) following the exact `boards.ts`/`profile.ts` hexagonal pattern from `017`/`018` — **and**, per this feature's Clarifications, introduces a genuinely new subsystem: a backend-mediated, server-push real-time delivery channel (`GET /api/retrospectives/:id/live`, WebSocket) so that zero direct browser-to-Firestore connection remains for this screen, including live updates. The channel works by having each Vercel Function instance maintain its own server-side `firebase-admin` Firestore listeners (mirroring what the browser does today, just relocated server-side) for any board it has open WebSocket connections for, relaying changes to connected clients within 2 seconds (p95), with no new message-broker dependency required. Two known correctness gaps in the current client implementation (`voteCard`'s read-then-write race, `batchUpdateCardOrder`'s non-atomic sequential writes) are fixed as part of moving these operations server-side, per the spec's explicit no-lost-update/no-partial-application requirements (FR-008, FR-010).

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js, ES2022 target) — matches existing `server/tsconfig.json`

**Primary Dependencies**: Express 5, `firebase-admin` (Firestore Admin SDK, already a dependency), `express-rate-limit`, and **one new dependency**: `ws` (WebSocket server), the same library Vercel's own documentation uses for Node.js Function WebSockets

**Storage**: Cloud Firestore (`retrospectives`, `cards`, `groups`, `actionItems`, `facilitatorNotes`, `sentimentResults`, `participants`, `typingStatus`, `countdown_timers` collections, existing schemas, unchanged), accessed only server-side via `firebase-admin` for every operation in this feature — including, for the first time in this codebase, server-side realtime listeners (`onSnapshot` via the Admin SDK), not just one-shot reads/writes

**Testing**: Vitest (`server/vitest.config.ts` for backend unit/contract tests, root `vitest.config.ts` for frontend), Playwright E2E against the Firebase emulator (`npm run e2e`) — per constitution Principles I, VI, VII; new E2E coverage needs **two concurrent browser contexts** to exercise live cross-participant updates, a first for this project's Playwright suite

**Target Platform**: Same-origin Vercel serverless functions under `/api/*` (`retro-rocket/api/index.ts` → `server/src/http/app.ts`), same as every other route — but `api/index.ts` changes shape from a bare `(req,res) => void` handler to an exported `http.Server` instance (Vercel's documented pattern for Node.js Function WebSockets), with the existing Express app mounted on it and a `WebSocketServer` attached to the same server instance

**Project Type**: Web application (existing `frontend` (`retro-rocket/src`) + `backend` (`retro-rocket/server`) split, single npm workspace)

**Performance Goals**: Data-changing operations complete within 3s (p95) warm / 5s (p95) cold-start (spec SC-001, reusing the `014`/`017`/`018` baseline); live updates reach every other open participant within **2 seconds (p95)** (spec SC-004, FR-018) via genuine server push, not polling (FR-019a)

**Constraints**: Must not introduce a new required secret beyond what `014`/`015`/`017`/`018` already provisioned (the realtime channel reuses the existing `rr_session` cookie and the existing `firebase-admin` credential — research.md §1, §4); the WebSocket connection is subject to the hosting platform's Function `maxDuration`, so client-side reconnect-with-resync is mandatory, not optional (research.md §2); `batchUpdateCardOrder`/`voteCard` must gain real atomicity guarantees they lack today (research.md §7, §8)

**Scale/Scope**: ~31 new REST endpoints + 1 new WebSocket endpoint across 8 new ports/adapters (`RetrospectiveBoardPort`, `CardPort`, `CardGroupPort`, `ActionItemPort`, `FacilitatorNotePort`, `SentimentResultPort`, `TypingStatusPort`, `ParticipantPort`) plus one new cross-cutting `RealtimeGatewayPort`; no new Firestore collections (all 9 collections already exist); scope is the retrospective board screen's full operation set per spec Assumptions (join, card lifecycle/interactions, reorder/grouping, facilitator timer/notes/convert-to-action-item, action items, sentiment persistence, typing signal, and — per Clarifications — the live-delivery channel itself)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)**: PASS (planned) — `tasks.md` sequences a failing use-case/route/contract test before each implementation task, matching `server/test/`'s existing structure for `boards`/`profile`; the new realtime gateway gets its own test suite (mocking `firebase-admin`'s `onSnapshot` and asserting relay behavior) before implementation.
- **II. Library-First**: PASS — frontend gets `src/features/boards/retrospective/services/backendRetrospectiveClient.ts` (REST) and `backendRealtimeClient.ts` (WebSocket + reconnect/resync), each a decoupled module with a clear public interface before UI wiring, mirroring `backendBoardsClient.ts`/`backendProfileClient.ts`. Backend follows the established `application/use-cases/*` layering.
- **III. Prefer Proven Third-Party Libraries**: PASS — one new dependency, `ws`, is exactly the library Vercel's own documentation specifies for this exact use case (research.md §1); actively maintained, minimal footprint, no license concerns; no bespoke WebSocket implementation is written. Reuses `firebase-admin`, `express-rate-limit`, already in the project.
- **IV. SOLID**: PASS — 8 narrowly-scoped ports (research.md §6) instead of one monolithic `RetrospectivePort`, satisfying Interface Segregation; the pre-existing read-only `RetrospectiveReadPort`/`FirestoreRetrospectiveReadAdapter` (015, MCP) is left untouched — this feature adds sibling write-capable ports rather than widening that one, preserving its explicit "no write methods" contract (015 FR-013). `RealtimeGatewayPort` keeps the realtime relay mechanism behind its own interface so ordinary route handlers never depend on WebSocket internals (Dependency Inversion).
- **V. Simplicity (KISS+YAGNI)**: PASS — the realtime design (research.md §1) deliberately avoids adding a message-broker dependency (Redis, third-party pub/sub) by reusing Firestore itself as the already-reliable fan-out mechanism, the simplest design that meets FR-019a's genuine-push requirement; `019` does not expand `017`'s board-deletion cascade beyond this feature's boundary (research.md §9, left as an optional task, not a hard requirement); dead code (`typingStatusService.ts`, confirmed zero live callers) is deleted outright rather than left in place (research.md §10).
- **VI. Mandatory Unit Testing & Coverage Floor**: PASS (planned) — new use-cases, adapters, route handlers, and the realtime gateway get Vitest coverage consistent with the ≥80% floor in both `vitest.config.ts` files.
- **VII. E2E Testing with Playwright**: PASS (planned) — `tasks.md` includes a new `e2e/retrospective-board.spec.ts` covering card CRUD/vote/like/react, reorder/grouping, facilitator timer/notes, action items, sentiment persistence, and — using two concurrent Playwright browser contexts — the live cross-participant update and typing-indicator scenarios (quickstart.md §3-4), a new pattern for this suite but consistent with Principle VII's "critical user flows" mandate given this screen's real-time nature is its defining characteristic.
- **Technology Stack — Real-Time Data Security**: PASS — `firestore.rules` is not weakened (research.md §13); this feature adds server-side (Admin SDK, rules-bypassing-by-design) paths to collections the client no longer needs direct access to for this screen, without touching client-reachable rules.
- **Technology Stack — Error Handling & Resilience**: PASS (planned) — every new frontend call surfaces loading/error/empty states per FR-006, and the realtime channel's disconnection/reconnection is explicitly designed for (research.md §2, contracts/realtime-protocol.md), not treated as an edge case to handle later — directly satisfies this standard's "every operation... MUST explicitly handle loading, error, and reconnection states."
- **Technology Stack — Performance**: PASS (planned) — the realtime design is validated in quickstart.md §6 against the 2s (p95) target before being considered complete; consolidating N client-side listeners into shared server-side listeners per Function instance is a net reduction in Firestore read/listener volume versus today (research.md §1), not a regression.
- **Technology Stack — Accessibility (WCAG 2.1 AA)**: PASS (planned) — most of this feature is a pure data-source swap (`onSnapshot` → backend client) with no new markup, but FR-006's broadened error/loading/empty-state coverage does introduce at least one genuinely new rendered state ("board no longer exists," US1 Acceptance Scenario 4). `tasks.md` T120 verifies this reuses the existing, already-WCAG-compliant `src/pages/NotFound.tsx` empty-state pattern rather than introducing unverified new markup, closing the gap the original "N/A change" claim glossed over.
- **Technology Stack — Internationalization**: PASS (planned) — the constitution requires every new feature introducing user-visible text to add i18next keys to all supported locales (`src/locales/en.json`, `es.json`). Most of this feature's error/loading states reuse the existing generic toast/error-message keys already used by `backendBoardsClient.ts`/`backendProfileClient.ts` consumers; the one genuinely new piece of copy ("board no longer exists") gets its own keys in both locale files, tracked by `tasks.md` T119.

No violations requiring Complexity Tracking. (The one item that might look like added complexity — a whole new WebSocket subsystem — is a direct, explicit requirement of the spec's Clarifications, not a discretionary architectural choice this plan is free to simplify away; research.md §1's alternatives-considered section documents why the chosen design is the simplest one that still satisfies FR-019/FR-019a.)

## Project Structure

### Documentation (this feature)

```text
specs/019-retro-board-backend-access/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── retrospective-api.yaml
│   └── realtime-protocol.md
├── checklists/
│   └── requirements.md  # From /speckit-specify + /speckit-clarify
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/server/src/
├── application/
│   ├── ports/
│   │   ├── retrospective.ts          # NEW: RetrospectiveBoardPort, ParticipantPort DTOs
│   │   ├── cards.ts                  # NEW: CardPort, CardGroupPort
│   │   ├── actionItems.ts            # NEW: ActionItemPort
│   │   ├── facilitatorNotes.ts       # NEW: FacilitatorNotePort
│   │   ├── sentiment.ts              # NEW: SentimentResultPort
│   │   ├── typing.ts                 # NEW: TypingStatusPort
│   │   └── realtime.ts               # NEW: RealtimeGatewayPort (register/unregister/broadcast)
│   └── use-cases/
│       └── retrospective/
│           ├── GetBoardState.ts           # NEW: backs GET /api/retrospectives/:id
│           ├── JoinRetrospective.ts        # NEW: idempotent join
│           ├── CardLifecycle.ts            # NEW: create/edit/delete a card (ownership-checked)
│           ├── CardInteractions.ts         # NEW: vote/toggleLike/setReaction/removeReaction (atomic — research.md §7)
│           ├── ReorderCards.ts             # NEW: atomic WriteBatch (research.md §8)
│           ├── CardGrouping.ts             # NEW: create/disband/add/remove/collapse a group + save column-grouping state
│           ├── Timer.ts                    # NEW: configure/start/pause/reset/delete (facilitator-only)
│           ├── FacilitatorNotes.ts         # NEW: create/edit/delete a private note (author-scoped)
│           ├── ConvertCardToActionItem.ts  # NEW: facilitator-only, delegates to ActionItemPort
│           ├── ActionItems.ts              # NEW: create/edit/delete an action item directly
│           ├── Sentiment.ts                # NEW: save a computed result / save a facilitator override
│           └── SetTypingStatus.ts          # NEW
├── adapters/
│   └── firebase/
│       ├── FirestoreRetrospectiveBoardAdapter.ts   # NEW: implements RetrospectiveBoardPort + ParticipantPort
│       ├── FirestoreCardAdapter.ts                 # NEW: implements CardPort (voteCard via FieldValue.increment — research.md §7)
│       ├── FirestoreCardGroupAdapter.ts             # NEW: implements CardGroupPort
│       ├── FirestoreActionItemAdapter.ts            # NEW
│       ├── FirestoreFacilitatorNoteAdapter.ts       # NEW
│       ├── FirestoreSentimentResultAdapter.ts       # NEW
│       ├── FirestoreTypingStatusAdapter.ts          # NEW
│       └── FirestoreRealtimeGatewayAdapter.ts       # NEW: per-board onSnapshot listeners → WebSocket relay (research.md §1)
│       # FirestoreRetrospectiveReadAdapter.ts (015, MCP) — UNCHANGED, untouched by this feature
└── http/
    ├── routes/
    │   └── retrospectives.ts         # NEW: mounts all REST paths from contracts/retrospective-api.yaml
    ├── ws/
    │   └── realtimeUpgrade.ts        # NEW: WebSocket upgrade handling + auth (research.md §4)
    ├── retrospective-wiring.ts       # NEW: buildRetrospectiveDeps(...), mirrors boards-wiring.ts
    ├── composition-root.ts           # MODIFIED: wire buildRetrospectiveDeps
    └── app.ts                        # MODIFIED: mount retrospectiveRouter; server now built as http.Server + WebSocketServer (research.md §1)

retro-rocket/api/
└── index.ts                          # MODIFIED: export an http.Server (Vercel WebSocket pattern) instead of a bare handler
retro-rocket/vercel.json                # MODIFIED: functions.maxDuration for the WS-serving function (research.md §2)

retro-rocket/server/test/
├── application/use-cases/retrospective/   # NEW: unit tests per use-case above
├── adapters/firebase/                      # NEW: emulator-backed adapter tests, incl. FirestoreRealtimeGatewayAdapter
└── http/
    ├── routes/retrospectives.test.ts       # NEW: REST contract tests
    └── ws/realtimeUpgrade.test.ts          # NEW: WebSocket auth/relay tests

retro-rocket/src/
├── features/boards/retrospective/services/
│   ├── backendRetrospectiveClient.ts # NEW: REST fetch wrapper (mirrors backendBoardsClient.ts)
│   ├── backendRealtimeClient.ts      # NEW: WebSocket client with reconnect+resync (contracts/realtime-protocol.md)
│   ├── cardService.ts                # MODIFIED → thin wrapper over backendRetrospectiveClient, or deleted in favor of it
│   ├── cardInteractionService.ts     # MODIFIED/retired similarly
│   ├── retrospectiveService.ts       # MODIFIED/retired similarly
│   ├── OptimizedTypingStatusService.ts   # MODIFIED: writes go through backendRetrospectiveClient; local debounce timing (300ms/5000ms) preserved client-side
│   └── typingStatusService.ts        # DELETED: confirmed dead code (research.md §10)
├── features/boards/clustering/services/{cardGroupService.ts,columnGroupingService.ts}     # MODIFIED/retired similarly
├── features/boards/countdown/services/countdownService.ts                                  # MODIFIED/retired similarly
├── features/boards/facilitator/services/facilitatorNotesService.ts                          # MODIFIED/retired similarly
├── features/boards/retrospective/services/actionItemsService.ts                             # MODIFIED/retired similarly
├── features/boards/sentiment/services/sentimentResultsService.ts                             # MODIFIED/retired similarly
├── features/boards/participants/services/participantService.ts                               # MODIFIED: write side retired; read side replaced by live WS events
├── features/boards/retrospective/hooks/{useOptimizedCards.ts,useRetrospectiveColumns.ts}     # MODIFIED: subscribe to backendRealtimeClient instead of onSnapshot
└── pages/RetrospectivePage.tsx                                                                # MODIFIED: join via backendRetrospectiveClient

retro-rocket/src/test/
├── architecture/
│   └── retrospective-board-no-firestore.test.ts  # NEW: static import guard (mirrors dashboard-no-firestore.test.ts)
└── features/boards/**                             # MODIFIED: mocks swapped from Firestore to backend clients

retro-rocket/e2e/
└── retrospective-board.spec.ts        # NEW: critical-flow spec, incl. two-context live-update + typing-indicator scenarios
```

**Structure Decision**: Existing web-application split (`retro-rocket/server` = backend, `retro-rocket/src` = frontend, one npm workspace) is reused as-is — this feature adds one large new vertical slice (`retrospective`) to the backend, plus the one cross-cutting `realtime` capability, following the exact ports → use-cases → adapters → http/routes layering already established by `014`/`017`/`018`, and the exact frontend `services/*Client.ts` pattern already established by `backendBoardsClient.ts`/`backendProfileClient.ts`. No new top-level directories, packages, or projects. The one structural first: `api/index.ts` changes from a bare request handler to an exported `http.Server` (required for WebSocket upgrade support per Vercel's documented pattern) — this is an extension of the existing single-Function deployment model, not a new deployment target.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
