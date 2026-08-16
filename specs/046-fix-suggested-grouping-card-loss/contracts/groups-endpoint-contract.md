# Contract: `POST /api/retrospectives/:id/groups`

Owning system-of-record contract: `specs/019-retro-board-backend-access/contracts/retrospective-api.yaml` (`/retrospectives/{id}/groups`, `#/components/schemas/CardGroup`). This document records what this feature changes about that endpoint's *behavior*; it does not redefine the schema.

## Finding: the implementation already drifted from its own documented contract

The OpenAPI contract for this endpoint's request body is, and remains:

```yaml
requestBody:
  schema:
    type: object
    required: [headCardId, memberCardIds]
    properties:
      headCardId: { type: string }
      memberCardIds: { type: array, items: { type: string } }
      title: { type: string }
```

`column` was never part of the documented request body. The current server implementation (`server/src/http/routes/retrospectives.ts`) nonetheless reads an undocumented `column` field from the request body (defaulting to `''` when absent), and the client never sent one — producing the bug this feature fixes. **This feature brings the implementation back in line with its own pre-existing contract**, it does not change the contract.

## Request (unchanged schema, behavior corrected)

- `headCardId` (string, required)
- `memberCardIds` (string[], required)
- `title` (string, optional)
- `column`: **removed from what the client sends and from what the server reads.** The server no longer looks at any client-supplied `column` value.

## Server behavior (new)

1. Look up `headCardId` via `CardPort.getCard(headCardId)`.
2. If not found → throw `NotFoundError` → HTTP 404 (existing `errorHandler` middleware mapping, matching the convention already used by `removeCardFromGroup`/`disbandGroup` in the same use-case file).
3. If found → set the new group's `column` to the head card's `column`. This is the only source of the persisted `column` value.

## Response (schema unchanged)

`201` with the created `CardGroup` (per `#/components/schemas/CardGroup` in the owning contract) — `column` in the response is now always guaranteed to equal the head card's `column`, which was already implied but not previously enforced.

## Error responses (schema unchanged, one new trigger)

- `401 Unauthorized` — unchanged (no session).
- `404 Not Found` — **new for this endpoint**: `headCardId` does not correspond to an existing card. (Not previously validated at all; a request with a bogus `headCardId` would have written a group referencing a nonexistent card.)

## Contract: `GET /api/retrospectives/:id` (board state)

No schema change (`RetrospectiveStateResult.groups` remains `CardGroup[]` per the existing contract). Behavior change: every `CardGroup` returned in `groups` is now guaranteed to have `column` equal to its `headCardId` card's actual `column`, even for groups created before this fix shipped (self-healed and persisted on this same read — see `data-model.md` and `research.md` §2).

## Non-contract change: internal port addition

`CardGroupPort.repairGroupColumn(groupId: string, column: string): Promise<void>` is an internal addition to the backend's hexagonal port, not an HTTP-exposed capability, and is therefore out of scope for the OpenAPI contract.
