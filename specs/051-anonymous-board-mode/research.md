# Research: Anonymous Board Mode

All Technical Context items were resolvable from the existing codebase — no
open `NEEDS CLARIFICATION` markers remain. This document records the key
architectural decisions and the precedents in the codebase they follow.

## 1. Where the anonymity flag lives and how it reaches every client

**Decision**: A single boolean field, `isAnonymous`, stored directly on the
`retrospectives/{id}` Firestore document (default `false`), exposed through
`RetrospectiveDTO` (backend) and `RetrospectiveState`/`Retrospective`
(frontend) — the same document/DTO/state chain `columnGroupingStates`
already rides.

**Rationale**: The realtime delivery pipeline built in feature 019/021
already watches the whole `retrospectives/{id}` document
(`FirestoreRealtimeGatewayAdapter.ts`'s `startFirestoreBoardListeners`,
`onEvent('retrospective', 'modified', snap.id, snap.data())`) and forwards
its **entire raw document body** to every connected participant as an
`entity_change` (`entity: 'retrospective'`) event — no field allowlist
exists at that layer. Adding `isAnonymous` to the document means it
propagates to every connected client automatically, with **zero changes**
to the WebSocket gateway, the Firestore listener, or the broadcast
mechanism. This directly satisfies FR-009 (facilitator's change reaches all
connected participants without reload) using existing infrastructure, and
keeps the change genuinely minimal (constitution Principle V).

The one place that *does* need an explicit update is the frontend's
`parseRetrospectiveFields()` (`useRetrospectiveRealtimeSync.ts`), which
allowlists which raw fields get merged into client state on a `retrospective`
event — `isAnonymous` must be added there alongside `columnGroupingStates`.

**Alternatives considered**:
- *A new Firestore collection for board settings*: rejected — adds a second
  document to read/write/listen to for a single boolean, with no benefit
  over the existing document (Principle V, Simplicity).
- *A new WebSocket message type dedicated to anonymity changes*: rejected —
  the generic `entity_change('retrospective', …)` path already exists and
  already carries this exact class of board-level setting
  (`columnGroupingStates`); a bespoke message type would duplicate it.

## 2. Facilitator-only mutation path

**Decision**: Mirror the existing countdown-timer pattern exactly:
- A new `RetrospectiveBoardPort.setAnonymous(retrospectiveId, uid, isAnonymous): Promise<RetrospectiveDTO>` method, implemented in
  `FirestoreRetrospectiveBoardAdapter` using its existing private
  `requireFacilitator(retrospectiveId, uid)` helper (already used by
  `configureTimer`/`startTimer`/`pauseTimer`/`resetTimer`/`deleteTimer`),
  which throws `ForbiddenError` if `uid !== createdBy`.
- A new route, `PUT /api/retrospectives/:id/anonymity`, that calls the
  route-level `requireFacilitator(deps, retrospectiveId, session.sub)` guard
  *before* invoking the use-case — the same defense-in-depth double-check
  (route guard + adapter guard) already used by the timer routes.

**Rationale**: `createdBy` (the board creator) is this codebase's existing,
sole definition of "facilitator" everywhere else (dashboard board-summary
`isCreator`, `requireFacilitator`, `RetrospectiveBoard.tsx`'s
`isFacilitatorFlag = uid === retrospective.createdBy`). Reusing it is
required by spec Assumptions ("this feature does not change who qualifies
as facilitator") and keeps this feature consistent with every other
facilitator-only capability already shipped (timer, notes, convert-to-action).

**Alternatives considered**:
- *A new `facilitatorIds` array field for multi-facilitator boards*: rejected
  — out of scope per spec Assumptions; no existing capability in the app
  supports co-facilitators today.

## 3. Setting the flag at board creation

**Decision**: Extend the existing `POST /api/boards` write path:
`CreateBoardParams`/`CreateBoardInput` gain an optional `isAnonymous?: boolean` (default `false` if omitted), threaded through
`createBoard` (use-case) → `BoardsPort.createBoard` →
`FirestoreBoardsAdapter.createBoard`'s existing atomic batch write (board +
columns + creator's participant doc). No new endpoint, no separate
follow-up write.

**Rationale**: The board, its columns, and the creator's participant record
are already written atomically in one Firestore batch (research.md note in
`FirestoreBoardsAdapter.ts`: "the board, its columns, and the creator's
participant record land together, or none do"). Adding one more field to
that same batch write preserves that atomicity guarantee for free and
avoids a second round-trip.

## 4. Legacy boards (no `isAnonymous` field)

**Decision**: Treat a missing field as `false` (not anonymous) everywhere
it is read — `toRetrospective()` (server) reads
`(data.isAnonymous as boolean) ?? false`, exactly mirroring the existing
`columnGroupingStates: (data.columnGroupingStates as ColumnGroupingStates) ?? {}`
fallback immediately above it in the same function. No backfill/migration
script is written or run.

**Rationale**: Directly resolves the `/speckit-clarify` session's first
answer (2026-08-18): existing boards must read as "not anonymous" with zero
migration cost. The `?? {}` precedent for `columnGroupingStates` already
established this exact "missing field ⇒ safe default" convention for
pre-existing documents in this same document shape.

## 5. Hiding "group by user" without losing the column's saved choice

**Decision**: The "board is anonymous" override is applied **only at
render time**, in the component that already computes what to display
(`GroupableColumn.tsx`), and is **never written back** through
`setGroupingCriteria` (which persists to Firestore via
`PATCH /api/retrospectives/:id/column-grouping`). Concretely: an
`effectiveCriteria` is derived as `isAnonymous && columnState.criteria === 'user' ? 'none' : columnState.criteria`, and that derived value — not
`columnState.criteria` directly — feeds `ColumnHeaderMenu`'s
`currentGrouping`, `processCards()`, and `GroupedCardList`'s `groupBy` prop.
The persisted `columnGroupingStates` document is untouched by the anonymity
toggle in either direction.

**Rationale**: This is the mechanism that makes FR-006 ("purely
presentational... MUST NOT change... stored data") and the second
`/speckit-clarify` answer (grouping choice restores automatically when
switched back to non-anonymous, because nothing was ever overwritten) both
true simultaneously, with no extra state to reconcile. It also means
`getGroupingOptions()` (`columnGrouping.ts`) needs one new optional
parameter (e.g. `excludeUserGrouping: boolean`) so the "group by user" menu
entry itself is omitted from the dropdown while anonymous — consistent with
FR-004 (hidden, not merely disabled).

**Alternatives considered**:
- *Writing `'none'` into `columnGroupingStates` when anonymity turns on,
  and restoring the prior value when it turns off*: rejected by the
  `/speckit-clarify` decision — it would require tracking and restoring a
  second "prior value" per column, is not "purely presentational," and
  risks losing the original choice if two toggles race.

## 6. Hiding card authorship in the view layer

**Decision**: `CardHeader.tsx` (and any other card-author read site, e.g.
export services) become conditional on the board's `isAnonymous` flag,
sourced from `useBoardData().retrospective.isAnonymous` — the same context
that already exposes `isFacilitator` and the `retrospective` object to
every board-scoped component, requiring no new prop-drilling subsystem.

**Rationale**: `BoardDataContext` (`useBoardData.ts`) is already the shared
source of board-level, cross-component state
(`isFacilitator`, `retrospective`, `participants`, `timer`, …), populated
once in `RetrospectivePage.tsx` from `useRetrospectiveRealtimeSync`'s
`board` state. `Retrospective` (`types/retrospective.ts`) gains
`isAnonymous: boolean` and `RetrospectivePage.tsx`'s existing
`board → Retrospective` mapping object literal gains one field
(`isAnonymous: board.isAnonymous`) — every consumer downstream of that
context (card rendering, the facilitator-menu toggle, the persistent
indicator, export triggers) reads the same single source of truth with no
additional data flow to design.

## 7. The persistent anonymity indicator (FR-013)

**Decision**: A small always-visible badge in `RetrospectiveTopbar.tsx`
(the board's header, already shared across the board screen regardless of
viewport, and already the home of the participant display and menu
trigger), shown for every participant (not gated by `isFacilitator`) when
`retrospective.isAnonymous` is true. Uses a redundant text label (not an
icon/color alone), per constitution Principle VIII.

**Rationale**: `RetrospectiveTopbar.tsx` is the one board-scoped surface
already rendered for every participant at every viewport size (it hosts
`ResponsiveParticipantDisplay`, the export trigger, and the facilitator
menu trigger today), making it the natural, lowest-risk location for a
persistent status cue that must be visible to everyone, confirmed by the
second `/speckit-specify` clarification answer.

## 8. Exports (FR-012)

**Decision**: `unifiedExportService.ts` and its three format-specific
services (`txtExportService.ts`, `docxExportService.ts`,
`pdfExportService.ts`) — which already receive the full `retrospective:
Retrospective` object as a parameter (confirmed in
`ImprovedExportPopover.tsx`'s props) — check `retrospective.isAnonymous`
and omit the existing per-card "Autor: …" line/field when true, exactly as
they do today when it's false.

**Rationale**: No new plumbing is needed — the object already carries
everything required once `isAnonymous` is added to the `Retrospective`
type (research.md §6). This directly resolves the `/speckit-specify`
clarification that exports must reflect the board's anonymity state at
generation time (FR-012, SC-006).

## Summary of new/changed surface area

| Layer | Change |
|---|---|
| Firestore schema | `retrospectives/{id}.isAnonymous: boolean` (new field, default `false`) |
| Backend port | `RetrospectiveDTO.isAnonymous`; `RetrospectiveBoardPort.setAnonymous()`; `CreateBoardInput.isAnonymous?` |
| Backend adapter | `FirestoreRetrospectiveBoardAdapter` (`toRetrospective`, new `setAnonymous`); `FirestoreBoardsAdapter.createBoard` |
| Backend use-case | New thin wrapper (mirrors `ConfigureTimer.ts`) calling `retrospectiveBoardPort.setAnonymous`; `CreateBoard.ts` passes `isAnonymous` through |
| Backend route | New `PUT /api/retrospectives/:id/anonymity` (facilitator-only, mirrors the timer `PUT` route); `serializeBoardState`/`GetBoardState` include `isAnonymous` |
| Realtime | **No change** — existing generic `retrospective` `entity_change` event already carries the new field |
| Frontend client | `RetrospectiveState.isAnonymous`; `parseRetrospectiveFields()`; new `setAnonymity()` REST call in `backendRetrospectiveClient.ts`; `createBoard()` payload in `backendBoardsClient.ts` |
| Frontend types | `Retrospective.isAnonymous` (`types/retrospective.ts`); `RetrospectivePage.tsx`'s state-mapping object literal |
| Frontend UI | `CreateBoardFlow.tsx` (creation toggle); `ControlsTab.tsx`/`FacilitatorMenu.tsx` (mid-session toggle, facilitator-gated); `RetrospectiveTopbar.tsx` (persistent indicator); `CardHeader.tsx` call sites (author hiding); `columnGrouping.ts` + `GroupableColumn.tsx` (hide/override "group by user") |
| Exports | `unifiedExportService.ts`, `txtExportService.ts`, `docxExportService.ts`, `pdfExportService.ts` |
| i18n | New keys in `en.json`/`es.json` for the two toggles, their descriptions, and the indicator |
