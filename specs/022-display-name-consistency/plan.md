# Implementation Plan: Consistent Display Name Resolution Across the App

**Branch**: `022-display-name-consistency` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-display-name-consistency/spec.md`

## Summary

Today, different surfaces disagree about a user's name: retro cards and group headers show the name captured at creation time even after the author renames (020's original design), likes/reactions always show the captured name with no live resolution at all, and the TXT/PDF/DOCX exporters render the raw Firebase uid directly (never resolving a name). Per clarification, this feature corrects the resolution priority (the currently configured name wins whenever the account exists; the captured name becomes a fallback used only once the account is gone) and applies it uniformly everywhere.

The implementation adds one small backend write-side capability — `PATCH /api/profile` now also fans out the new name to every `participants` doc belonging to that user, across every retrospective they've ever joined (`ParticipantPort.renameParticipantsForUser`) — and relies entirely on the already-built, per-board Firestore-to-WebSocket relay (`019`/`021`) to deliver that change live to every other participant with the board open, with zero new transport code (research.md §1). On the frontend, the existing `resolveAuthorDisplayName` helper is generalized into `resolveDisplayName(userId, capturedName, participants, fallbackLabel)` — checking the (now always-current) `participants` array first, the entity's own captured name second, a generic fallback last — and adopted by three call sites that don't use it today: `LikeButton.tsx`, `EmojiReactions.tsx` (via a `GroupedReaction.userIds` addition that also fixes a latent self-reaction-detection bug), and all three export services.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict mode), Node.js (Vercel Functions runtime), React 18

**Primary Dependencies**: Express 5 (backend), `firebase-admin` 14 (server-side Firestore access, unchanged), `firebase` 10 (client SDK, unchanged usage), `ws` 8 (existing WebSocket realtime channel, unchanged — reused as-is per research.md §1), Vite, React Router, i18next

**Storage**: Cloud Firestore — no new collections, no schema migration; one existing collection (`participants`) gains a new writer (the rename fan-out) and one existing field (`GroupedReaction.userIds`, a frontend-only view-model type, not persisted) is added

**Testing**: Vitest + Testing Library (unit/integration, 80% coverage floor per constitution), Playwright (E2E, critical flows), against Firebase emulators (`auth`, `firestore`) — same setup already used by `020`'s and `021`'s suites

**Target Platform**: Same single-npm-workspace web application (`retro-rocket/server` = backend, `retro-rocket/src` = frontend), same Vercel serverless Function deployment model as `014`/`017`/`018`/`019`/`021`; no new deployment target

**Project Type**: Web application — monorepo-in-one-package (not separate frontend/backend packages)

**Performance Goals**: Rename fan-out completes synchronously within the existing `PATCH /api/profile` request (no new perceptible latency budget beyond a bounded batch-write); live propagation to other open boards reuses `019`/`021`'s already-established 2s p95 real-time delivery bar — no new performance target introduced, no regression to it either (research.md §1)

**Constraints**: No new Firestore collection, no new WebSocket event type, no new backend read endpoint (research.md §1, §5 — the alternative "batch profile-lookup API" design was explicitly rejected); the rename fan-out MUST be chunked into ≤500-doc Firestore batch writes (the platform's per-batch limit) since a user's total board-join history is unbounded; `firestore.rules` is not touched by this feature (the pre-existing, out-of-scope `users/{uid}` rules gap noted in research.md §5 is not this feature's to fix); no account-deletion capability is built (research.md §4) — "deleted account" scenarios are validated via emulator test fixtures, mirroring `020`'s existing "legacy card, unknown author" technique

**Scale/Scope**: Backend: 1 new `ParticipantPort` method + its `FirestoreRetrospectiveBoardAdapter` implementation, 1 use case gains a second dependency, 2 wiring-file lines. Frontend: 1 resolver function generalized, 1 view-model type gains a field, ~9 call sites updated (2 already-correct card/group-header sites adapted to the new signature, 2 new call sites for likes/reactions, 3 new call sites in export services, plus the incidental `EmojiReactions.tsx` self-reaction-detection fix). No new services, no new external dependencies.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | PASS (planned) | `/speckit-tasks` will sequence a failing test before each change: a `renameParticipantsForUser` adapter test (fan-out updates every matching doc, chunks correctly), an `UpdateDisplayName` use-case test (calls the fan-out after a successful profile update), a `resolveDisplayName` unit test (priority order, never returns a raw uid), `groupReactions` tests (resolved `users` + new `userIds`), and component tests for `LikeButton`/`EmojiReactions`/all three export services asserting no raw uid ever renders. |
| II. Library-First | PASS | No new capability/module introduced; changes stay inside the existing `features/boards/{clustering,retrospective,export}` modules, `lib/utils/cardHelpers.ts`, and the existing hexagonal backend layers (`application/ports` → `application/use-cases` → `adapters/firebase`). |
| III. Prefer Proven Third-Party Libraries | PASS | No new dependency. Reuses the existing `ws`-based realtime channel and `firebase-admin` batch-write API. |
| IV. SOLID | PASS | The new capability is one narrow method added to the existing `ParticipantPort` (Interface Segregation preserved — no mixing of profile and participant concerns into one bloated port); `UpdateDisplayName`'s use case depends on two ports, each still behind its own interface (Dependency Inversion preserved); Firestore access for the fan-out stays behind `FirestoreRetrospectiveBoardAdapter`, the same adapter that already implements `join`. |
| V. Simplicity (KISS + YAGNI) | PASS | The core design decision (research.md §1, §2) was chosen specifically *because* it requires no new endpoint, no new WebSocket event type, and no new "batch profile lookup" port — it reuses `019`/`021`'s existing per-board Firestore-to-WebSocket relay entirely as-is. The alternative (a dedicated live profile-directory service) was explicitly evaluated and rejected as unnecessary duplication (research.md §1, §5). |
| VI. Mandatory Unit Testing & Coverage Floor | PASS (enforced in tasks) | New/changed logic (fan-out, resolution priority, `groupReactions`, export author lines) requires unit tests; 80% thresholds in both `vitest.config.ts` files must be maintained. |
| VII. E2E Testing w/ Playwright (NON-NEGOTIABLE) | PASS (enforced in tasks) | "Grouping cards," "voting/liking," and "exporting to PDF/DOCX" are all explicitly listed critical flows; existing Playwright coverage must be extended to assert a rename is reflected live in a second, already-open browser context (User Story 1's core scenario) and that no exported file contains a raw uid. |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | PASS | Change is text-content-only (no new interactive elements, no new color-only cues); existing tooltip/label contrast and focus behavior are unaffected — verify in code review per both light/dark themes. |
| Real-Time Data Security | PASS | No `firestore.rules` change; the fan-out write happens server-side via `firebase-admin` (already bypasses client-facing rules by design, per `019`'s precedent); no new client-side Firestore read is introduced anywhere (exports, likes, and reactions all continue to consume already-backend-fetched `participants` data, never querying Firestore directly). The pre-existing `users/{uid}` rules gap found in research.md §5 is unrelated to this feature's changes and is not touched. |
| Internationalization | PASS | Reuses the existing `retrospective.grouping.unknownAuthor` i18n key across all surfaces (cards, likes, reactions, exports) rather than introducing new per-surface fallback copy — no new translatable strings needed. |
| Error Handling & Resilience | PASS | The fan-out is part of the same `PATCH /api/profile` request/response cycle already covered by that route's existing error handling; no new async operation is introduced on any render path (resolution remains a synchronous, in-memory operation over already-loaded `participants` data, per `020`'s precedent). |

No violations identified — Complexity Tracking is not required.

**Post-Phase 1 re-check**: Design artifacts (`research.md`, `data-model.md`, `contracts/display-name-resolution.md`, `quickstart.md`) were produced without introducing any new dependency, new service, new endpoint, new WebSocket event type, or direct-Firestore-access outside the existing port/adapter boundaries. All rows above remain PASS unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/022-display-name-consistency/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/             # Phase 1 output (/speckit-plan command)
│   └── display-name-resolution.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This is a single-package monorepo (`retro-rocket/`) with the frontend and a hexagonal-architecture backend living side by side, not separate packages:

```text
retro-rocket/
├── server/src/
│   ├── application/ports/retrospective.ts                     # ParticipantPort — add renameParticipantsForUser(uid, name)
│   ├── application/use-cases/profile/UpdateDisplayName.ts      # gains participantPort dep; calls fan-out after a successful rename
│   ├── adapters/firebase/FirestoreRetrospectiveBoardAdapter.ts # implements renameParticipantsForUser (query participants where userId==uid, chunked batch-update .name)
│   ├── http/routes/profile.ts                                  # ProfileRouterDeps gains participantPort; PATCH handler passes it through
│   └── http/profile-wiring.ts                                  # constructs FirestoreRetrospectiveBoardAdapter(db), adds to ProfileRouterDeps
│
├── src/
│   ├── lib/utils/cardHelpers.ts                                        # resolveAuthorDisplayName → resolveDisplayName(userId, capturedName, participants, fallback); groupReactions gains (participants, fallback) params + populates userIds
│   ├── features/boards/types/card.ts                                    # GroupedReaction — add userIds: string[]
│   ├── features/boards/types/export.ts                                  # UnifiedExportData.participants — widen from {name, joinedAt}[] to Participant[] (userId already present at runtime, per research.md §7)
│   ├── features/boards/retrospective/components/DraggableCard.tsx       # adapt resolveDisplayName call; pass participants + fallback into groupReactions(); pass participants down to LikeButton
│   ├── features/boards/clustering/components/GroupedCardList.tsx        # adapt resolveDisplayName call (userId/capturedName args instead of card)
│   ├── features/boards/clustering/hooks/useColumnGrouping.ts            # adapt resolveDisplayName call
│   ├── features/boards/retrospective/components/LikeButton.tsx          # NEW: participants prop; resolve each like's tooltip name via resolveDisplayName instead of raw like.username
│   ├── features/boards/retrospective/components/EmojiReactions.tsx      # NEW: self-reaction detection uses groupedReactions[].userIds instead of the (buggy) users array; tooltip text unchanged (already-resolved strings)
│   ├── features/boards/export/services/txtExportService.ts              # buildCardMetadata: resolveDisplayName instead of raw card.createdBy
│   ├── features/boards/export/services/pdfExportService.ts              # createCard: resolveDisplayName instead of raw card.createdBy
│   ├── features/boards/export/services/docxExportService.ts             # buildCardMetadata: resolveDisplayName instead of raw card.createdBy
│   └── features/boards/participants/components/{ParticipantList.tsx,ResponsiveParticipantDisplay.tsx,CompactAvatarGroup.tsx}  # UNCHANGED — already render participant.name directly, which becomes always-current via the backend fan-out
│
├── firestore.rules            # reviewed only — no change (research.md §5's pre-existing users/{uid} gap is out of scope)
├── vitest.config.ts / server/vitest.config.ts   # existing unit-test runners (frontend/backend)
└── playwright.config.ts / e2e/                  # existing E2E runner — extend rename-propagation and export-content assertions
```

**Structure Decision**: Web application, single-package monorepo. Backend changes stay within the existing hexagonal layers (`http/routes` → `application/use-cases` → `application/ports` → `adapters/firebase`), adding one narrow method to the already-existing `ParticipantPort` rather than a new port (Principle IV). Frontend changes stay within the existing `features/boards` module boundaries and `lib/utils/cardHelpers.ts` rather than introducing a new shared module, since this generalizes and corrects an existing resolver rather than adding a new capability (Principle II/V).

## Complexity Tracking

*No violations — table omitted.*
