# Implementation Plan: Fix Typing Indicator Flicker

**Branch**: `026-fix-typing-indicator-flicker` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-fix-typing-indicator-flicker/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Root cause, confirmed directly in the code and its own test suite: `OptimizedTypingStatusService.setTypingStatusDebounced` (`src/features/boards/retrospective/services/OptimizedTypingStatusService.ts:21-58`) schedules an unconditional 300ms timer on every `isActive:true` call that writes `isActive:false` to the backend unless another `isActive:true` call arrives within that same 300ms to reset it — a behavior its own test literally names `'auto-deactivates after the 300ms debounce window if no further keystroke resets it'`. Its caller, `useTypingStatus.startTyping` (`src/features/boards/retrospective/hooks/useTypingStatus.ts:60-91`), deliberately throttles repeat calls into this service to once per `UPDATE_THROTTLE = 2000ms` — a sensible anti-spam measure on its own — but that throttle means the 300ms reset almost never lands in time. The result: the backend receives `isActive:true`, then `isActive:false` ~300ms later, then nothing for ~1700ms, then the cycle repeats every throttle window as long as the user keeps typing. This is exactly the reported defect: the indicator "shows and hides an instant later." Two independent, un-coordinated timing mechanisms (a 300ms service-level timer nobody told about the 2000ms hook-level throttle) were each locally reasonable but never designed to work together.

**Fix** (Clarifications 2026-08-06): Give the "when has this user stopped typing" decision to exactly one owner — `useTypingStatus`, which already tracks per-column keystroke recency and already owns the local inactivity fallback — and reduce `OptimizedTypingStatusService` to a thin, unconditional pass-through write (no auto-deactivation timer of its own). `useTypingStatus`'s existing local "assume stopped" timeout (currently 4000ms) becomes exactly **3000ms**, matching the clarified grace period, and continues to be reset on every keystroke and to fire an explicit `stopTyping()` call, same as today. The existing explicit-stop call sites (submit, cancel, empty-textarea, unmount/`beforeunload`) are unchanged. For the disconnect/connection-loss case (FR-004), the server-side hard-TTL sweep in `FirestoreRealtimeGatewayAdapter` (`TYPING_STATUS_TTL_MS`/`TYPING_STATUS_SWEEP_INTERVAL_MS`) is tightened from `5000ms`/`1000ms` to `3000ms`/`500ms`, bringing its worst-case bound (~3.5s) in line with the same ±0.5s tolerance already accepted for SC-002 — this is a pure constant change, no new architecture, and stays proportionate (Constitution V) since the existing generic sweep already covers both graceful and abrupt disconnects uniformly without needing a new proactive on-close cleanup path.

**Accessibility** (Clarification 2026-08-06, FR-009/SC-006, User Story 4): `TypingPreview` (`src/lib/components/ui/TypingPreview.tsx`) gains an always-mounted, visually-hidden element with `role="status" aria-live="polite" aria-atomic="true"`, decoupled from the `AnimatePresence`-driven visual card that mounts/unmounts. It renders the exact same computed text the visible card already shows (`formatTypingText()`), so no new user-facing string is introduced — the pre-existing gap where this component's text bypasses i18next is unrelated, already-existing debt this feature does not expand or fix. Keeping the live region permanently in the DOM (content toggling between the computed string and empty) rather than mounting/unmounting the whole region avoids the well-known screen-reader unreliability of live regions that don't exist in the DOM before their first content change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18, Node.js (server) — unchanged from the existing codebase

**Primary Dependencies**: React + `framer-motion` (existing `AnimatePresence`/`motion` usage in `TypingPreview.tsx`), `ws` (existing WebSocket client/server transport), `firebase-admin` (Firestore, server-side typing-status storage) — no new dependency introduced

**Storage**: Firestore `typingStatus` collection (existing, `{retroId}_{userId}_{column}` doc id, unchanged shape) — no new field, no new collection

**Testing**: Vitest + Testing Library (unit, 80%/78%/64%/50% coverage floor per `vitest.config.ts` and Constitution VI), Playwright (E2E, Constitution VII) extending the existing `e2e/retrospective-board.spec.ts` typing-indicator test; `@axe-core/playwright` (already a devDependency) for the new accessibility assertion

**Target Platform**: Same SPA (frontend) + Node.js backend (Vercel serverless functions) deployment as the rest of the retrospective board feature — unchanged

**Project Type**: Web application (existing `retro-rocket/` frontend + `retro-rocket/server/` backend, hexagonal/ports-and-adapters architecture)

**Performance Goals**: No new perceptible latency; the fix removes a redundant client-side timer/write cycle rather than adding one. No new fixed-interval client polling is introduced (FR-006/SC-004) — the existing WebSocket push channel (`backendRealtimeClient.ts`) is unchanged; only the server's already-existing internal safety-net sweep interval (not client-facing, not polling) is retuned from 1000ms to 500ms ticks.

**Constraints**: Must not regress the existing "no polling" real-time architecture (feature 019/021); must not introduce a new Firestore field, collection, or index; must keep the existing `POST /api/retrospectives/:id/typing` and WS `typingStatus` `entity_change` wire contracts byte-for-byte unchanged (only internal timing constants and client-side ownership of a decision move); must satisfy Constitution VIII (WCAG 2.1 AA) for the new accessible announcement without introducing a new hardcoded user-visible string

**Scale/Scope**: Purely a timing/ownership fix confined to `OptimizedTypingStatusService.ts`, `useTypingStatus.ts`, `TypingPreview.tsx`, and `FirestoreRealtimeGatewayAdapter.ts`'s two constants — no new module, no new domain entity, no new endpoint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Yes | `OptimizedTypingStatusService.test.ts`'s existing test asserting the flawed 300ms auto-deactivation is replaced with a failing test asserting the correct behavior (no auto-deactivation while nothing else calls stop) before the implementation changes; `useTypingStatus.test.ts`'s 4000ms timer test is updated to 3000ms first; new tests for the ARIA live region and for the tightened TTL/sweep constants are written before their respective implementations. |
| II. Library-First | Yes | No new capability module — the fix narrows/simplifies two existing services (`OptimizedTypingStatusService`, `useTypingStatus`) in place, matching how prior "fix-*" features (023/024/025) extended existing files rather than introducing new ones. |
| III. Prefer Proven Third-Party Libraries | Yes | No new dependency; reuses the existing `framer-motion` component, the existing WebSocket transport, and the existing `@axe-core/playwright` devDependency already used elsewhere for accessibility assertions. |
| IV. SOLID | Yes | Restores Single Responsibility: `useTypingStatus` becomes the sole owner of "has this user stopped typing," `OptimizedTypingStatusService` becomes a pure write-forwarding layer with no independent timing decision — the exact split that was blurred and caused the bug. |
| V. Simplicity (KISS/YAGNI) | Yes | Removes a redundant, conflicting timer rather than adding a third coordination mechanism; the disconnect bound (FR-004) is met by retuning two existing constants rather than adding a new proactive on-WS-close cleanup path (research.md §4, alternatives considered). |
| VI. Mandatory Unit Testing & Coverage Floor | Yes | All changed units (`OptimizedTypingStatusService`, `useTypingStatus`, `TypingPreview`'s live region, `FirestoreRealtimeGatewayAdapter`'s constants) get Vitest coverage; no threshold lowered. |
| VII. E2E Testing with Playwright | Yes | `e2e/retrospective-board.spec.ts`'s existing typing-indicator test (line 581) is extended to assert no flicker during continuous typing and a bounded disappearance after stopping; a new assertion covers the accessible live-region announcement. |
| VIII. Accessibility WCAG 2.1 AA (NON-NEGOTIABLE) | Yes | New `role="status" aria-live="polite"` live region directly implements FR-009/SC-006 (WCAG 4.1.3 Status Messages); no new contrast/focus/color surface is introduced since the visual card itself is unchanged. |
| i18n (Additional Standard) | Yes | No new user-facing string is introduced — the live region reuses the exact string the visible card already renders. The pre-existing hardcoded-Spanish text in `formatTypingText()` is out of scope for this fix (existing debt, not introduced or expanded here). |
| Real-Time Data Security (Additional Standard) | Yes | No `firestore.rules` change; no new read/write pattern — the same `setTypingStatus`/`listActive` port methods are called the same way, just with corrected timing and tuned constants. |

No violations requiring Complexity Tracking.

**Post-Phase 1 re-check**: research.md and data-model.md confirm the design introduces no new entity, collection, dependency, endpoint, or wire-protocol change — the gate assessment above is unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/026-fix-typing-indicator-flicker/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── typing-status-timing-delta.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── features/boards/retrospective/
│   │   ├── services/
│   │   │   └── OptimizedTypingStatusService.ts   # MODIFY: remove the 300ms auto-deactivate timer; isActive:true/false both become immediate, unconditional pass-through writes
│   │   └── hooks/
│   │       └── useTypingStatus.ts                # MODIFY: local "assume stopped" timeout 4000ms → 3000ms (matches FR-003's clarified grace period); UPDATE_THROTTLE (2000ms) unchanged
│   └── lib/components/ui/
│       └── TypingPreview.tsx                     # MODIFY: add an always-mounted, visually-hidden role="status"/aria-live="polite"/aria-atomic="true" element carrying the same text already rendered visually (FR-009)
├── server/
│   └── src/adapters/firebase/
│       └── FirestoreRealtimeGatewayAdapter.ts    # MODIFY: TYPING_STATUS_TTL_MS 5000→3000, TYPING_STATUS_SWEEP_INTERVAL_MS 1000→500 (FR-004's 3s disconnect bound)
├── src/test/features/boards/retrospective/
│   ├── OptimizedTypingStatusService.test.ts      # MODIFY: replace the 300ms-auto-deactivate test with one asserting no auto-deactivation; keep the immediate-write and cleanupUserTypingStatus tests
│   └── useTypingStatus.test.ts                   # MODIFY: 4000ms → 3000ms in the "should auto-stop typing after timeout" test
├── src/test/lib/components/ui/
│   └── TypingPreview.test.tsx                    # ADD (if not already present) or MODIFY: assert the live region's role/aria-live/aria-atomic attributes and that its text matches the visible indicator, with no duplicate announcement when the participant set is unchanged
└── e2e/
    └── retrospective-board.spec.ts               # MODIFY: extend the existing typing-indicator test (line 581) to assert continuous visibility while typing continues (no flicker) and a bounded, ~3s disappearance after stopping; add an axe-core check that the live region is exposed correctly
```

**Structure Decision**: This is a bug fix entirely within the existing `retro-rocket/src` (frontend) and `retro-rocket/server` (hexagonal backend) structure established by features 019/021. No new top-level module, package, collection, domain entity, or endpoint is introduced. Three frontend files and one backend adapter file change; their existing unit/E2E test files are updated in place under TDD.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
