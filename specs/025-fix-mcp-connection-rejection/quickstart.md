# Quickstart: Validating the MCP Connection-Rejection Fix

Prerequisites: repo checked out on `025-fix-mcp-connection-rejection`, dependencies installed (`npm install` at repo root — run inside `retro-rocket/`), Firebase emulators available (`firebase-tools` is already a devDependency).

## 1. Automated checks

```bash
# Backend unit tests (http/routes/mcp.ts, mcp-wiring.ts, composition-root.ts)
npm run test:server

# Backend coverage gate (Constitution VI — must stay ≥ 80% branches/functions/lines/statements)
npm run test:server:coverage

# E2E (Constitution VII) — requires the Firestore/Auth emulators
npm run e2e
```

All of the above must pass before this feature is considered done. New/changed test files per plan.md's Project Structure section:
- `server/test/http/routes/mcpToken.test.ts` (modified — two distinct users colliding on the same IP are isolated; a single user's own excessive activity is still throttled; unresolvable/garbage requests still fall back to IP-keyed throttling)
- `server/test/http/routes/mcpTestApp.ts` (modified — default fake `metrics` in the test fixture)
- `server/test/application/use-cases/mcp/mcpFakes.ts` (modified, if needed — a reusable fake/spy `MetricsPort`)
- `e2e/mcp-connector.spec.ts` (modified — two simulated users connecting through the same client in quick succession both end up with a working connection)

## 2. Manual validation — User Story 1 (connecting actually succeeds, even under shared-IP conditions)

1. Start the dev server (`npm run dev:server` in one terminal, `npm run dev` in another) against the Firestore emulator (`npm run emulators`).
2. Register a test MCP client and complete the authorize → consent → token-exchange sequence for **two different signed-in users**, sending both sets of requests with the same `X-Forwarded-For` header (simulating two users behind the same AI-client infrastructure) — `specs/015-mcp-read-server/quickstart.md` documents the full register/authorize/consent sequence; `curl`/`httpie` with an explicit `X-Forwarded-For: 203.0.113.10` header on both users' `POST /api/mcp/token` calls reproduces the shared-IP condition without needing two real machines.
3. Confirm **both** users' token exchanges return `200` with a working access token — before this fix, the second user's exchange would eventually return `429` once the shared bucket filled from the first user's traffic.
4. Confirm each user's profile page shows their own connection as active, independently.

## 3. Manual validation — User Story 2 (revoke → reconnect still works under the same conditions)

1. With an active connection from §2, revoke it via the Connected Apps card's "Revoke" button.
2. Start a brand-new authorization attempt for the same client (same simulated shared IP as §2) and complete the full authorize → consent → token-exchange sequence.
3. Confirm the exchange succeeds (`200`) and the profile page shows a new active connection — not a `429`.
4. Using the newly issued access token, make an MCP tool call (`POST /api/mcp`, e.g. `list_retrospectives`) and confirm it succeeds.

## 4. Manual validation — protection is preserved, not removed (Clarification Q1)

1. Using a single resolvable identity (one valid, not-yet-consumed `code`, or one valid `refresh_token`), send 61+ token requests in quick succession.
2. Confirm the 61st+ request returns `429 { error: { code: "rate_limited" } }` — a single user's own excessive activity is still throttled, exactly as before this fix.
3. Send one request with a clearly bogus `code` (e.g. `"does-not-exist"`) repeated 61+ times from one IP. Confirm it still returns `429` after 60 — the IP-keyed fallback for unresolvable/garbage requests is unchanged.

## 5. Manual validation — observability (Clarification Q2, FR-008/SC-006)

1. Trigger a `429` from §4 step 2 (a resolvable `uid` hitting its own limit) and inspect server stdout/logs for a `{"type":"metric","name":"mcp.token.rate_limited","tags":{"keyType":"uid",...}}` line.
2. Trigger a `429` from §4 step 3 (an unresolvable/garbage request) and confirm the corresponding line has `"keyType":"ip"`.
3. Confirm no such metric line is emitted for a successful (`200`) token exchange.

## 6. Regression check — 023/024 behavior unaffected

- The `400 invalid_grant` responses and their distinct messages (024) are unchanged — reusing an already-consumed code, a PKCE mismatch, or a `client_id`/`redirect_uri` mismatch still produce the same `400` responses as before.
- A revoked connection's `refresh_token` grant still fails with the "This connection has been revoked; reconnect by completing a new authorization" message (024) — this fix does not touch that logic, only what happens before it if the request would otherwise have been rate-limited.
- `GET /api/mcp/connections` still excludes `pending`/`failed`/`revoked` connections (023/024), unaffected by this feature.
