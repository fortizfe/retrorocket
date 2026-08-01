# Quickstart: Validating the MCP Connection Management Fix

Prerequisites: repo checked out on `023-fix-mcp-connection-management`, dependencies installed (`npm install` at repo root), Firebase emulators available (`firebase-tools` is already a devDependency).

## 1. Automated checks

```bash
# Backend unit tests (domain/mcp, application/use-cases/mcp, http/middleware, http/routes)
npm run test:server

# Backend coverage gate (Constitution VI — must stay ≥ 80% branches/functions/lines/statements)
npm run test:server:coverage

# Frontend unit tests (ConnectedAppsCard, useConnectedApps, connectedAppsService)
npm run test:run

# E2E (Constitution VII) — requires the Firestore/Auth emulators
npm run e2e
```

All of the above must pass before this feature is considered done. New/changed test files per plan.md's Project Structure section:
- `server/test/domain/mcp/ConnectionOrigin.test.ts` (new)
- `server/test/domain/mcp/McpConnection.test.ts` (modified — `touched()`, `origin` on `createPending`)
- `server/test/application/use-cases/mcp/ListConnections.test.ts` (modified — revoked filtering, origin/lastUsedAt passthrough)
- `server/test/application/use-cases/mcp/AuthorizeMcpConnection.test.ts` (modified — origin flows through to `createPending`)
- `server/test/http/middleware/mcpAuth.test.ts` (modified — `lastUsedAt` touch)
- `server/test/http/routes/mcpConnections.test.ts` (modified — response shape, revoked exclusion)

## 2. Manual validation — User Story 1 (revoke persists)

1. Start the dev server (`npm run dev:server` in one terminal, `npm run dev` in another) against the Firestore emulator (`npm run emulators`).
2. Complete the MCP OAuth flow once (register a test client, authorize, approve) so at least one `active` connection exists for your signed-in user. (`specs/015-mcp-read-server/quickstart.md` documents the full authorize/consent/token-exchange sequence if you need the exact curl/steps.)
3. Open the profile page's "Connected AI Assistants" card in the browser; confirm the connection is listed.
4. Click "Revoke". Confirm it disappears immediately from the list.
5. **Reload the page.** Confirm the connection does NOT reappear. (This is the regression check for the reported bug — before the fix, it would reappear here.)
6. Query Firestore directly (emulator UI or `firebase firestore:get`) to confirm the underlying document's `status` is `"revoked"` and `revokedAt` is set — i.e., the list is now consistent with the stored state, not just hiding it client-side.

## 3. Manual validation — User Story 2 (distinguishing same-client connections)

1. Authorize the same test AI client twice, using two different `User-Agent` strings for the `POST /api/mcp/authorize/decision` step (e.g. one desktop-like, one mobile-like — see `ConnectionOrigin.test.ts` fixtures for example strings that classify to each category).
2. Make at least one MCP tool call (`POST /api/mcp`) through one of the two connections' issued access token.
3. Reload the Connected Apps card. Confirm:
   - Both entries show the same `clientName` ("Claude" or your test client name).
   - Each shows a distinct origin label ("Desktop" vs "Mobile", or similar per your test `User-Agent`s).
   - The one you made a tool call through shows a "last used" time; the other shows the "never used yet" state.
4. Revoke only one of the two. Confirm the other remains active and untouched (createdAt/origin/lastUsedAt unchanged).

## 4. Accessibility spot-check (Constitution VIII)

- Toggle light/dark theme on the Connected Apps card; confirm the origin label's icon+text pairing (not color alone) remains legible and meets contrast in both themes.
- Tab through the card with keyboard only; confirm the "Revoke" button for each connection remains reachable and its accessible name still identifies which connection it revokes (existing `aria-label` pattern, unchanged).

## 5. i18n spot-check

- Switch the app language to Spanish; confirm the new origin-label and last-used strings render from `es.json` (no raw English fallback, no missing-key warnings in the console).
