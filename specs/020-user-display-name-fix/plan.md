# Implementation Plan: Show Display Names Instead of User IDs on Retro Board Cards

**Branch**: `020-user-display-name-fix` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-user-display-name-fix/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Retro board cards render the author's raw Firebase uid (`card.createdBy`) instead of a display name, both in "group by user" headers (`useColumnGrouping.ts` → `GroupedCardList.tsx`) and in the per-card author label (`DraggableCard.tsx` → `CardHeader.tsx`). Per clarification, the fix captures the author's display name on the card at creation time (`createdByName`, mirroring the existing `boards.ts` precedent), threads it through the existing card-creation flow (route → use case → Firestore adapter → DTO → frontend `Card` type), and updates the two render/grouping sites to display it — falling back to a live `participants` lookup for legacy cards, then a generic localized label if that also fails. Group headers additionally sort alphabetically by the resolved display name instead of the raw uid.

## Technical Context

**Language/Version**: TypeScript ^5.0.0 (Node.js runtime, version unpinned — no `engines` field or `.nvmrc`)

**Primary Dependencies**: React 18.2 + Vite (frontend), Express 5.2.1 + `firebase-admin` ^14.2.0 (backend, hexagonal architecture under `retro-rocket/server/src/`), `firebase` ^10.0.0 (frontend Firebase client SDK)

**Storage**: Firebase Firestore, accessed on the backend only via `FirestoreCardAdapter` (implements the `CardPort` interface) — no direct frontend Firestore access for cards, per the existing backend-mediation migration already completed for this board screen (branch `019-retro-board-backend-access`)

**Testing**: Vitest ^3.2.4 for both frontend (`retro-rocket/vitest.config.ts`, jsdom) and backend (`retro-rocket/server/vitest.config.ts`, node, with coverage thresholds); `@testing-library/react`/`jest-dom`/`user-event` for component tests; Playwright `@playwright/test` ^1.61.1 for E2E (`retro-rocket/playwright.config.ts`, run against Firebase emulators)

**Target Platform**: Web application (browser frontend + Node.js/Express backend), single npm package at `retro-rocket/` containing both `src/` (frontend) and `server/` (backend)

**Project Type**: Web application — monorepo-in-one-package (not separate frontend/backend packages)

**Performance Goals**: No new performance targets; must not introduce perceptible degradation to the real-time card tree per the constitution's existing performance standard (grouping/name resolution is a synchronous, in-memory operation over already-loaded `cards` and `participants` data — no new network calls added to the render path)

**Constraints**: Must comply with constitution principles II–VIII (see Constitution Check below); no Firestore security rules change required (`firestore.rules` cards rules are generic auth-only, not field-level); no Firestore batch-migration tooling exists in this repo, so legacy cards are handled via backfill-on-read, not a migration script

**Scale/Scope**: Narrow bug fix — one new optional string field (`createdByName`) threaded through ~6 backend files and ~4 frontend files; no new services, no new external dependencies, no schema migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | PASS | `/speckit-tasks` will sequence a failing test before each implementation task (route/use-case/adapter unit tests, `useColumnGrouping` unit tests, `CardHeader`/`DraggableCard` component tests, Playwright grouping assertions) |
| II. Library-First | PASS | No new capability/module introduced; the fix stays inside the existing `features/boards/clustering` and `features/boards/retrospective` modules and the existing hexagonal backend layers |
| III. Prefer Proven Third-Party Libraries | PASS | No new dependency added |
| IV. SOLID | PASS | Firestore access remains behind `CardPort`/`FirestoreCardAdapter`; the new field flows through the existing port/adapter/DTO boundary rather than a new direct Firestore call |
| V. Simplicity (KISS + YAGNI) | PASS | Backfill-on-read (live participant lookup, then generic fallback) is chosen over building new migration tooling that doesn't otherwise exist in this repo |
| VI. Mandatory Unit Testing & Coverage Floor | PASS (enforced in tasks) | New/changed logic (name capture, grouping key/sort, fallback resolution) requires unit tests; 80% thresholds in both `vitest.config.ts` files must be maintained |
| VII. E2E Testing w/ Playwright (NON-NEGOTIABLE) | PASS (enforced in tasks) | "Grouping cards" is an explicitly listed critical flow; existing Playwright grouping coverage must be extended to assert display names (not raw ids) appear, in alphabetical order |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | PASS | Change is text-content-only (no new color-only cues, no new interactive elements); existing `CardHeader`/group-header contrast and focus behavior are unaffected — verify in code review per both light/dark themes |
| Real-Time Data Security | PASS | `firestore.rules` reviewed; no rule change needed; `createdByName` is always server-derived from the session (`displayNameOf(session.user)`), never accepted from client input — same trust model as the existing `createdBy` field |
| Internationalization | PASS (enforced in tasks) | The new generic fallback label ("unknown user" style text) is new user-visible copy and MUST be added as i18next keys across all supported locales, not hardcoded |
| Error Handling & Resilience | PASS | No new async operation is introduced on the render path; name resolution is synchronous over already-loaded data, so no new loading/error state is needed beyond what already exists for `cards`/`participants` |

No violations identified — Complexity Tracking is not required.

**Post-Phase 1 re-check**: Design artifacts (`research.md`, `data-model.md`, `contracts/cards-api.md`, `quickstart.md`) were produced without introducing any new dependency, new service, direct Firestore access outside the existing `CardPort` abstraction, or client-supplied trust boundary. All rows above remain PASS unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/020-user-display-name-fix/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/             # Phase 1 output (/speckit-plan command)
│   └── cards-api.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This is a single-package monorepo (`retro-rocket/`) with the frontend and a hexagonal-architecture backend living side by side, not separate packages:

```text
retro-rocket/
├── server/src/
│   ├── http/routes/retrospectives.ts               # POST /api/retrospectives/:id/cards — add createdByName via existing local displayNameOf()
│   ├── application/use-cases/retrospective/CardLifecycle.ts  # createCard — extend CreateCardParams with createdByName
│   ├── application/ports/cards.ts                   # CreateCardInput / CardDTO — add createdByName field
│   └── adapters/firebase/FirestoreCardAdapter.ts     # createCard write + toCard read mapping — persist/read createdByName
│
├── src/
│   ├── features/boards/types/card.ts                          # Card / CreateCardInput — add createdByName?: string
│   ├── features/boards/types/participant.ts                    # unchanged — used as legacy-card fallback resolver
│   ├── features/boards/retrospective/services/backendRetrospectiveClient.ts  # CardDTO / cardFromDTO — pass createdByName through
│   ├── features/boards/clustering/hooks/useColumnGrouping.ts    # groupCards — key by uid, resolve+sort by display name
│   ├── features/boards/clustering/components/GroupedCardList.tsx  # render resolved display name instead of raw group key
│   ├── features/boards/clustering/components/GroupableColumn.tsx  # thread participants into grouping for legacy-card fallback
│   ├── features/boards/retrospective/components/DraggableCard.tsx  # pass resolved display name (not card.createdBy) to CardHeader
│   ├── features/boards/retrospective/components/CardHeader.tsx     # unchanged (presentational; still just renders `author` prop)
│   └── locales/*                                               # add fallback-label i18next keys for all supported locales
│
├── firestore.rules            # reviewed only — no change expected (generic auth-only rules for cards)
├── vitest.config.ts / server/vitest.config.ts   # existing unit-test runners (frontend/backend)
└── playwright.config.ts / e2e/                  # existing E2E runner — extend grouping-flow assertions
```

**Structure Decision**: Web application, single-package monorepo. Backend changes stay within the existing hexagonal layers (`http/routes` → `application/use-cases` → `application/ports` → `adapters/firebase`) to keep Firestore access behind the `CardPort` abstraction (Principle IV). Frontend changes stay within the existing `features/boards` module boundaries (`types`, `clustering`, `retrospective`) rather than introducing a new shared module, since this is a targeted bug fix, not a new capability (Principle II/V).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — this section is not applicable.
