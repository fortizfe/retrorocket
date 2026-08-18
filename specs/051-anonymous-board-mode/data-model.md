# Data Model: Anonymous Board Mode

This feature adds exactly one new field, carried through the existing
retrospective/board data shape at every layer. No new entity, collection,
or relationship is introduced. Per FR-006, no existing field's meaning or
value changes — `isAnonymous` is additive-only.

## Field addition: `isAnonymous`

| Layer | Type | Location |
|---|---|---|
| Firestore document | `boolean` | `retrospectives/{id}.isAnonymous` |
| Backend DTO | `boolean` | `RetrospectiveDTO.isAnonymous` (`server/src/application/ports/retrospective.ts`) |
| Backend create input | `boolean \| undefined` | `CreateBoardInput.isAnonymous` (`server/src/application/ports/boards.ts`) — optional on input, always persisted as a concrete `boolean` |
| Frontend realtime state | `boolean` | `RetrospectiveState.isAnonymous` (`src/features/boards/retrospective/services/backendRetrospectiveClient.ts`) |
| Frontend domain type | `boolean` | `Retrospective.isAnonymous` (`src/features/boards/types/retrospective.ts`) |

**Default**: `false` ("not anonymous") in every layer — set explicitly at
creation when omitted, and read back as `false` via a nullish-coalescing
fallback (`data.isAnonymous ?? false`) for any board written before this
field existed (spec Clarification, 2026-08-18).

**Validation rules**: A plain boolean; no format, range, or uniqueness
constraint. The only rule that matters is *who* may change it after
creation (see State Transitions).

## Entity: Board / Retrospective

Extends the existing retrospective board entity (already modeled by
`RetrospectiveDTO` / `RetrospectiveState` / `Retrospective` across the three
layers above) with one attribute:

- **`isAnonymous`** (boolean, default `false`): governs, at the view layer
  only, whether card-author labels and the "group by user" grouping option
  are rendered for this board. Does not alter, gate, or recompute any other
  field or relationship on this entity (title, `createdBy`, `columns`,
  `columnGroupingStates`, `participantCount`, `isActive`, etc.), nor any
  related entity (cards, groups, participants, timer, notes).

No change to the entity's identity, lifecycle (`isActive` semantics), or
its relationship to `Card`, `Participant`, `CountdownTimer`, or
`FacilitatorNote`.

## Entity: Card

**No schema change.** A card's `createdBy` / `createdByName` fields
continue to be stored and transmitted exactly as before (FR-006/FR-007).
Only the *rendering* of the existing `createdByName` value in the UI (card
header) and in generated exports becomes conditional on the parent board's
`isAnonymous` value — this is a presentation-layer decision made by the
component/service consuming the card, not a data-model change to `Card`
itself.

## Entity: Column grouping state (`columnGroupingStates`)

**No schema change.** `ColumnGroupingStates` (`{ [columnId]: { criteria,
activeGroups } }`) keeps its existing shape and persistence path
(`PATCH /api/retrospectives/:id/column-grouping`). Per research.md §5, the
anonymity setting never writes to this structure; it only affects what a
column *renders* when `criteria === 'user'` and the board is anonymous
(falls back to displaying as `'none'` without altering the stored
`criteria` value).

## State Transitions

```
                    create board
                         │
                         ▼
              ┌──────────────────────┐
              │  isAnonymous: false  │◄─────────────┐
              │   (default)          │               │
              └──────────┬───────────┘               │
                         │                            │
     facilitator toggles │                            │ facilitator toggles
     anonymity ON        │                            │ anonymity OFF
                         ▼                            │
              ┌──────────────────────┐                │
              │  isAnonymous: true   │────────────────┘
              └──────────────────────┘

  (a board may also be created directly with isAnonymous: true,
   skipping the default state)
```

- **Entry points**: set once at creation (`isAnonymous: <chosen value>`,
  default `false`); may be flipped any number of times afterward.
- **Who may transition it post-creation**: only the board's facilitator
  (`uid === createdBy`), enforced both at the route layer
  (`requireFacilitator`) and the adapter layer (defense in depth, mirroring
  the existing countdown-timer methods) — FR-008/FR-011.
- **Side effects of a transition**: none beyond the view layer (no card,
  vote, like, group, or participant data is touched — FR-006/FR-007). The
  one view-layer consequence worth naming explicitly: switching **to**
  anonymous makes any column currently rendered "grouped by user" display
  as ungrouped for as long as the board stays anonymous (FR-010); switching
  back **off** anonymous makes that same column display "grouped by user"
  again automatically, because its persisted `criteria` was never changed
  (research.md §5).
- **No terminal state**: the flag can toggle indefinitely for the life of
  the board; there is no "locked" or "final" anonymity state.

## Non-goals (explicitly out of this data model)

- No per-card or per-column anonymity — the flag is board-wide only (spec
  Assumptions).
- No audit log/history of anonymity changes — only the current value is
  modeled and stored.
- No new participant-facing role (e.g. "co-facilitator") — permission to
  transition `isAnonymous` reuses the existing `createdBy`-based facilitator
  check unchanged.
