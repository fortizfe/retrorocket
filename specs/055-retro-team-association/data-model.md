# Phase 1 Data Model: Retrospective-Team Association

Derived from spec.md's Key Entities section and Functional Requirements, and from research.md's
decisions. This feature adds **one optional field** to an existing entity; it introduces no new
Firestore collection and no new entity.

## Retrospective (Board)

Firestore collection: `retrospectives` (unchanged). Existing document, one new field.

| Field | Type | Notes |
|---|---|---|
| `teamId` | string \| null | **New.** References `teams/{teamId}` (054's `Team` entity). `null` (or absent, for boards created before this feature) means no team association — behaves exactly as today (FR-006). Set once, at creation (`CreateBoard`); never updated by this feature (research.md item 6). |

All other fields (`title`, `description`, `templateId`, `createdBy`, `createdByName`, `createdAt`,
`updatedAt`, `isActive`, `participantCount`, `isAnonymous`, `locale`) are unchanged by this feature.

**Validation rules**:
- `teamId`, when provided at creation, MUST reference a team the requesting user (`createdBy`) is
  currently a member of (owner or regular member) — enforced by `CreateBoard` via
  `TeamsPort.getMembership(teamId, createdBy)` before the board doc is written (FR-004). A `teamId`
  that fails this check is rejected outright (`403 forbidden`); the board is not created in a
  partial/unlinked state as a fallback.
- `teamId` is never validated against the *joining* user in any way — `joinBoard` is completely
  unaware of `teamId` (FR-005: joining continues to depend solely on the existing link/ID + active
  rule).

**Lifecycle**:
- Set once by `createBoard` (FR-001, FR-002, FR-003): either a validated `teamId` or `null`.
- Persists unchanged for the retrospective's lifetime, including if the creator later leaves that
  team or the team becomes ownerless (FR-013 of spec.md; 054's own FR-014 "ownerless team" state) —
  `teamId` is a point-in-time reference, not a live membership check re-evaluated on every read.
- Not touched by `renameBoard` or `deleteBoard` (both continue to operate exactly as today).

## Team (054, reused as-is)

No changes. `teams/{teamId}` documents (`id`, `name`, `description`, `ownerId`, `createdBy`,
`createdAt`, `updatedAt`) are read by this feature in two ways, both read-only:

1. **Authorization** (creation time): `TeamsPort.getMembership(teamId, uid)` against
   `teamMemberships` — existing 054 method, unchanged.
2. **Display** (dashboard list time): a batched-by-id read of `teams` docs, to resolve
   `teamId → name` for every distinct non-null `teamId` among a user's listed boards
   (research.md item 1) — new call site, existing collection, no schema change.

## Relationships

- `Retrospective *── 1 Team` (optional): each retrospective references at most one team; a team may
  be referenced by any number of retrospectives (no new join collection needed — a direct
  foreign-key-style field is sufficient, matching how `Retrospective.createdBy` already references a
  `uid` directly rather than through a join collection).
- No relationship is introduced between `Retrospective.teamId` and `participants` — a participant
  joining a team-linked retrospective does **not** gain, need, or record any team membership as a
  side effect (FR-005).

## Derived read shapes (API-facing, not stored)

- **BoardSummary** (`GET /api/boards`, and the response of `POST .../join`, `PATCH`, etc. where
  applicable): gains two fields —
  - `teamId: string | null` — the raw reference, always present (mirrors the stored field).
  - `teamName: string | null` — resolved display name, **only ever populated by the
    `listBoardsForUser` path** (dashboard); other `BoardSummary`-returning calls (`getBoard`,
    `joinBoard`, etc.) leave it `null` even when `teamId` is set, since no UI surface outside the
    dashboard is permitted to display it (FR-011, research.md item 4). This asymmetry is
    intentional and mirrors the existing `isCreator` field's dependency on which method computed
    the summary (`getBoard` already documents that its own `isCreator` is meaningless without a
    requester uid).
