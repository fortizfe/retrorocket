# Implementation Plan: Anonymous Board Mode

**Branch**: `051-anonymous-board-mode` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/051-anonymous-board-mode/spec.md`

## Summary

Add a per-board `isAnonymous` setting (default off) that, when on, hides
card-author identity purely at the view layer — for every viewer including
the facilitator — across every board template: no author label on cards,
no "group by user" grouping option, and no author line in TXT/DOCX/PDF
exports. The setting is chosen at board creation and can be flipped at any
time during a live retrospective by the facilitator (and only the
facilitator) from the facilitator menu, propagating to every connected
participant immediately via the realtime channel already in place. Per
research.md, this rides almost entirely on infrastructure that already
exists: the retrospective document's realtime `entity_change` broadcast
already forwards its full body to every connected client with no field
allowlist at the gateway layer, and the countdown-timer feature already
established the exact facilitator-only-mutation pattern (route-level +
adapter-level `requireFacilitator` check) this feature reuses verbatim.
Underlying data — who actually authored each card — is never altered,
removed, or gated server-side (FR-006/FR-007); a column's "group by user"
choice is preserved untouched and simply not rendered while the board is
anonymous, so it reappears automatically the moment anonymity is turned
back off (research.md §5, data-model.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) throughout — React 18.2 frontend (Vite 4), Node.js/Express 5 backend (`server/tsconfig.json`)

**Primary Dependencies**: No new dependency. Frontend: existing `@headlessui/react` `Switch` (the exact primitive `ActionColumnToggle.tsx` already uses for an equivalent board-level toggle), `react-i18next`, `framer-motion`, `lucide-react`, the existing `src/lib/components/ui/*` primitives. Backend: existing `firebase-admin` (Firestore Admin SDK), Express 5, `express-rate-limit` — no new port implementation class beyond extending two existing adapters.

**Storage**: Cloud Firestore, `retrospectives/{id}` document (existing collection, existing document — this feature adds exactly one field, `isAnonymous: boolean`, to it; no new collection). Reads/writes exclusively via the existing `firebase-admin`-backed `RetrospectiveBoardPort`/`BoardsPort` adapters — no direct browser Firestore access is introduced (would violate the zero-direct-Firestore architecture established in feature 019).

**Testing**: Vitest (`server/vitest.config.ts` for backend, root `vitest.config.ts` for frontend) — coverage-gated at 80% branches/functions/lines/statements per constitution Principle VI; Playwright E2E (`npm run e2e`), including a two-browser-context scenario (facilitator + participant) to exercise the live cross-participant propagation from User Story 3, following the exact pattern feature 019/021 already established for this suite.

**Target Platform**: Same Vercel-hosted, same-origin web app as every other feature (`retro-rocket/src` frontend + `retro-rocket/server`/`retro-rocket/api` backend); both currently supported `i18next` locales (English, Spanish); light and dark themes; responsive mobile/tablet/desktop.

**Project Type**: Existing web application (frontend + backend split, single npm workspace) — this feature touches both `retro-rocket/src` and `retro-rocket/server`, plus one new REST endpoint; it introduces no new realtime message type (research.md §1) and no new top-level project.

**Performance Goals**: Facilitator's anonymity toggle reaches every connected participant within 2 seconds (p95) (spec SC-004) — reuses the existing realtime channel's already-established latency characteristics (feature 019/021), not a new performance target to engineer for. No new list/throughput concern (a board's card count is unaffected).

**Constraints**: Anonymity MUST be enforceable with zero change to any other operation's behavior or outcome (FR-007) — every existing card/vote/like/reaction/drag/timer/note/action-item/sentiment operation MUST produce identical results regardless of `isAnonymous` (verified by re-running feature 019's existing operation coverage against an anonymous board, quickstart.md §3). MUST NOT alter, remove, or recompute any stored authorship data (FR-006) — enforced by keeping `isAnonymous` purely additive at every layer (data-model.md) and never touching `createdBy`/`createdByName` on `Card`. MUST NOT persist the "group by user → none" anonymous-mode fallback into `columnGroupingStates` (FR-010, research.md §5). Facilitator-only mutation MUST be enforced at both the route and adapter layers, mirroring the existing countdown-timer methods exactly (no new authorization pattern introduced). All new user-visible text MUST go through `i18next` for both locales (constitution). WCAG 2.1 AA MUST hold for the two new interactive/visual surfaces (facilitator toggle, persistent indicator) in both themes (constitution Principle VIII).

**Scale/Scope**: One new Firestore field, one new REST endpoint (`PUT /api/retrospectives/:id/anonymity`), one extended endpoint (`POST /api/boards`), one extended response shape (`GET /api/retrospectives/:id`); zero new realtime message types. Frontend touches: the create-board flow (1 component), the facilitator menu (1-2 components), the board topbar (1 component, new indicator), card-author rendering (1 shared component + its call site), column-grouping options/rendering (2 components), and the three export services + their shared caller. Two locales (en/es). No new page, no new route, no new top-level directory.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Every new/changed behavior (adapter `setAnonymous`, the new route, `createBoard`'s extended input, `parseRetrospectiveFields`, `getGroupingOptions`'s new exclusion param, card-author conditional rendering, export conditional) gets a failing test written first, per `tasks.md`'s ordering — mirrors the existing `server/test/`/`src/test/` structure feature-by-feature (e.g. `configureTimer`'s existing test as the direct template for `setAnonymous`'s test). | PASS — enforced in Phase 2 task ordering |
| II. Library-First | No new domain capability beyond what already exists as decoupled modules (`backendRetrospectiveClient.ts`, `backendBoardsClient.ts`, `columnGrouping.ts`) — this feature extends those existing, already-isolated modules rather than introducing UI-coupled logic. | PASS |
| III. Prefer Proven Third-Party Libraries | Zero new dependencies (research.md — reuses `@headlessui/react`'s `Switch`, already used by `ActionColumnToggle.tsx` for an equivalent case). | PASS |
| IV. SOLID | The new `RetrospectiveBoardPort.setAnonymous()` method sits behind the same port abstraction every other facilitator mutation already uses (Dependency Inversion unchanged); `FirestoreRetrospectiveBoardAdapter`/`FirestoreBoardsAdapter` remain the only classes touching `firebase-admin` for this data — no Firestore access is introduced into the UI layer, and the existing `RetrospectiveReadPort` (015, MCP, read-only by design) is left untouched. | PASS |
| V. Simplicity (KISS + YAGNI) | Deliberately reuses existing infrastructure at every turn instead of building new mechanism: no new realtime message type, no new Firestore collection, no migration script for legacy boards (`?? false` default, matching the existing `columnGroupingStates ?? {}` precedent), no per-card/per-column anonymity (out of scope per spec Assumptions), no new authorization concept beyond the existing `createdBy`-based facilitator check. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | New/changed units (`setAnonymous` adapter method + use-case, extended `createBoard`, the new route, `parseRetrospectiveFields`, `getGroupingOptions`, the anonymity toggle component, the persistent indicator, the three export services' conditional) all get Vitest coverage; existing coverage for every file touched must not drop below the `vitest.config.ts` floor. | PASS — verified per task |
| VII. E2E Testing with Playwright | New/extended `e2e/` coverage: creating an anonymous board, participating in one (no author names, no "group by user"), the facilitator's live two-context toggle (quickstart.md §4), and export output for both states. | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | The facilitator toggle reuses `ActionColumnToggle`'s already-compliant accessible-switch pattern (keyboard-operable, visible focus, correct ARIA state/label) rather than inventing new interaction markup; the persistent anonymity indicator conveys state via text (not color/icon alone) and must pass the existing `contrast.tokens.test.ts`/manual contrast check in both themes (quickstart.md §8). | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | This feature adds two small, functional UI elements (a toggle switch, a status badge) rather than a page redesign — no new visual language or animation direction is being explored. `apple-design`/`emil-design-eng` govern their visual integration into the existing facilitator-menu and topbar surfaces (spacing, hierarchy, restraint); `animate` governs the toggle's state-change feedback and the indicator's enter/exit if either is animated, consistent with the project's established motion conventions; no `prototype`-style direction exploration is warranted for a control this small and precedented (`ActionColumnToggle` is the direct visual/interaction template). | PASS |

No violations requiring justification. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: `data-model.md` adds exactly one additive
boolean field with no schema migration; `contracts/*` introduce one new
facilitator-only endpoint and two additive field extensions, reusing
existing auth, error-envelope, and realtime-propagation mechanisms
verbatim; `quickstart.md`'s validation scenarios exercise every existing
operation against an anonymous board specifically to prove FR-007's
zero-regression requirement. All nine gates above still PASS unchanged —
no new dependency, no new realtime message type, no Firestore schema
migration, and no reduction in test or accessibility coverage was
introduced during Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/051-anonymous-board-mode/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/                           # Phase 1 output (/speckit-plan command)
│   ├── anonymity-api-contract.md
│   ├── realtime-anonymity-contract.md
│   └── anonymity-ui-behavior-contract.md
├── checklists/
│   └── requirements.md                  # Spec quality checklist (/speckit-specify command output)
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/
│   ├── src/
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── retrospective.ts               # RetrospectiveDTO.isAnonymous; RetrospectiveBoardPort.setAnonymous()
│   │   │   │   └── boards.ts                       # CreateBoardInput.isAnonymous?
│   │   │   └── use-cases/
│   │   │       ├── boards/CreateBoard.ts            # CreateBoardParams.isAnonymous? passed through
│   │   │       └── retrospective/SetAnonymity.ts    # NEW — thin wrapper mirroring ConfigureTimer.ts
│   │   ├── adapters/firebase/
│   │   │   ├── FirestoreRetrospectiveBoardAdapter.ts  # toRetrospective() default; new setAnonymous()
│   │   │   └── FirestoreBoardsAdapter.ts               # createBoard() batch.set adds isAnonymous
│   │   └── http/routes/
│   │       └── retrospectives.ts                    # New PUT /api/retrospectives/:id/anonymity; serializeBoardState() adds isAnonymous
│   └── test/
│       ├── application/use-cases/retrospective/SetAnonymity.test.ts     # NEW
│       ├── adapters/firebase/FirestoreRetrospectiveBoardAdapter.test.ts # extended
│       ├── adapters/firebase/FirestoreBoardsAdapter.test.ts             # extended
│       └── http/routes/retrospectives.test.ts                          # extended
├── src/
│   ├── features/
│   │   ├── create-board/components/
│   │   │   └── CreateBoardFlow.tsx                  # Anonymity toggle in the "details" step (US1)
│   │   ├── dashboard/services/
│   │   │   └── backendBoardsClient.ts                # createBoard() payload adds isAnonymous
│   │   ├── boards/
│   │   │   ├── types/
│   │   │   │   ├── retrospective.ts                  # Retrospective.isAnonymous
│   │   │   │   └── columnGrouping.ts                 # getGroupingOptions() gains an exclude-"user" param
│   │   │   ├── retrospective/
│   │   │   │   ├── services/backendRetrospectiveClient.ts  # RetrospectiveState.isAnonymous; new setAnonymity()
│   │   │   │   ├── hooks/useRetrospectiveRealtimeSync.ts   # parseRetrospectiveFields() adds isAnonymous
│   │   │   │   ├── components/CardHeader.tsx               # author rendering gated by board.isAnonymous
│   │   │   │   ├── components/DraggableCard.tsx            # passes the gated author value
│   │   │   │   └── components/RetrospectiveTopbar.tsx      # NEW persistent anonymity indicator (US2/US3, FR-013)
│   │   │   ├── clustering/components/
│   │   │   │   ├── GroupableColumn.tsx                # effectiveCriteria display-time override (FR-010)
│   │   │   │   └── GroupedCardList.tsx                # consumes effectiveCriteria, no persistence change
│   │   │   ├── facilitator/components/
│   │   │   │   └── ControlsTab.tsx                    # NEW facilitator-only anonymity toggle (US3, FR-008/FR-011)
│   │   │   ├── countdown/components/
│   │   │   │   └── FacilitatorMenu.tsx                 # Threads isAnonymous/toggle handler into ControlsTab
│   │   │   └── export/services/
│   │   │       ├── unifiedExportService.ts             # passes isAnonymous through to each format service
│   │   │       ├── txtExportService.ts                 # omits "Autor: …" line when anonymous (FR-012)
│   │   │       ├── docxExportService.ts                # same
│   │   │       └── pdfExportService.ts                 # same
│   │   └── auth/… (unchanged)
│   ├── pages/
│   │   └── RetrospectivePage.tsx                     # board → Retrospective mapping gains isAnonymous
│   └── locales/
│       ├── en.json                                    # New keys: creation toggle, facilitator toggle, indicator
│       └── es.json                                    # Kept in lockstep with en.json
├── src/test/
│   ├── features/create-board/CreateBoardFlow.test.tsx            # extended
│   ├── features/dashboard/services/backendBoardsClient.test.ts   # extended
│   ├── features/boards/types/columnGrouping.test.ts               # extended
│   ├── features/boards/retrospective/backendRetrospectiveClient.test.ts  # extended
│   ├── features/boards/retrospective/useRetrospectiveRealtimeSync.test.ts # extended
│   ├── features/boards/retrospective/CardHeader.test.tsx          # extended (if present) or new
│   ├── features/boards/retrospective/RetrospectiveTopbar.test.tsx # extended
│   ├── features/boards/clustering/GroupableColumn.test.tsx        # extended
│   ├── features/boards/facilitator/ControlsTab.test.tsx           # extended
│   └── features/boards/export/*.test.ts                           # extended (txt/docx/pdf + unified)
└── e2e/
    └── retrospective-board.spec.ts                     # extended: create-anonymous, participate-anonymous, facilitator-toggle-live (two contexts), export-anonymous
```

**Structure Decision**: No new top-level directory on either side. This
feature extends the existing `retro-rocket/server` hexagonal
ports/adapters/use-cases/routes layering established by feature 019 (one
new port method + one new thin use-case + one new route, following the
countdown-timer's exact precedent) and the existing `retro-rocket/src`
`features/boards/*` structure (creation flow, retrospective board,
clustering, facilitator, export — each already its own module). The only
net-new files are the backend `SetAnonymity.ts` use-case and its test, and
the frontend `ControlsTab.tsx` addition (no new file — an existing file
gains a control) plus the `RetrospectiveTopbar.tsx` indicator (also an
addition to an existing file, not a new one). No new page, no new route
component, no new context/provider (`BoardDataContext` already exposes
both `isFacilitator` and `retrospective` to every consumer that needs
them — research.md §6).

## Complexity Tracking

> Not applicable — no Constitution Check violations were identified.
