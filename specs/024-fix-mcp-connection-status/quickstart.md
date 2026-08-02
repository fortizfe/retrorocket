# Quickstart: Validating the MCP Connection Status Fix

Prerequisites: repo checked out on `024-fix-mcp-connection-status`, dependencies installed (`npm install` at repo root), Firebase emulators available (`firebase-tools` is already a devDependency).

## 1. Automated checks

```bash
# Backend unit tests (domain/mcp, application/use-cases/mcp, adapters/firebase, http/routes)
npm run test:server

# Backend coverage gate (Constitution VI — must stay ≥ 80% branches/functions/lines/statements)
npm run test:server:coverage

# Frontend unit tests (connectedAppsService)
npm run test:run

# E2E (Constitution VII) — requires the Firestore/Auth emulators
npm run e2e
```

All of the above must pass before this feature is considered done. New/changed test files per plan.md's Project Structure section:
- `server/test/domain/mcp/McpConnection.test.ts` (modified — `.failed()` transition + idempotency)
- `server/test/application/use-cases/mcp/ExchangeMcpToken.test.ts` (modified — distinct messages, connection marked `failed`)
- `server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts` (modified — `pending`/`failed` excluded, stale-pending expiry+persistence)
- `server/test/adapters/firebase/FirestoreMcpConnectionAdapter.test.ts` (modified — `failedAt` backfill)
- `server/test/http/routes/mcpConnections.test.ts` (modified — response never contains a non-`active` entry)
- `retro-rocket/src/test/features/auth/services/connectedAppsService.test.ts` (modified — defensive client-side filter)

## 2. Manual validation — User Story 1 (a failed attempt never looks successful)

1. Start the dev server (`npm run dev:server` in one terminal, `npm run dev` in another) against the Firestore emulator (`npm run emulators`).
2. Begin the MCP OAuth flow for a registered test client (`specs/015-mcp-read-server/quickstart.md` documents the full register/authorize/consent sequence) and approve consent, but **do not** complete the token exchange (stop before calling `POST /api/mcp/token`, or call it with a deliberately wrong `code_verifier`).
3. Open the profile page's "Connected AI Assistants" card. Confirm the incomplete/failed attempt does **not** appear in the list.
4. Query Firestore directly (emulator UI or `firebase firestore:get`) for the connection document created at step 2:
   - If you completed step 2 with a wrong PKCE verifier: confirm `status` is `"failed"` and `failedAt` is set (explicit-signal path).
   - If you simply stopped before exchanging: confirm `status` is still `"pending"` immediately after, then reload the Connected Apps card **after waiting past the 10-minute authorization-code TTL** (or, for a faster local check, inspect via the unit tests instead — `ListConnectionsAndRevoke.test.ts` covers this without a real 10-minute wait) and re-query Firestore to confirm it is now `"failed"` (timeout path).
5. Retry the flow for the same client from scratch and complete it fully this time. Confirm the profile page now shows exactly one active connection — the earlier failed attempt does not reappear or get confused with it.

## 3. Manual validation — User Story 2 (reconnecting after a revoke works)

1. With at least one active connection from §2, revoke it via the Connected Apps card's "Revoke" button.
2. Start a brand-new authorization attempt for the same client (register a fresh client if desired, or reuse the same registered `client_id`) and complete the full authorize → consent → token-exchange sequence.
3. Confirm the exchange succeeds and the profile page shows a new active connection.
4. Using the newly issued access token, make an MCP tool call (`POST /api/mcp`, e.g. `list_retrospectives`) and confirm it succeeds — the new connection is genuinely usable, not just listed.
5. If step 2 fails: check the server logs for the `request_error` entry's `detail` field — it should now name the specific failure condition (research.md §3) rather than the previous generic message, giving a concrete lead instead of a dead end.

## 4. Regression check — 023 behavior unaffected

- Revoke an active connection, reload the profile page: confirm it still does not reappear (023's fix, now a strict subset of this feature's broader `status === "active"` filter).
- Confirm two distinct active connections for the same client (different origins) both still display correctly, with independent revoke actions (023's Story 2, unaffected by this feature).
