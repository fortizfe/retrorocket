# Implementation Plan: Reliable Backend-Mediated Access for Concurrent Retrospective Teams

**Branch**: `021-backend-realtime-updates` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-backend-realtime-updates/spec.md`

## Summary

Two independent, previously-unfinished parts of the `019` backend migration are causing HTTP 429
errors under very light concurrent use (to the point of blocking login) and residual direct
browser-to-Firebase traffic. Fix 1 (rate limiting): every `express-rate-limit` instance in
`server/src/http/routes/*.ts` keys on `req.ip` without `app.set('trust proxy', ...)` configured for
Vercel's proxy chain, so distinct users collapse into one shared bucket; the fix configures trust
proxy correctly and additionally keys authenticated routes by session identity, with limits resized
for a 10-participant team. Fix 2 (zero direct Firebase): two still-live direct-Firestore reads
(`useRetrospectiveColumns.ts`'s standing `onSnapshot` listener — the likely source of the observed
"Firebase channel" traffic — and `UserProfileCache.ts`'s participant-photo batch reads) are removed
in favor of data the backend already serves in the existing board-state payload, the now-unneeded
`signInWithCustomToken` call is removed, and a set of confirmed-dead direct-Firestore files are
deleted outright. The already-built, genuinely push-based WebSocket real-time channel from `019`
(`FirestoreRealtimeGatewayAdapter` / `backendRealtimeClient.ts`) is preserved as-is and hardened so
its reconnect behavior cannot itself trigger the rate-limiter false positives being fixed.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict mode), Node.js (Vercel Functions runtime), React 18

**Primary Dependencies**: Express 5, `express-rate-limit` 8 (existing, reconfigured — no new
dependency), `ws` 8 (existing, unchanged), `firebase-admin` 14 (existing, unchanged, server-side
only), `firebase` 10 (existing client SDK — usage reduced, not removed as a dependency, since
`firebase-admin` and any still-legitimate client bootstrap remain), Vite 4, React Router, i18next

**Storage**: Cloud Firestore (existing collections, unchanged schema), accessed server-side only via
`firebase-admin` for every operation touched by this feature — no new collections

**Testing**: Vitest + Testing Library (unit/integration, 80% coverage floor per constitution),
Playwright (E2E, critical flows), plus the existing static architecture-boundary test
(`src/test/architecture/retrospective-board-no-firestore.test.ts`) repurposed as this feature's
primary regression guard for "zero direct Firebase" (research.md §6)

**Target Platform**: Same-origin Vercel serverless Function (`api/index.ts` → `server/src/http/app.ts`),
same single-Function deployment model established by `014`/`017`/`018`/`019`; no new deployment target

**Project Type**: Web application (single npm workspace: `retro-rocket/server` = backend,
`retro-rocket/src` = frontend)

**Performance Goals**: Live updates continue to reach every other open participant within 2 seconds
(p95) at up to 10 concurrent participants per board (spec SC-004, reusing `019`'s established bar,
no regression); sign-in and board-load requests are not rejected by the backend's own rate limiter
under normal 10-participant-team usage (spec SC-001, SC-002, SC-006)

**Constraints**: Must not introduce a new required secret, external service, or infrastructure
dependency (no message broker, no external rate-limit store) — the fix is corrected configuration
and identity-aware keying of the already-adequate `express-rate-limit` middleware, plus deletion of
redundant/dead client code, not new infrastructure (research.md §1); must not weaken the backend's
ability to reject genuinely abusive traffic (spec FR-003); must not regress `019`'s 2-second p95
live-update guarantee or its no-lost-update/no-duplication guarantees (spec FR-009, FR-011)

**Scale/Scope**: At least 10 concurrent participants per retrospective board, with multiple boards
running concurrently (spec Assumptions); touches 5 backend route files (rate-limiter
configuration only, no new endpoints — research.md §2 and §3 both confirmed the data already
exists in the current board-state payload), ~10 frontend files being deleted or simplified
(`useRetrospectiveColumns.ts`, `UserProfileCache.ts`, `useEnrichedParticipants.ts`,
`ResponsiveParticipantDisplay.tsx`, `backendAuthClient.ts`, plus the confirmed-dead files in
research.md §4), and one existing architecture test tightened to zero-tolerance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)**: PASS (planned) — `tasks.md` will sequence a failing test before each
  change: a rate-limiter test asserting distinct sessions/IPs are not co-throttled (before the
  `trust proxy`/keying fix), and the existing `retrospective-board-no-firestore.test.ts` already
  fails loudly the moment its allowlists are emptied ahead of the corresponding deletions landing —
  used as the red step for research.md §2–§4's removals.
- **II. Library-First**: PASS — no new feature module is introduced; this is a correction and
  simplification of existing modules (`backendRetrospectiveClient.ts`'s already-fetched board
  state absorbs `useRetrospectiveColumns`'s job; `Participant`'s existing `photoURL` absorbs
  `UserProfileCache`'s job), each already living behind its established public interface.
- **III. Prefer Proven Third-Party Libraries**: PASS — zero new dependencies. `express-rate-limit`
  (already in use) is reconfigured, not replaced; no new rate-limit store, message broker, or
  real-time library is added (research.md §1, §5).
- **IV. SOLID**: PASS — no new coupling introduced; deleting dead direct-Firestore call sites and
  routing the remaining two reads through data already exposed by the existing
  `RetrospectiveBoardPort`/`ParticipantDTO` contracts *improves* adherence (Firestore access stays
  behind the backend's existing ports, not the browser) rather than requiring new abstractions.
- **V. Simplicity (KISS + YAGNI)**: PASS — every fix in research.md was chosen specifically because
  it required no new backend endpoint, port, or transport (columns and participant photos are
  already present in the existing payload); the alternative of building a new `UserPort` or a new
  `columns` WebSocket event type was explicitly considered and rejected as unnecessary (research.md
  §2, §3).
- **VI. Mandatory Unit Testing & Coverage Floor**: PASS (planned) — `tasks.md` will add/adjust unit
  tests for the reworked rate-limiter key generation and for the simplified
  `ResponsiveParticipantDisplay`/board-columns consumers; the 80% coverage floor in
  `vitest.config.ts` is unaffected in either direction by net deletions of already-dead,
  already-untested-in-production code paths.
- **VII. E2E Testing with Playwright**: PASS (planned) — the existing login and retrospective-board
  E2E flows continue to be the acceptance surface; `tasks.md` will add a multi-session E2E scenario
  (or extend an existing one) simulating several concurrent authenticated sessions to verify no 429
  is raised, matching spec User Story 1/2's Independent Test.
- **VIII. Accessibility (WCAG 2.1 AA)**: PASS — this feature changes no markup, styling, or
  interaction pattern; `ResponsiveParticipantDisplay.tsx`'s render output (avatars/participant
  popover) is unchanged, only its data source is simplified. No new user-facing surface is
  introduced.
- **Technology Stack — Real-Time Data Security**: PASS — no change to `firestore.rules` is required
  by this feature's fixes; the backend's `firebase-admin` access (bypassing client-facing rules by
  design, per `019`'s research.md §9 precedent) is unaffected, and removing client-side reads only
  narrows what the client-facing rules need to permit, never widens it.
- **Technology Stack — Error Handling & Resilience**: PASS (planned) — spec FR-004 (clear message on
  legitimate throttling) and FR-010 (reconnect must not itself 429) are explicit functional
  requirements this plan's tasks must implement and test, consistent with this project's existing
  "no silent failures" standard.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/021-backend-realtime-updates/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/
│   ├── src/
│   │   ├── http/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts                  # MODIFIED: authLimiter — trust-proxy-aware + session-keyed
│   │   │   │   ├── boards.ts                # MODIFIED: boardsLimiter — same fix
│   │   │   │   ├── profile.ts               # MODIFIED: profileLimiter — same fix
│   │   │   │   ├── retrospectives.ts        # MODIFIED: retrospectiveLimiter — same fix
│   │   │   │   └── mcp.ts                   # MODIFIED: tokenLimiter gains the ApiErrorBody envelope toolLimiter already had (FR-004); both stay IP-keyed — no rr_session cookie exists on MCP-client-authenticated routes (found during implementation, tasks.md T037)
│   │   │   ├── middleware/
│   │   │   │   └── rateLimiting.ts          # NEW: shared trust-proxy-aware/session-aware key generator, factored out of the 5 per-router limiters (Simplicity: one implementation, not five copies)
│   │   │   ├── ws/
│   │   │   │   └── realtimeUpgrade.ts       # UNCHANGED: existing 019 WebSocket upgrade/auth, verified compatible with the rate-limiter fix (research.md §5)
│   │   │   └── app.ts                       # MODIFIED: app.set('trust proxy', ...) for Vercel's proxy chain
│   │   └── adapters/firebase/
│   │       └── FirestoreRealtimeGatewayAdapter.ts   # UNCHANGED (research.md §5)
│   └── test/
│       └── http/
│           ├── middleware/rateLimiting.test.ts      # NEW: distinct sessions/IPs not co-throttled
│           └── routes/*.test.ts                     # MODIFIED: existing limiter tests updated for new keying
│
├── src/
│   ├── features/boards/retrospective/
│   │   ├── hooks/useRetrospectiveColumns.ts          # MODIFIED: derives columnConfigs from a `columns` argument (sourced from RetrospectivePage's already-fetched board state and passed down as a prop) instead of its own onSnapshot (research.md §2)
│   │   └── components/RetrospectiveBoard.tsx         # MODIFIED: pass-through of columns from context (no behavior change)
│   ├── features/boards/participants/
│   │   ├── services/UserProfileCache.ts              # DELETED (research.md §3)
│   │   ├── hooks/useEnrichedParticipants.ts           # DELETED (research.md §3)
│   │   └── components/ResponsiveParticipantDisplay.tsx  # MODIFIED: consumes participant.photoURL directly, no more enrichment hook
│   ├── features/auth/services/backendAuthClient.ts   # MODIFIED: signInWithCustomToken call removed from bootstrapSession() (research.md §4)
│   ├── lib/services/firebase.ts                      # MODIFIED: production signInWithCustomToken usage removed; emulator-only __e2eSignIn hook retained
│   │
│   # DELETED outright (research.md §4 — confirmed zero live callers):
│   ├── features/boards/retrospective/hooks/useCards.ts
│   ├── features/boards/retrospective/services/cardService.ts
│   ├── features/boards/retrospective/services/cardInteractionService.ts
│   ├── features/boards/participants/hooks/useParticipants.ts
│   ├── features/boards/participants/services/participantService.ts
│   ├── features/boards/retrospective/services/FirestoreListenerManager.ts
│   ├── lib/services/OptimizedRetrospectiveService.ts
│   ├── lib/hooks/useFirestore.ts
│   ├── lib/utils/migrateUserProviders.ts
│   └── lib/components/forms/{CreateCardForm.tsx,JoinPanelForm.tsx}
│
└── src/test/architecture/
    └── retrospective-board-no-firestore.test.ts      # MODIFIED: EXPECTED_REMAINING_OFFENDERS and PERMANENT_EXCEPTIONS both emptied — becomes a zero-tolerance guard (research.md §6)
```

**Structure Decision**: Existing web-application split (`retro-rocket/server` = backend,
`retro-rocket/src` = frontend, one npm workspace) is reused as-is, following the exact layering
`014`/`017`/`018`/`019` already established. This feature adds exactly one new file
(`server/src/http/middleware/rateLimiting.ts`, a shared key-generator factored out of five
near-identical per-router limiter blocks — Simplicity: de-duplicate, don't multiply); every other
change is a modification to or deletion of existing files. No new top-level directories, packages,
ports, or transports.

## Complexity Tracking

*No violations — table omitted.*
