# Realtime Propagation Contract (FR-009, FR-010)

This is the one client-observable realtime behavior this feature adds. It
extends `019-retro-board-backend-access/contracts/realtime-protocol.md`,
which stays authoritative for every other event type, connection-lifecycle
detail, and reconnect/resync rule — unmodified by this feature.

## What does NOT change

- No new `RealtimeEntity` value, no new WebSocket message `type`.
- No new subscription/registration step for clients.
- The existing `entity_change` event for `entity: "retrospective"` already
  forwards the board document's full current body on every write to
  `retrospectives/{id}` (`FirestoreRealtimeGatewayAdapter.ts`,
  `startFirestoreBoardListeners`) — the same path `columnGroupingStates`
  changes already ride.

## What's added

`isAnonymous` simply appears as one more field inside the existing
`retrospective` `entity_change` payload once it's part of the Firestore
document (data-model.md):

```jsonc
// WS message, unchanged envelope
{
  "type": "entity_change",
  "entity": "retrospective",
  "op": "updated",
  "id": "retro_abc123",
  "data": {
    // ...all existing fields (title, isActive, columnGroupingStates, ...)
    "isAnonymous": true // NEW
  }
}
```

**Client contract**: `parseRetrospectiveFields()`
(`useRetrospectiveRealtimeSync.ts`) — the frontend's explicit allowlist of
which raw fields get merged from a `retrospective` event into local board
state — must include `isAnonymous`, the same way it already includes
`columnGroupingStates`. Every already-connected participant's `board.isAnonymous` updates the moment this event arrives, with no reload and no
reconnect (FR-009), because it flows through the same reducer
(`applyEntityChange`) every other board-level field already uses.

## Column-grouping display override (FR-010)

Not a realtime-protocol change — an explicit non-contract: the
"group by user" → "no grouping" fallback while a board is anonymous is a
pure client-side render decision (derived from `board.isAnonymous` +
the already-synced `columnGroupingStates`), and produces **no** additional
`PATCH /api/retrospectives/:id/column-grouping` call and **no** additional
realtime event. See `data-model.md`'s State Transitions and
`research.md` §5 for the full rationale.
