# Phase 0 Research: Fix MCP Connection Status Reporting and Reconnection Flow

No items in Technical Context were left as `NEEDS CLARIFICATION` — the spec's `/speckit-clarify` session already resolved the two scope-impacting decisions (distinct terminal status vs. query-only fix; timeout vs. explicit-signal trigger). What follows is the code-level investigation needed to turn those decisions into a concrete plan, plus the honest state of the FR-004 root-cause question.

## 1. Root cause of "failed connections show as successful" (User Story 1)

**Decision**: The defect is in `ListConnections.ts` (`server/src/application/use-cases/mcp/ListConnections.ts:16-25`): it filters out only `c.data.status !== 'revoked'`, so a connection created via `McpConnection.createPending(...)` (`AuthorizeMcpConnection.ts:103-110`, invoked the moment the user clicks "Allow" on the consent screen, **before** any token exchange happens) is returned with `status: 'pending'` if the token exchange never completes. `GET /api/mcp/connections` (`mcp.ts:281-294`) passes that status straight through in its JSON response, and neither `connectedAppsService.ts` nor `ConnectedAppsCard.tsx` (`retro-rocket/src/features/auth/`) ever inspects the `status` field — every entry is rendered identically regardless.

**Rationale**: This is the same class of bug 023 fixed for `revoked`, just for a status 023 didn't need to consider (`pending` connections whose authorization never completed weren't in scope for that feature). `McpConnectionStatus` today is only `'pending' | 'active' | 'revoked'` (`McpConnection.ts:4`) — there is no terminal state distinguishing "still trying" from "gave up/failed," so a `pending` row that will never complete is indistinguishable, in storage, from one that's 5 seconds old and genuinely in progress.

**Alternatives considered**: See §2 for the "query-only filter" vs. "new terminal status" choice — already decided in `/speckit-clarify` (Clarifications, spec.md).

## 2. Data model for the new terminal state (spec Clarifications Q1 + Q2)

**Decision**: Add `'failed'` to `McpConnectionStatus`, plus `failedAt: number | null` to `McpConnectionData`, mirroring the existing `revokedAt` pattern exactly. A single status value covers both trigger paths from Clarification Q2 (explicit signal and timeout) — the spec's "e.g., 'failed'/'expired'" phrasing treats them as one concept, and Constitution V (KISS) argues against splitting them into two statuses when nothing downstream needs to distinguish "explicitly rejected" from "silently timed out."

**Rationale**: `McpConnection.revoked(nowSeconds)` (`McpConnection.ts:71-74`) already establishes the idempotent-transition pattern this needs: no-op if already in the terminal state, otherwise transition. `McpConnection.failed(nowSeconds)` follows the same shape (`pending → failed`; no-op — returns `this` unchanged — for any other current status), which lets both call sites (§3, §4 below) call it unconditionally without needing to check current status first, exactly like `RevokeConnection.ts` already does with `.revoked()`.

**Alternatives considered**:
- *Two statuses (`'failed'` for explicit rejection, `'expired'` for timeout)* — rejected: nothing in the spec or the UI (which excludes both from the list either way, per the Assumptions) needs to tell them apart; two statuses would only add branching with no behavioral difference (YAGNI).
- *A boolean `failed: boolean` flag alongside `status` instead of a new status value* — rejected: `status` is already the single source of truth for connection state everywhere (`isActive`, `mcpAuthMiddleware`, `ListConnections`); adding a second, independent flag risks the two falling out of sync (e.g., `status: 'pending', failed: true` is a nonsensical combination a flag-based model would still allow at the type level).

## 3. Explicit-signal path: where a failure is first knowable

**Decision**: `ExchangeMcpToken.ts`'s `authorization_code` branch (`ExchangeMcpToken.ts:46-65`) is the one place a failure is ever definitively knowable server-side. Today it throws generic `new InvalidGrantError()` from four distinct conditions with no distinguishing message and no side effect on the underlying connection record:
1. `consumeAuthorizationCode` returns `null` (code not found, already consumed, or expired — `FirestoreMcpConnectionAdapter.ts:94-106`)
2. `record.clientId !== input.clientId || record.redirectUri !== input.redirectUri`
3. PKCE verifier mismatch
4. `!record.connectionId` (the authorization request was denied, or somehow has no associated connection)

The fix gives each branch a distinct message (needed regardless of the FR-004 root cause investigation in §6 — this is the fix for the currently-verified "every failure logs identically" defect) and, for branches 2–3 (where `record.connectionId` is already in hand from the successfully-consumed code) or via a supplementary `getAuthorizationRequest(input.code)` lookup on branch 1 (since `consumeAuthorizationCode` returns `null` without exposing the record on that path), marks the associated connection `'failed'` via `connection.failed(now)` + `saveConnection(...)` before throwing.

**Rationale**: This is the only point in the flow where the system can say, with certainty, "this specific attempt is dead and will never become active" — as opposed to lazy timeout (§4), which only knows an attempt has gone unusually quiet, not that it definitively failed.

**Alternatives considered**: Doing the failure-marking in the HTTP route handler (`mcp.ts`'s `/api/mcp/token` handler) instead of inside `exchangeMcpToken` itself — rejected: the connection lookup and mutation is a business rule belonging in the use case (Constitution IV, SOLID), and the route handler doesn't have direct access to the resolved `connectionId` without re-deriving it.

## 4. Timeout path + migration of already-stuck records (spec FR-008b, FR-009)

**Decision**: `ListConnections.ts` gains a `clock: ClockPort` dependency. Before filtering, for each connection with `status === 'pending'` whose age (`nowSeconds - createdAt`) exceeds `MCP_AUTHORIZATION_REQUEST_TTL_SECONDS` (imported from `AuthorizeMcpConnection.ts:6`, already `60 * 10` seconds), call `.failed(now)` and persist via `connectionStore.saveConnection(...)` before continuing. The list itself is then simplified to return only `status === 'active'` entries.

**Rationale**: Once the 10-minute authorization-code TTL has elapsed, the associated `pending` connection is provably dead — `consumeAuthorizationCode` will unconditionally reject it (`expiresAt < nowSeconds`) — so this is not a heuristic guess, it's the same deadline the code itself is already bound by, just applied to the connection record for display/bookkeeping purposes. Reusing the constant (rather than introducing a second, independently-tunable timeout) keeps a single source of truth (Constitution V).

This mechanism satisfies FR-009 (migrating already-stuck records) with no separate script: any `pending` connection sitting in Firestore today from a failed reconnection attempt is, by construction, already well past its 10-minute window by the time this ships — the very next `GET /api/mcp/connections` call for that user catches and persists it as `'failed'`.

**Alternatives considered**:
- *A scheduled/cron cleanup job* — rejected: no such infrastructure exists in this codebase today (confirmed: no cron/scheduled-function pattern found under `server/src`), and introducing one purely for this would be new operational surface for a low-volume, low-severity bookkeeping concern (Constitution V, YAGNI).
- *A one-off backfill script run at deploy time* — rejected: same reasoning: the lazy, on-read approach achieves the same end state the first time any affected user loads their profile, at zero extra operational cost.

## 5. Frontend: defense-in-depth filter

**Decision**: `connectedAppsService.ts`'s `fetchConnectedApps()` additionally filters the response to `status === 'active'` before returning it to `useConnectedApps`/`ConnectedAppsCard`, and `ConnectedApp.status`'s type narrows from `'pending' | 'active'` to the literal `'active'`.

**Rationale**: The reported bug was precisely "the server included a non-active entry, and the client blindly trusted it." Given this is a trust/security-adjacent display surface (it's literally the page a user checks to audit access to their account), a second, independent check on the client is proportionate defense-in-depth, not speculative validation for a scenario that can't happen — this exact scenario already happened in production. It costs one filter call and one regression test.

**Alternatives considered**: Relying solely on the backend fix — rejected given the above; the whole point of this feature is that a single-layer assumption ("the API only ever returns what should display as connected") already failed once.

## 6. FR-004: root cause of "no es posible realizar la conexión"

**Decision**: Static review of `AuthorizeMcpConnection.ts`, `ExchangeMcpToken.ts`, `RegisterMcpClient.ts`/`McpClientRegistration.ts`, and the `.well-known` discovery endpoints (`mcp.ts:148-163`) found no non-conformant OAuth 2.1/PKCE behavior — redirect_uri registration checks, `S256`-only PKCE, one-time-use codes, and the 10-minute code TTL all match the documented contract (`specs/015-mcp-read-server/contracts/oauth-endpoints.md`). No CORS gap applies, since `/api/mcp/token` and `/api/mcp/register` are called server-to-server by the AI client's own backend, not by browser JavaScript (confirmed: `server/src/http/app.ts` has no CORS middleware anywhere, consistent with every other route in the app, none of which need it for the same reason).

The one **concrete, verified** defect is the observability gap described in §3: every `InvalidGrantError` throw site is indistinguishable in logs today. This is fixed as part of this feature regardless of what the eventual root cause turns out to be, because it is the prerequisite to ever finding out. Until a real reconnection attempt is captured with the improved logging, the specific trigger cannot be confirmed from this repository alone — this matches the spec's own Assumption that "the specific technical root cause... is not yet known at the specification stage."

**Two hypotheses to test once logging lands** (to be exercised as an early task, not assumed):
- **H1 — never reaches `/token` at all**: the AI client's own reported "unable to connect" happens before it ever calls our token endpoint (e.g., a transient issue completing DCR or the `/authorize` redirect round-trip). If true, no `InvalidGrantError` is ever logged for the attempt, and the fix lies outside this repository's OAuth logic (or in the discovery-metadata response) — the timeout path (§4) is what correctly cleans up this case regardless.
- **H2 — reaches `/token` but is rejected**: one of the four `InvalidGrantError` branches is genuinely firing (most plausible candidate, given the flow: a slow consent step eating into the 10-minute code TTL, or a client retry re-sending an already-consumed code after a dropped response on the first, actually-successful attempt). The newly distinct messages (§3) will surface exactly which one, the next time this is reproduced with logging in place.

**Rationale for not guessing further**: Neither hypothesis can be confirmed or ruled out from static code alone — this requires reproducing against live logs, which is an implementation-phase (tasks.md) activity, not a planning-phase one. Shipping the logging fix and the status-tracking fix together means the *next* real reconnection attempt — whether it succeeds outright (because the underlying OAuth logic was already correct and the display bug was the whole story) or fails again (in which case the logs will now say why) — produces real evidence either way.
