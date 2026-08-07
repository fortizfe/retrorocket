# Implementation Plan: Fix Typing Indicator Ghost State on Column Switch

**Branch**: `027-fix-typing-status-race` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-fix-typing-status-race/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix a client-side ordering race in the typing-status write path: `OptimizedTypingStatusService.setTypingStatusDebounced` fires each `isActive:true`/`false` write to the backend without waiting for the previous write for that same participant+column to complete, so a late-arriving `true` can land after a subsequent `false`, resurrecting a "ghost" typing indicator in a column the participant already left (up to ~3.5s, until the server's disconnect-safety sweep clears it). The fix serializes writes per participant+column — a FIFO promise queue keyed by `retrospectiveId_column` inside `OptimizedTypingStatusService` — so requests reach the server in the same order the client issued them, without changing the wire protocol, doc model, or any consumer of `typingStatuses`. Per clarification, a failed write is discarded (not retried) and the queue proceeds immediately to the next update, relying on the existing disconnect-safety TTL sweep as the fallback correction path.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js (backend), React 18 (client)

**Primary Dependencies**: React 18, Express 5 (`server/`), `firebase-admin` 14 (Firestore), Vite 4, `framer-motion` (TypingPreview animation, unchanged by this fix)

**Storage**: Firestore `typingStatus` collection, doc id `{retroId}_{userId}_{column}` (unchanged — see `FirestoreTypingStatusAdapter.ts`); `isActive:false` deletes the doc, `isActive:true` sets it

**Testing**: Vitest 3 (unit, `src/test/**` and `server/` via `server/vitest.config.ts`) + Playwright 1.61 E2E (`e2e/retrospective-board.spec.ts`) against the Firebase emulator (`npm run e2e`)

**Target Platform**: Web (browser client + Node.js backend), same deployment as the rest of the app — no new platform surface

**Project Type**: Web application — single repo (`retro-rocket/`) with a Vite/React client under `src/` and an Express/Firebase-admin backend under `server/`, not a split top-level frontend/backend layout

**Performance Goals**: No new performance goal beyond SC-002 (indicator settles in its correct column within 1s of a switch, under normal network conditions) — this is a correctness fix, not a performance optimization

**Constraints**: No change to `POST /api/retrospectives/:id/typing`, the WS `typingStatus` `entity_change` event shape, `TypingStatusPort`/`FirestoreTypingStatusAdapter` doc shape, or `useRetrospectiveRealtimeSync`'s reducer (per spec Assumptions and research.md precedent from feature 026); fix confined to the client write-forwarding layer

**Scale/Scope**: One service file (`OptimizedTypingStatusService.ts`) gains a small per-key FIFO queue; no data-model, contract, or UI changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Yes | A failing unit test for the new ordering behavior (writes for the same participant+column land in issuance order even when an earlier request resolves later) must be written before the queue is implemented, extending `OptimizedTypingStatusService.test.ts`. The existing E2E test (`e2e/retrospective-board.spec.ts:596`) already encodes the regression at the acceptance level and is currently red on `main` — it becomes the outer TDD loop this fix must turn green. |
| II. Library-First | Yes | No new module: the fix stays inside the existing `OptimizedTypingStatusService` (`src/features/boards/retrospective/services/`), which is already the sole owner of the write-forwarding responsibility (per feature 026's research.md §2, SRP). No new coupling introduced. |
| III. Prefer Proven Third-Party Libraries | Yes | No new dependency. A per-key FIFO promise queue is a few lines of plain TypeScript/Promise chaining — reaching for a queuing library here would violate Simplicity (V) for a problem this small. |
| IV. SOLID | Yes | Single Responsibility preserved: the service remains the one place deciding *how* writes reach the server (now including their order); `useTypingStatus` remains the one place deciding *when* a user has started/stopped (unchanged, per 026). No new interface needed — internal to the existing class. |
| V. Simplicity (KISS/YAGNI) | Yes | Serialization is keyed per `retrospectiveId_column`, matching the existing Firestore doc granularity exactly — no broader locking, no cross-column coordination, no new abstraction beyond a `Map` of chained promises. |
| VI. Unit Testing & 80% Coverage Floor | Yes | New branch (queued vs. immediate write path) requires new unit test cases; existing coverage thresholds in `vitest.config.ts` must still be met. |
| VII. E2E Testing with Playwright | Yes | `e2e/retrospective-board.spec.ts:596` is the existing, required regression coverage for this exact defect (FR-006) and must pass consistently (SC-001). Tasks phase (see tasks.md T008) additionally adds one new E2E test covering User Story 3's different-columns-simultaneously scenario and SC-002's timing bound, which the initial plan had not anticipated. |
| VIII. Accessibility (WCAG 2.1 AA) | No | No user-facing surface, markup, or styling changes — `TypingPreview.tsx` and its accessible live region are untouched (per spec Assumptions). |

**Initial gate result**: PASS — no violations, no entries needed in Complexity Tracking.

**Post-Phase 1 re-check**: PASS — `data-model.md` confirms no new/changed entity or field; `contracts/README.md` confirms no interface change; `quickstart.md` exercises only existing test commands (`npm run test:run`, `npm run test:coverage`, `npm run e2e`, `npm run type-check`, `npm run lint`). Design artifacts introduce nothing that revises the initial assessment.

## Project Structure

### Documentation (this feature)

```text
specs/027-fix-typing-status-race/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — empty; see contracts/README.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── features/boards/retrospective/services/
│   │   └── OptimizedTypingStatusService.ts   # MODIFIED — add per-column FIFO write queue
│   └── features/boards/retrospective/hooks/
│       └── useTypingStatus.ts                # UNCHANGED — remains sole owner of start/stop timing (026)
├── src/test/features/boards/retrospective/
│   └── OptimizedTypingStatusService.test.ts  # MODIFIED — new ordering/failure-handling test cases
└── e2e/
    └── retrospective-board.spec.ts           # MODIFIED — existing test at :596 is the regression gate (FR-006, unchanged); a new test is added (tasks.md T008) for US3's different-columns-simultaneously scenario and SC-002's timing bound
```

**Structure Decision**: Existing single-repo web app layout (Vite/React client under `src/`, Express/Firebase-admin backend under `server/`, both already present). This fix touches one client-side service file and its unit tests, plus one additive E2E test — no new directories, no backend changes (confirmed in Technical Context: wire protocol, doc shape, and the WS event contract are all unchanged, matching the "no wire-protocol change" precedent set by feature 026's research.md §5).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Not applicable — the Constitution Check above reports no violations.
