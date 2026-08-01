# Contract: Display Name Resolution & Rename Fan-Out

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

This feature adds no new public HTTP endpoint and no new WebSocket event type. Its "contract" is (a) a behavioral addition to an existing endpoint, (b) the shared resolver function every display surface must call, and (c) the (unchanged) wire event that now carries a new kind of update.

## 1. `PATCH /api/profile` — unchanged request/response, new side effect

**Request/response bodies are unchanged** from the existing 018 contract:

```
PATCH /api/profile
Body:     { "displayName": string }
Response: 200 { uid, email, displayName, photoURL, providers, primaryProvider, createdAt, updatedAt }
```

**New side effect** (not visible in the response body): before returning, the handler now also updates `name` on every `participants` document belonging to the caller (`userId == session.sub`), across every retrospective they have ever joined. This is synchronous — the HTTP response is not sent until the fan-out write completes — so a client that reloads immediately after a successful `200` is guaranteed to see the new name reflected in every board's `participants` collection.

**Error behavior**: unchanged (`400 invalid_request` for an empty/blank `displayName`; `401` for no/invalid session). The fan-out itself has no independent failure mode surfaced to the caller — it either commits as part of the same request or the whole request fails (batched Firestore writes; see data-model.md's `ParticipantPort.renameParticipantsForUser`).

## 2. `resolveDisplayName(userId, capturedName, participants, fallbackLabel): string`

The single function every display surface (card author label, group-by-user header, like tooltip, reaction tooltip, and all three export formats) MUST call to render a user's name. Defined once in `src/lib/utils/cardHelpers.ts`, generalized from the existing `resolveAuthorDisplayName`.

**Contract**:
- MUST NOT ever return a raw internal user id.
- MUST prefer a live match in `participants` (by `userId`) over `capturedName`, whenever both are available (FR-001, FR-001a).
- MUST fall back to `capturedName` only when no `participants` match exists.
- MUST fall back to `fallbackLabel` (an already-resolved, i18n-sourced string — callers pass `t('retrospective.grouping.unknownAuthor')`) only when neither of the above is available.
- MUST NOT merge or conflate two different `userId`s, even if their resolved names are identical (FR-006) — callers key any grouping/uniqueness logic off `userId`, never off the resolved string.
- Is a pure function: same inputs → same output, no I/O, no new async data-fetch introduced on any render path (research.md's performance stance — the `participants` array is already loaded by every caller today).

Every existing and new call site (data-model.md's call-site table) passes through this one function — no surface may implement its own resolution logic.

## 3. Realtime wire event — unchanged shape, newly-used semantics

No change to `server/src/application/ports/realtime.ts`'s `RealtimeEvent`/`EntityChangeEvent` shape or to `019`'s `contracts/realtime-protocol.md`. What's new is purely behavioral: a `{ type: 'entity_change', entity: 'participant', op: 'updated', id, data }` event, which the protocol already defined but which previously had no producer (nothing ever updated an existing `participants` doc after join), now fires whenever `renameParticipantsForUser` runs. Consumers (`useRetrospectiveRealtimeSync.ts`'s `applyEntityChange`) require no change — the existing generic `upsertById(state.participants, event.id, participant, event.op)` handling already applies.
