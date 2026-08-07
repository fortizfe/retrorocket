# Phase 1 Data Model: Fix Typing Indicator Flicker

This feature introduces **no new persisted entity, Firestore field, or collection**. `TypingStatus`/`TypingStatusDTO` (feature 019) is unchanged in shape. The fix changes *when* writes happen and *who decides* to make them — not what is written or where.

## Existing entity used (unchanged shape)

### TypingStatus — `typingStatus/{retroId}_{userId}_{column}` (Firestore, unchanged)

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Unchanged |
| `username` | string | Unchanged |
| `retrospectiveId` | string | Unchanged |
| `column` | string | Unchanged |
| `timestamp` | Firestore server timestamp | Unchanged field; refreshed on every `isActive:true` write, exactly as today — only the *cadence* of when the client decides to make that write changes (see below) |

`isActive:false` continues to mean "delete the doc" (never a stored field), unchanged (`FirestoreTypingStatusAdapter.setTypingStatus`, `server/src/application/ports/typing.ts`'s own docstring).

## Client-side concept (in-memory only, not persisted): per-column typing lifecycle

Not a new entity — the existing per-column state already tracked inside `useTypingStatus` (`activeTypingColumns`, `debounceTimers`, `lastUpdateTimers`), with one corrected transition and one retimed constant:

```
idle ──(keystroke, value.length > 0)──▶ typing
typing ──(keystroke within throttle window)──▶ typing            [no write; UPDATE_THROTTLE = 2000ms unchanged]
typing ──(keystroke, throttle window elapsed)──▶ typing          [refresh write: isActive:true, immediate — see below]
typing ──(3000ms with no further keystroke)──▶ idle               [explicit write: isActive:false, immediate — was 4000ms]
typing ──(submit / cancel / textarea emptied / blur / unmount)──▶ idle  [explicit write: isActive:false, immediate — unchanged]
```

**Corrected**: the `typing` state no longer has an implicit, independent 300ms "unless refreshed" exit transition owned by `OptimizedTypingStatusService` — that was the bug (research.md §1). Every transition into or out of `typing` now results in exactly one immediate backend write, decided solely by `useTypingStatus`.

## New concept (emitted, not persisted): accessible status announcement

Not a domain entity — a DOM-level `role="status"`/`aria-live="polite"` element inside `TypingPreview`, always mounted, whose text content mirrors the same `formatTypingText()` string already computed for the visible card.

| State | Live region content |
|---|---|
| No one typing in this column | `""` (empty) |
| One participant typing | `"{username} está escribiendo"` (same string as the visible card) |
| Two participants typing | `"{username1} y {username2} están escribiendo"` |
| 3+ participants typing | `"{username1} y {N} más están escribiendo"` |

No new schema, no new field — this is a rendering-layer mirror of state that already exists (the `typingIndicators` list `useTypingStatus` already derives from the live `typingStatuses` slice).

## Server-side concept (unchanged shape, retuned constants)

### Typing-status sweep (`FirestoreRealtimeGatewayAdapter`, in-memory `setInterval`, not persisted)

| Constant | Before | After | Why |
|---|---|---|---|
| `TYPING_STATUS_TTL_MS` | 5000 | 3000 | Brings the disconnect-cleanup bound in line with FR-004's 3-second target (research.md §3) |
| `TYPING_STATUS_SWEEP_INTERVAL_MS` | 1000 | 500 | Keeps worst-case sweep latency proportionate to the smaller TTL |

No new field on the `typingStatus` doc is needed for this — the sweep already compares the existing `timestamp` field against `now`.

## Explicitly unchanged

- `TypingStatusDTO`, `TypingStatusPort`, `SetTypingStatus` use case — no signature or behavior change.
- `POST /api/retrospectives/:id/typing` request/response shape — unchanged.
- WS `entity_change` event shape for `entity: 'typingStatus'` — unchanged (`created`/`updated` carry the same `data` shape; `deleted` carries only `id`, as today).
- `useRetrospectiveRealtimeSync`'s `applyTypingStatusChange` reducer and the `TypingStatusEntry` client type — unchanged.
- `TypingProvider`'s context shape (`typingIndicators`, `startTyping`, `stopTyping`, `getTypingUsersForColumn`) — unchanged.
