# Phase 1 Data Model: Backend-Mediated Firebase Access

This refactor reuses the existing Firestore schema (per research.md §3–4, with two deliberate fixes: full cascade delete, and a single canonical typing-status shape). Types below are the **backend-owned** canonical shapes; existing frontend `interface` definitions are superseded by whatever the new API client types derive from these (generated or hand-written from the contracts in `contracts/`).

## Retrospective Board

Collection: `retrospectives` (top-level). Subcollection: `columns`.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firestore doc id |
| `title` | string | required |
| `description` | string? | optional |
| `templateId` | `'default' \| 'mad-sad-glad' \| 'start-stop-continue'` | set at creation |
| `createdBy` | string (uid) | facilitator/owner; canonical field — the dead `facilitator` field is not carried forward |
| `createdByName` | string | denormalized for display without a join |
| `locale` | `'es' \| 'en'` | set at creation from the creator's locale |
| `createdAt`, `updatedAt` | timestamp | |
| `participantCount` | number | maintained by the join/leave use-cases, not client-incremented |
| `isActive` | boolean | |
| `columnGroupingStates` | map | per-column clustering UI state (research.md keeps this as-is; it is board-scoped UI state, not a new concept) |

**Column** (subcollection `retrospectives/{id}/columns/{columnId}`): `{ id, i18nKey, type: 'regular'|'action', order, defaultColor, createdAt }`.

**Lifecycle**: created → active (participants can join, cards can be added) → deleted (hard delete with full cascade, research.md §3). No soft-delete/trash state is introduced.

**Relationships**: has many Cards, Participants, Card Groups, Countdown Timer (0..1), Facilitator Notes, Action Items, Sentiment Results — all referencing it by `retrospectiveId`.

## Card

Collection: `cards` (top-level, filtered by `retrospectiveId` — matches current shape; not renested as a subcollection, since no behavior requires that change).

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `retrospectiveId` | string | |
| `content` | string | |
| `column` | string | column id |
| `createdBy` | string (uid) | only this user (or a facilitator, if that's ever desired — spec does not require it, so not added) may edit/delete, per FR-004 |
| `createdAt`, `updatedAt` | timestamp | |
| `color` | string? | |
| `likes` | `Like[]` | `{ userId, username, timestamp }` |
| `reactions` | `Reaction[]` | `{ userId, username, emoji, timestamp }` — one reaction per user enforced server-side (replace-on-write) |
| `order` | number | |
| `groupId` | string? | |
| `isGroupHead` | boolean? | |
| `groupOrder` | number? | |
| `votes` | number? | Carried through as a legacy read/write field only (no dedicated vote endpoint) since the product docs mark the up/down voting stepper deprecated in favor of likes/reactions (README) — see contracts/cards-and-groups-api.md. |

**Validation rules**: `content` non-empty; `column` must reference an existing column on the same board; edit/delete restricted to `createdBy` (FR-004); concurrent edit/delete on the same card resolved last-write-wins (FR-014).

## Card Group

Collection: `groups` (top-level).

| Field | Type | Notes |
|---|---|---|
| `id`, `retrospectiveId`, `column` | string | |
| `headCardId` | string | |
| `memberCardIds` | string[] | |
| `title` | string? | |
| `isCollapsed` | boolean | |
| `createdAt`, `createdBy`, `order` | | |

`totalVotes`/`totalLikes`/`allReactions` remain **derived, not stored** — computed by the backend at read time (or by the frontend from the card list it already has via SSE) exactly as today; no new persisted field.

**State transitions**: create (head + members) → add/remove member → head removed (promote next member, or disband if empty) → disband (explicit) or cascade-deleted with the board.

## Participant

Collection: `participants` (top-level).

| Field | Type | Notes |
|---|---|---|
| `id`, `userId`, `retrospectiveId` | string | |
| `name` | string | |
| `photoURL` | string? \| null | |
| `joinedAt` | timestamp | |
| `isFacilitator` | boolean | **new, explicit** — derived from `retrospective.createdBy === userId` at read/join time, replacing the current pattern of every consumer re-deriving facilitator status ad hoc |

**Change from today**: the vestigial `isActive` field (research.md finding — written and filtered on inconsistently) is replaced by presence derived from SSE connection lifecycle: a participant is "active" while it has at least one open `GET /api/boards/:id/events` connection, "inactive" a short grace period after its last connection closes. Participant *documents* themselves remain permanent (matching the existing code comment that participants, once joined, are not supposed to disappear) — only the *presence indicator* shown in the UI (today's "active vs. total" count) is connection-derived rather than a manually-toggled Firestore field. This preserves the observable behavior (README: "live connection state — active vs. total") without carrying forward an inconsistently-maintained field.

## Countdown Timer

Collection: `countdown_timers` (top-level, doc id == `retrospectiveId`).

| Field | Type | Notes |
|---|---|---|
| `id`, `retrospectiveId` | string | |
| `duration`, `originalDuration` | number (seconds) | |
| `startTime`, `endTime` | timestamp \| null | |
| `isRunning`, `isPaused` | boolean | |
| `createdBy` | string (uid) | must equal the board's `createdBy` (facilitator) — FR-004; enforced server-side, replacing the currently-dead-code Firestore rule (research.md §2) |
| `createdAt`, `updatedAt` | timestamp | |

**State transitions**: none → created (paused, full duration) → running → paused ⇄ running → finished (naturally, when `endTime` elapses) → reset (back to `originalDuration`, paused) → deleted. Only the facilitator may create/start/pause/reset/delete (FR-004); all participants may read.

## Facilitator Note

Collection: `facilitatorNotes` (top-level).

| Field | Type | Notes |
|---|---|---|
| `id`, `retrospectiveId`, `facilitatorId` | string | |
| `content` | string | |
| `createdAt`, `updatedAt` | timestamp | (today's type omits these but the service writes them — now made canonical) |

**Validation**: `facilitatorId` must equal the requesting user's uid AND the board's `createdBy` — read/write restricted to that one user (FR-004). This is the collection where research.md §2's "dead Firestore rule" finding matters most: today any authenticated user can technically read another facilitator's private notes directly via the client SDK; the backend closes this for real.

## Action Item

Collection: `actionItems` (top-level).

| Field | Type | Notes |
|---|---|---|
| `id`, `retrospectiveId` | string | |
| `content` | string | |
| `createdBy` | string (uid) | must be the board's facilitator to create/update/delete (FR-004); all participants may read |
| `createdAt`, `updatedAt` | timestamp | |
| `assignedTo`, `assignedToName` | string \| null | |
| `dueDate` | timestamp \| null | |
| `order` | number? | |

## Sentiment Result

Collection: `sentimentResults` (top-level, deterministic doc id `${retrospectiveId}_${cardId}`).

| Field | Type | Notes |
|---|---|---|
| `retrospectiveId`, `cardId` | string | |
| `sentiment` | `'positive' \| 'negative' \| 'neutral'` | |
| `confidence` | number | |
| `modelId`, `modelVersion`, `contentHash` | string? | used to detect stale results when card content changes (unchanged behavior) |
| `isOverride` | boolean | |
| `overrideBy` | string \| null | facilitator uid, when `isOverride` |
| `timestamp` (`analyzedAt` server-side) | timestamp | |

**Note**: the on-device inference that *produces* `sentiment`/`confidence` remains entirely client-side and unaffected (FR-007) — only this persistence layer moves behind the backend.

## Typing Status (ephemeral)

Collection: `typingStatus` (top-level, doc id `${retrospectiveId}_${userId}_${column}`).

| Field | Type | Notes |
|---|---|---|
| `userId`, `username`, `retrospectiveId`, `column` | string | |
| `timestamp` | timestamp | refreshed on every keystroke-debounced call |
| `isActive` | boolean | |

**Canonical single implementation** (research.md §4): one `POST /api/boards/:id/typing` endpoint, 300ms client-side debounce before calling it, server-side TTL (short, e.g. a few seconds) rather than a hardcoded per-column cleanup list — generalizes correctly to any board template's columns, unlike today's `typingStatusService.ts`.

## User Profile / Identity

Collection: `users` (top-level, doc id == uid). Unchanged shape; ownership of writes moves entirely server-side (research.md §6) — the frontend never writes this collection at all anymore (previously it did, via `userService.createUserProfile`/`updateUserProfile`/`addProviderToUser`).

| Field | Type |
|---|---|
| `uid`, `email`, `displayName` | string |
| `photoURL` | string \| null |
| `providers` | `('google'\|'github')[]` |
| `primaryProvider` | `'google'\|'github'` |
| `joinedBoards` | string[] |
| `createdAt`, `updatedAt` | timestamp |

## User Board History

Collection: `userBoardHistory` (top-level). Unchanged shape; writes move server-side, triggered automatically by the board-open/join use-cases rather than a separate client-triggered call.

| Field | Type |
|---|---|
| `id`, `userId`, `boardId`, `boardTitle` | string |
| `lastAccessed` | timestamp |
| `accessCount` | number |

## Cross-cutting rules carried into contracts

- **Authorization** (FR-004): board-scoped reads/writes require the requester to be a participant (or the creator) of that board; facilitator-only writes (countdown control, notes, action items) additionally require `uid == retrospective.createdBy`; facilitator note reads are restricted the same way.
- **Conflict resolution** (FR-014): last-write-wins on any single document; enforced naturally by using ordinary Firestore document writes server-side (no optimistic-concurrency layer is introduced — matches today's behavior exactly, just executed server-side instead of client-side).
- **Cascade delete** (research.md §3): `DELETE /api/boards/:id` removes the board doc, its `columns` subcollection, and every `cards`/`groups`/`participants`/`countdown_timers`/`facilitatorNotes`/`actionItems`/`sentimentResults`/`typingStatus` document referencing that `retrospectiveId` — a completeness fix over every current implementation.
