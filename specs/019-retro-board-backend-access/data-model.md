# Phase 1 Data Model: Retrospective Board Backend-Mediated Access

All entities below already exist as Firestore documents (schemas unchanged by this feature — FR-021 requires zero data loss/migration). This document defines the **backend DTOs** the new ports/adapters expose, reconciling a few gaps found between the existing Firestore documents and their current TypeScript types (noted inline). Field shapes are taken directly from the existing frontend services being retired (`research.md`'s codebase inventory), not reinvented.

## Retrospective Board (`retrospectives/{id}`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firestore doc id |
| `title` | string | |
| `description` | string? | |
| `templateId` | string? | |
| `createdBy` | string (uid) | Also the **facilitator** — `research.md` §11 |
| `createdByName` | string? | write-only convenience field, not in the current `Retrospective` TS type |
| `createdAt` / `updatedAt` | Timestamp | |
| `participantCount` | number | maintained via atomic `increment`/`decrement` |
| `isActive` | boolean | |
| `columnGroupingStates` | `{ [columnId]: { criteria: 'none'\|'user'\|'suggestions'; activeGroups: string[] } }` | **Gap**: persisted today but absent from the `Retrospective` TS interface — the new `RetrospectiveDTO` declares it explicitly |

**Response shape** (`GET /api/retrospectives/:id`): the board document above, plus **embedded** `columns`, `cards`, `groups`, `actionItems`, `participants`, `timer`, `myFacilitatorNotes` (only if caller is facilitator), `sentimentResults` — i.e., one response assembling everything the screen needs on load (FR-004), instead of N separate requests.

## Column (`retrospectives/{id}/columns/{columnId}`, subcollection)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `i18nKey` | string | |
| `type` | `'regular' \| 'action'` | |
| `order` | number | |
| `defaultColor` | string | |

Read-only for this feature (no create/update/delete API — matches today's app, where columns are seeded by template, not mutated from the board screen).

## Card (`cards/{id}`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `content` | string | |
| `column` | string | column id |
| `createdBy` | string (uid) | card owner, for FR-007/FR-020 ownership checks |
| `createdAt` / `updatedAt` | Timestamp | |
| `retrospectiveId` | string | |
| `color` | string? | one of the pastel enum values |
| `votes` | number | now written via atomic `FieldValue.increment()` server-side (research.md §7), not read-then-write |
| `likes` | `Like[]` where `Like = { userId, username, timestamp }` | full denormalized objects, via `arrayUnion`/`arrayRemove` |
| `reactions` | `Reaction[]` where `Reaction = { userId, username, emoji, timestamp }` | one reaction per user; add-or-update removes any prior reaction from that user first |
| `order` | number | |
| `groupId` / `isGroupHead` / `groupOrder` | string?/boolean?/number? | set by group membership operations |

## Card Group (`groups/{id}`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `retrospectiveId` | string | |
| `column` | string | |
| `headCardId` | string | |
| `memberCardIds` | string[] | |
| `title` | string? | omitted entirely if not provided (never written as `undefined`) |
| `isCollapsed` | boolean | |
| `createdAt` | Timestamp | |
| `createdBy` | string | |
| `order` | number | |

Creating/disbanding/adding/removing a group member also updates the affected cards' `groupId`/`isGroupHead`/`groupOrder` fields in the same atomic write (Firestore `WriteBatch`, per the existing client logic — preserved server-side).

## Action Item (`actionItems/{id}`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `content` | string | |
| `retrospectiveId` | string | |
| `createdBy` | string (uid) | facilitatorId |
| `createdAt` / `updatedAt` | Timestamp | |
| `assignedTo` / `assignedToName` | string \| null | |
| `dueDate` | Timestamp \| null | |
| `order` | number | |

No completion/status field exists today (confirmed absent) — out of scope to add one; this feature preserves the existing shape exactly.

## Countdown Timer (`countdown_timers/{retrospectiveId}`, one doc per board)

| Field | Type | Notes |
|---|---|---|
| `retrospectiveId` | string | also the doc id |
| `startTime` | Timestamp \| null | |
| `duration` | number (seconds) | current/remaining, mutates on pause |
| `originalDuration` | number (seconds) | immutable initial config |
| `isRunning` / `isPaused` | boolean | |
| `endTime` | Timestamp \| null | |
| `createdBy` / `createdAt` / `updatedAt` | string / Timestamp | |

Control restricted to the facilitator (FR-012).

## Facilitator Note (`facilitatorNotes/{id}`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `content` | string | |
| `timestamp` | Timestamp | |
| `retrospectiveId` | string | |
| `facilitatorId` | string | scoping key — a query/response MUST always filter by `facilitatorId == session.sub`, never returning another facilitator's notes (FR-013) |

## Sentiment Result (`sentimentResults/{retrospectiveId}_{cardId}`, deterministic id)

| Field | Type | Notes |
|---|---|---|
| `retrospectiveId` / `cardId` | string | compose the doc id |
| `sentiment` | `'positive' \| 'negative' \| 'neutral'` | |
| `confidence` | number | |
| `modelId` / `modelVersion` | string | `modelVersion` is the cache-invalidation field |
| `contentHash` | string | hash of card text, for staleness detection |
| `isOverride` | boolean | |
| `overrideBy` | string \| null | facilitatorId if overridden |
| `analyzedAt` | Timestamp | server-set |

Computed-result saves and facilitator overrides are two distinct write paths with different authorization (any participant vs. facilitator-only) but the same document.

## Typing-Status Signal (`typingStatus/{retrospectiveId}_{userId}_{column}`, deterministic id, short-lived)

| Field | Type | Notes |
|---|---|---|
| `id` | string | same as doc id |
| `userId` / `username` | string | |
| `retrospectiveId` / `column` | string | |
| `timestamp` | Timestamp | server-set |
| `isActive` | true (doc deleted, not set false, when inactive) | |

Server-side debounce/TTL constants preserved exactly: **300ms** debounce before an inactivity delete, **5000ms** hard TTL enforced independently by the relay/read path (research.md, matching `OptimizedTypingStatusService`'s exact constants).

## Participant (`participants/{id}`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `userId` | string | |
| `retrospectiveId` | string | |
| `joinedAt` | Timestamp | |
| `photoURL` | string \| null? | |
| `isActive` | boolean | **Gap**: persisted today but absent from the `Participant` TS type — the new `ParticipantDTO` declares it explicitly. Join is idempotent (no duplicate record per FR-005); this feature preserves the existing "permanent membership" semantics (spec Assumptions) — `isActive` continues to exist in the schema but this feature does not add any new UI/behavior around it beyond what already exists. |

## User Session

Not a Firestore entity — the existing `rr_session` cookie / `SessionServicePort`, reused unchanged (FR-003). Identifies the caller (`session.sub`) for every operation and every WebSocket connection (research.md §4).

## Realtime Event (wire-only, not persisted)

```ts
interface RealtimeEvent {
  type: 'entity_change';
  entity: 'card' | 'group' | 'actionItem' | 'timer' | 'typingStatus' | 'participant' | 'retrospective' | 'facilitatorNote';
  op: 'created' | 'updated' | 'deleted';
  id: string;
  data?: Record<string, unknown>; // full current entity; omitted when op === 'deleted'
}
```

See `research.md` §3 and `contracts/realtime-protocol.md` for the full protocol.
