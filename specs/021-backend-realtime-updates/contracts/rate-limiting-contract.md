# Rate-Limiting Contract (FR-001…FR-004, FR-010)

This is the one client-observable behavior contract this feature changes. It applies to every
router that already mounts a limiter: `auth.ts`, `boards.ts`, `profile.ts`, `retrospectives.ts`,
`mcp.ts`. No REST endpoint paths, methods, or success-response shapes change — see
`019-retro-board-backend-access/contracts/retrospective-api.yaml` and `realtime-protocol.md`, both
still fully authoritative and unmodified by this feature (research.md §5, data-model.md).

## Request identity resolution

For every request to a rate-limited router:

1. If a valid `rr_session` httpOnly cookie is present and verifies (the same session check
   `requireSession()` already performs), the limiter key is the session's user id.
2. Otherwise, the limiter key is the request's client IP, resolved via Express's `trust proxy`
   setting configured for Vercel's proxy chain (`app.ts`) — **not** the raw, proxy-hop
   `req.socket.remoteAddress` used today (research.md §1).

This means two different signed-in users — even sharing one office network/IP — are always
throttled independently (FR-002), while pre-session requests (e.g. beginning the OAuth login
redirect) still get real per-client isolation via the corrected IP resolution, instead of today's
single shared bucket.

## Response on legitimate throttling (FR-004)

```jsonc
// HTTP 429
{
  "error": {
    "code": "rate_limited",
    "message": "Too many requests — please wait a moment and try again."
  },
  "correlationId": "<existing correlation id, same as every other error response>"
}
```

Reuses the app's existing `ApiErrorBody` envelope (`server/src/http/middleware/errorHandler.ts`)
instead of `express-rate-limit`'s own default response shape, so every client-side error handler
already written against this envelope (per `017`/`018`/`019`'s established pattern) handles this
case with no special-casing.

Standard rate-limit headers (`RateLimit-*`, `draft-7` — already enabled via `standardHeaders:
'draft-7'` on every existing limiter) continue to be sent unchanged, so any future client-side
"you're approaching the limit" affordance remains possible without a further contract change.

## What does NOT change

- No new route, no new HTTP method, no new WebSocket message type.
- No change to `windowMs`/`limit` *shape* — only their configured values (resized for a
  10-participant team, research.md §1) and the key-generation strategy above.
- `express-rate-limit`'s ability to reject a genuinely excessive single source is unaffected
  (FR-003) — this contract only fixes *identity attribution*, not the underlying threshold logic.
- The WebSocket upgrade endpoint's own separate concurrent-connection cap (per `019`'s
  research.md §5, "capping concurrent open connections per session") is unaffected; it was already
  session-scoped, not IP-scoped, and was never the source of the reported false positives.
