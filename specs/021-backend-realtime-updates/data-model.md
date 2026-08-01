# Phase 1 Data Model: Reliable Backend-Mediated Access for Concurrent Retrospective Teams

This feature adds **no new Firestore collections and no new document schema**. Every field it
relies on already exists in the current board-state and participant payloads (research.md §2, §3).
The entities below are the conceptual entities from `spec.md`'s Key Entities section, mapped to
their concrete, already-existing representation in the codebase, plus the one genuinely new
configuration shape this feature introduces (the shared rate-limit key strategy).

## Participant Session

Represented by the existing `ParticipantDTO` (`server/src/application/ports/retrospective.ts`) and
its REST serialization (`serializeParticipant` in `retrospectives.ts`), unchanged by this feature:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Existing |
| `name` | string | Existing — display name at join time |
| `userId` | string | Existing |
| `retrospectiveId` | string | Existing |
| `joinedAt` | ISO datetime string | Existing |
| `photoURL` | string \| null | Existing — **already sufficient** for the participant-avatar use case that `UserProfileCache.ts` was redundantly re-fetching directly from Firestore (research.md §3); no field is added |

The "standing connection used to deliver live updates" part of this conceptual entity is the
existing WebSocket connection (`GET /api/retrospectives/:id/live`, `019`'s `realtime-protocol.md`),
unchanged by this feature (research.md §5).

## Live Update

Unchanged: the existing `entity_change` WebSocket event envelope documented in `019`'s
`contracts/realtime-protocol.md` (`entity`, `op`, `id`, `data`). This feature adds no new `entity`
value — `columns` is folded into the already-transmitted `entity: "retrospective"` board-state
payload (`RetrospectiveState.columns`) rather than becoming a new event type (research.md §2), since
columns are static after board creation and a live-diff event type for them would have no
meaningful `created`/`updated`/`deleted` semantics beyond the one-time snapshot already delivered.

## Usage Throttling Policy

The one genuinely new (though not persisted — it is process configuration, not stored data) shape
this feature introduces: the key-resolution strategy shared by every rate limiter
(`server/src/http/middleware/rateLimiting.ts`, replacing five near-identical inline configs).

| Field | Type | Notes |
|---|---|---|
| `windowMs` | number | Existing per-router value, resized per research.md §1 for 10-participant-team steady state + reconnect churn |
| `limit` | number | Existing per-router value, resized per research.md §1 |
| `keyStrategy` | `'session'` \| `'ip'` | **New.** `'session'` when an `rr_session` cookie is present and verifiable (keys on the session's user id — FR-002); falls back to `'ip'`, resolved via Express's `trust proxy`-aware `req.ip` (research.md §1), only for the small set of routes that necessarily precede a session (e.g. `/api/auth/login/:provider`) |

This is process-level middleware configuration, not a domain entity — it has no Firestore
representation and is not part of any API response body. It is documented here because
`spec.md`'s Key Entities section named it explicitly and because `tasks.md`/implementation needs a
single, unambiguous shape to implement against rather than five independent inline decisions.

## Rate-Limited Response (data shape, not a new entity)

When a request is legitimately throttled (spec FR-004), the response body reuses the existing,
already-established API error envelope (`server/src/http/middleware/errorHandler.ts`'s
`ApiErrorBody`) rather than `express-rate-limit`'s own default plain-text/JSON shape — see
`contracts/rate-limiting-contract.md` for the exact fields.
