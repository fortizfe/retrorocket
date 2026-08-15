# Implementation Plan: Idle Tab Realtime Connection Cleanup

**Branch**: `045-idle-connection-cleanup` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/045-idle-connection-cleanup/spec.md`

## Summary

A retrospective board left open and backgrounded in a browser tab currently keeps its
WebSocket connection alive forever, reconnects indefinitely (even after the server's own
`4401`/`4404` rejections) with no retry cap, and forces a full board reload — both client
(`joinBoard` + `getBoardState`, 8 parallel Firestore reads) and server (8 recreated
`onSnapshot` listeners) — on every reconnect. This is the confirmed root cause of the
`VTeTvsH1ovbOCBTzSD22` Firestore-quota-exhaustion incident. This feature closes that gap
with five independently-shippable mitigations, all parameterized with the concrete
thresholds fixed during `/speckit-clarify`:

1. Pause (close) the realtime connection 120s after a tab goes to background; resume on
   foreground (`documentVisibility.ts` + `backendRealtimeClient`).
2. Stop auto-reconnecting on server-rejected closes (`4401`/`4404`); cap transient-failure
   retries at 5 minutes total elapsed time with a manual-retry fallback.
3. Add a server-side WebSocket liveness sweep (ping every 30s, `ws.terminate()` after 2
   missed pongs) so dead sockets are pruned within 60-90s instead of relying on the
   network layer.
4. Give the per-board Firestore listener set (`FirestoreRealtimeGatewayAdapter` /
   `CoordinatedRealtimeGatewayAdapter`) a 30s grace period before tearing down on
   `connections.size === 0`, so back-to-back reconnects reuse the existing listeners.
5. Enforce the existing session soft TTL (`Session.isActive()`, already defined in
   `Session.ts` but currently unchecked on the realtime/board routes) on the WS upgrade
   and `requireSession` REST path, so an abandoned-but-foregrounded tab's session cannot
   keep authenticating indefinitely.

No new dependencies, no new persistent storage, and no user-facing configuration are
introduced — the browser's native Page Visibility API and the already-installed `ws`
library's ping/pong primitives cover everything needed.

## Technical Context

**Language/Version**: TypeScript 5 (`strict` mode, no `any` per constitution), Node.js
(Vercel Fluid Compute runtime) on the backend, ES2020+ target React 18 on the frontend.

**Primary Dependencies**: `express` 5 (HTTP routing), `ws` 8 (raw WebSocket server,
already used for `realtimeUpgrade.ts` — its built-in `ws.ping()`/`terminate()` cover
mitigation 3 with no new package), `firebase-admin` 14 (Firestore Admin SDK,
`onSnapshot` listeners), `ioredis` 6 (optional cross-instance realtime coordination via
`CoordinatedRealtimeGatewayAdapter`), `jose` (signed session cookie, already carries the
`SESSION_SOFT_TTL_SECONDS`/`SESSION_ABSOLUTE_TTL_SECONDS` fields this feature will start
enforcing), `i18next`/`react-i18next` (all new user-facing copy).

**Storage**: Firestore (via `firebase-admin`) for board data and realtime listeners; no
server-side session store (session is a self-contained signed JWE cookie); Redis
(Upstash, optional) only for cross-instance board-owner coordination — unaffected by this
feature's data model, only by its connection-lifecycle timing.

**Testing**: Vitest + Testing Library (unit; existing coverage gate configured in
`vitest.config.ts` — currently below the constitution's 80% target per an existing,
separately-tracked gap, but this feature MUST NOT lower it further) for pure logic (the
visibility-pause hook, the reconnect policy state machine, the session `isActive()` gate);
Playwright (+ `@axe-core/playwright`) for the WebSocket/Firestore-listener wiring, per the
codebase's established convention that adapter-level realtime wiring is verified E2E
against the Firebase emulator rather than mocked at the Vitest level (see
`FirestoreRealtimeGatewayAdapter.ts`'s own doc comment).

**Target Platform**: Vercel Fluid Compute (warm-instance-reusing Node.js serverless,
`api/index.ts` entrypoint) serving both the Express REST API and the raw `http.Server`
`'upgrade'` WebSocket handler from the same process; evergreen browsers (Chrome, Firefox,
Safari) for the frontend.

**Project Type**: Web application — single repository, `src/` (Vite/React frontend) +
`server/` (Express + WebSocket backend) + `api/index.ts` (Vercel entrypoint), not a
frontend/backend monorepo split.

**Performance Goals**: Zero perceptible latency/behavior change for a tab that stays in
the foreground (FR-008); reconnect-and-refresh within a few seconds of returning a
backgrounded tab to the foreground (SC-003); dead-connection pruning within 60-90s
(FR-005) instead of relying on unbounded TCP-level detection.

**Constraints**: No new dependency, no new persistent storage, no user-facing
configuration surface (per spec Assumptions); all thresholds are the fixed values from
`/speckit-clarify` (120s background grace, 5min retry cap, 30s listener-teardown grace,
30s/2-miss heartbeat) — not user- or env-configurable; must not weaken `firestore.rules`
or any existing security check; every new user-facing string goes through i18next in all
supported locales; any new UI element (reconnect banner, manual-retry action,
session-expired message) must independently satisfy WCAG 2.1 AA and must have its
visual/motion decisions made via the Apple-design skill package (Principle IX), not ad
hoc.

**Scale/Scope**: Per-board realtime fan-out is small (typically 1-15 concurrent
participants); the changes touch exactly two realtime gateway adapters (Firestore-only
and Redis-coordinated), one WS upgrade handler, one frontend realtime client, one
frontend sync hook, and the two session-verification call sites (`requireSession` in
`retrospectives.ts`/`boards.ts`, and `realtimeUpgrade.ts`'s inline session check).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | **PASS** | Each mitigation is a discrete, independently-testable unit (visibility hook, reconnect policy, heartbeat sweep, listener-teardown grace, session `isActive()` gate). Phase 2 tasks MUST write the failing test before the implementation for each. |
| II. Library-First | **PASS** | The visibility-pause/reconnect-policy logic will be extracted as a decoupled module inside `src/features/boards/retrospective/services/` (alongside the existing `backendRealtimeClient.ts`) with a clear function-level interface, before any UI wiring. |
| III. Prefer Proven Third-Party Libraries | **PASS** | No new dependency. Page Visibility API is a native browser API; `ws`'s own `ping()`/`terminate()`/`'pong'` event cover server-side liveness — already an installed, in-use dependency. |
| IV. SOLID | **PASS** | Listener-teardown-grace logic (mitigation 4) and the heartbeat sweep (mitigation 3) stay inside the existing `RealtimeGatewayPort` adapters and `realtimeUpgrade.ts`; no Firestore access leaks into UI components; the session `isActive()` gate stays inside the existing session-verification call sites. |
| V. Simplicity (KISS + YAGNI) | **PASS** | All five thresholds are fixed constants from `/speckit-clarify`, not a new configuration system; no speculative generality added. |
| VI. Mandatory Unit Testing & Coverage Floor | **PASS (tracked, documented exception)** | New pure frontend logic (visibility timer, reconnect-policy state machine) gets Vitest unit tests. New backend logic (US3 heartbeat sweep, US4 listener-teardown grace, US5 session `isActive()` gate) gets **no Vitest unit test** — verified via Playwright E2E only. This is not a coverage-floor violation: `vitest.config.ts` explicitly excludes `server/**`/`api/**` from both test execution and coverage instrumentation (pre-existing, project-wide decision, confirmed by inspection), so this feature cannot lower the tracked threshold by following it. It is, however, a documented exception to Principle VI's plain text ("all business logic... and services MUST have unit tests"), which is not itself scoped to `src/` only — recorded here per the constitution's Governance clause requiring explicit justification for any principle exception, rather than left implicit. |
| VII. E2E Testing with Playwright (NON-NEGOTIABLE) | **PASS (tracked)** | This touches the real-time sync critical flow explicitly named in Principle VII. New Playwright coverage is required for all five stories: tab-hidden → connection closes → tab-visible → reconnect-and-refresh (US1); server-rejected/terminal close does not auto-retry, transient failure retry cap (US2); heartbeat-based pruning of an unresponsive connection (US3); listener-teardown grace period on rapid reconnects (US4); session soft-TTL rejection (US5). `document.visibilitychange` is simulated via `page.evaluate` overriding `document.visibilityState` + dispatching the event, following the existing `e2e/concurrent-board-network.spec.ts` pattern of driving real network/browser conditions rather than mocking. |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | **PASS (tracked)** | Any new UI (session-expired message, manual-retry action) must meet contrast/focus/keyboard/no-color-only requirements in both themes; verified in code review per the constitution's existing process (no automated a11y CI gate exists yet). |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | **PASS (tracked)** | If a reconnect/session-expired affordance is visually new (not a reuse of the existing `react-hot-toast` pattern already in the codebase), its design/motion decisions must go through `apple-design`/`emil-design-eng`/`animate` per task shape. |
| Tech Stack: Real-Time Data Security | **PASS** | No `firestore.rules` change; this feature only changes *when* listeners attach/detach and *when* a session is accepted, not what data any principal can read. |
| Tech Stack: Internationalization | **PASS (tracked)** | Any new copy (manual-retry button, session-expired message) MUST add keys to every supported locale, not hardcode strings. |
| Tech Stack: Error Handling & Resilience | **PASS** | This feature *is* the fix for a previously-silent failure mode (unhandled rejection hanging the WS upgrade); it explicitly adds the missing loading/error/reconnection handling FR-003/FR-004 require. |

No violations requiring Complexity Tracking.

### Post-Design Re-Check

Re-evaluated after Phase 1 (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`):
no new dependency, storage, endpoint, or abstraction was introduced beyond what the
pre-design Constitution Check above already accounted for. The two contract deltas
(`realtime-connection-lifecycle-delta.md`, `session-soft-ttl-enforcement.md`) both extend
existing contracts in place rather than defining new surfaces. All "(tracked)" rows above
remain open action items for Phase 2 tasks (unit/E2E test authorship, i18next keys, WCAG
verification, Apple-design skill consultation if new UI is proposed) — none are gate
failures. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/045-idle-connection-cleanup/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── api/
│   └── index.ts                                   # Vercel Fluid Compute entrypoint (unchanged)
├── server/
│   └── src/
│       ├── domain/auth/
│       │   └── Session.ts                          # isActive()/canRefresh() already exist — reused, not added
│       ├── application/use-cases/session.ts        # existing soft-TTL refresh use case — reference implementation for the new gate
│       ├── http/
│       │   ├── routes/retrospectives.ts            # requireSession(): add isActive() check (US5)
│       │   ├── routes/boards.ts                    # requireSession(): add isActive() check (US5)
│       │   └── ws/realtimeUpgrade.ts                # inline session check: add isActive() (US5); add ping/pong sweep (US3)
│       └── adapters/firebase/
│           ├── FirestoreRealtimeGatewayAdapter.ts   # unregister(): add teardown grace timer (US4)
│           └── redis/CoordinatedRealtimeGatewayAdapter.ts # same grace-period change, Redis-coordinated variant (US4)
├── src/
│   └── features/boards/retrospective/
│       ├── services/
│       │   ├── backendRealtimeClient.ts             # onclose: respect close code + retry cap (US2); visibility-driven pause (US1)
│       │   └── documentVisibility.ts                 # NEW — small library-first module wrapping Page Visibility API (US1)
│       └── hooks/
│           └── useRetrospectiveRealtimeSync.ts        # wires visibility pause/resume + manual-retry UI state
├── e2e/
│   ├── concurrent-board-network.spec.ts             # existing pattern reused for new network/visibility scenarios
│   └── idle-connection-cleanup.spec.ts               # NEW — Playwright coverage for US1-US5 (this feature)
└── public/locales/**/translation.json                # new i18next keys for manual-retry / session-expired copy
```

**Structure Decision**: Existing single-repo web-app layout is reused as-is (no new
top-level directories). Frontend changes stay inside the existing
`src/features/boards/retrospective/` feature module (Principle II: Library-First — the
visibility-detection piece is split into its own small module,
`services/documentVisibility.ts`, with a narrow interface, rather than being inlined into
`backendRealtimeClient.ts`). Backend changes stay inside the existing ports/adapters
already responsible for session verification and realtime connection lifecycle — no new
adapter or port is introduced, only new behavior inside the existing ones.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
