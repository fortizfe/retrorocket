# Session Soft-TTL Enforcement — Contract Addition

Amends the existing session contract (session cookie `rr_session`, verified by
`SessionServicePort.verify()`) as consumed by:

- Every REST route behind `requireSession()` (`server/src/http/routes/retrospectives.ts`,
  `boards.ts`) — this includes, but is not limited to, the board-state and board-list
  endpoints this feature's realtime flows depend on.
- The WebSocket upgrade handler (`GET /api/retrospectives/{id}/live`,
  `server/src/http/ws/realtimeUpgrade.ts`).

## Before this feature

Both call sites accept any session for which `verify()` returns non-null — i.e. any
session within its 30-day **absolute** lifetime, regardless of how long it has gone
without a silent refresh.

## After this feature

Both call sites additionally require the session to be within its 1-hour **soft** TTL
(`Session.isActive(nowSeconds)`, an existing method — no new field, no new class).

```
accept  := verify(cookie) !== null && session.isActive(now)
```

| `verify()` | `isActive()` | Outcome |
|---|---|---|
| `null` | n/a | Unchanged: `401` (REST) / `4401` (WS) |
| session | `true` | Unchanged: request/upgrade proceeds |
| session | `false` | **New**: `401` (REST) / `4401` (WS) — same response shape as an invalid session; the client's existing silent-refresh flow (`POST /api/auth/refresh`, already implemented) is what recovers this for a genuinely-present user |

## Client-observable effect

- A REST call made by a session whose soft TTL has lapsed now gets a `401` where it
  previously succeeded. Per the existing (unchanged) client session handling, a `401`
  already triggers the existing refresh-then-retry flow for a present user; for an
  abandoned tab with no user present to complete an interactive step (if the OAuth
  provider ever requires one) or whose refresh silently fails, this becomes the final
  backstop that stops it from continuing to authenticate indefinitely (US5).
- A WebSocket upgrade attempted by a soft-TTL-lapsed session now closes with `4401`
  instead of completing — which, combined with this feature's `contracts/
  realtime-connection-lifecycle-delta.md` §2, means the client does **not** auto-retry
  and instead surfaces the same terminal "sign in again" state as any other `4401`.

## Not changed

- The absolute 30-day TTL and its cryptographic enforcement in `JoseSessionAdapter`.
- The refresh endpoint's own logic (`refreshSession` already calls `canRefresh`/
  `refreshed`, unaffected).
- Cookie shape, claims, or `Max-Age` computation.
