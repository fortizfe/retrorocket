# Anonymity API Contract (FR-001, FR-002, FR-008, FR-009, FR-011)

This is the one new REST surface this feature adds, plus the additive
field changes to two existing endpoints. Everything else in
`019-retro-board-backend-access/contracts/retrospective-api.yaml` and
`realtime-protocol.md` stays authoritative and unmodified — no existing
path, method, status code, or field is removed or repurposed.

## New endpoint: `PUT /api/retrospectives/{id}/anonymity`

Facilitator-only, mirrors `PUT /api/retrospectives/{id}/timer`'s auth and
response shape exactly (FR-008/FR-011).

**Auth**: session cookie (`requireSession`) + facilitator check
(`requireFacilitator` — `uid === board.createdBy`), both at the route layer
and again inside the adapter (defense in depth, same as the timer
endpoints).

**Request**:

```jsonc
// PUT /api/retrospectives/{id}/anonymity
{
  "isAnonymous": true // boolean, required
}
```

**Responses**:

```jsonc
// 200 — the setting was applied
{
  "id": "retro_abc123",
  "isAnonymous": true
}
```

| Status | Condition |
|---|---|
| `200` | Applied; response echoes the new value |
| `401` | No valid session (`Unauthorized`, same envelope as every other route) |
| `403` | Caller is not the board's facilitator (`Forbidden`) |
| `404` | Board does not exist or is inactive (`NotFound`) |
| `400` | `isAnonymous` missing or not a boolean (`invalid_request`) |

**Idempotent**: setting the same value twice is a no-op that still returns
`200` with the unchanged value (matches `saveColumnGroupingState`'s
idempotent-write precedent).

**Propagation**: no explicit push step in this contract — writing the field
to the `retrospectives/{id}` document is sufficient. The existing Firestore
listener already forwards the full document body as an `entity_change`
(`entity: "retrospective"`) event to every connected participant on that
board (see `realtime-anonymity-contract.md`), satisfying FR-009's
"applies immediately... without a page reload" without any new realtime
work.

## Extended endpoint: `POST /api/boards` (create board)

Adds one optional field to the existing request body (see
`018-profile-backend-access`/`017-dashboard-backend-access` for the rest of
this contract, unchanged):

```jsonc
// POST /api/boards
{
  "templateId": "default",
  "title": "Sprint 42 Retro",
  "locale": "es",
  "isAnonymous": false // optional, boolean, defaults to false when omitted (FR-002)
}
```

Response shape (`{ "boardId": "..." }`) is unchanged.

## Extended endpoint: `GET /api/retrospectives/{id}` (board state)

The existing response object gains one field, alongside `columnGroupingStates`:

```jsonc
{
  "id": "retro_abc123",
  "title": "Sprint 42 Retro",
  "createdBy": "uid_...",
  "isActive": true,
  "columnGroupingStates": { /* unchanged */ },
  "isAnonymous": false // NEW
  // ...all other existing fields unchanged
}
```

No other field in this response changes shape or meaning.
