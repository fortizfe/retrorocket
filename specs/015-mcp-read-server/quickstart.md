# Quickstart: Validating the Remote Read-Only MCP Server

Prerequisites: repo checked out on `015-mcp-read-server`, dependencies installed (`npm install` in `retro-rocket/`), Firebase emulator suite available (already used by the existing E2E suite).

## 1. Start the stack locally

```bash
cd retro-rocket
firebase emulators:start --only auth,firestore &
npm run dev            # SPA
npm run dev:server      # or however the existing server/dev-server.ts is started, per feature 014
```

Seed one facilitator user and one participant user via the existing `/api/auth/test-login` emulator-only route (already used by the E2E suite), and create a retrospective with a few cards, a group, a like/reaction, an action item, and a facilitator note, either through the UI or existing test fixtures.

## 2. Register a test MCP client (Dynamic Client Registration)

```bash
curl -sX POST http://localhost:3001/api/mcp/register \
  -H 'Content-Type: application/json' \
  -d '{"client_name": "Quickstart Test Client", "redirect_uris": ["http://localhost:9999/callback"]}'
```
Expected: `201` with a `client_id`. See `contracts/oauth-endpoints.md`.

## 3. Authorize as the facilitator

Open, as the facilitator's signed-in browser session:
```
http://localhost:3001/api/mcp/authorize?client_id=<client_id>&redirect_uri=http://localhost:9999/callback&code_challenge=<S256 of a verifier>&code_challenge_method=S256&state=xyz
```
Approve the consent screen. Expected: redirect to `http://localhost:9999/callback?code=...&state=xyz`.

## 4. Exchange the code for an access token

```bash
curl -sX POST http://localhost:3001/api/mcp/token \
  -H 'Content-Type: application/json' \
  -d '{"grant_type":"authorization_code","code":"<code>","redirect_uri":"http://localhost:9999/callback","client_id":"<client_id>","code_verifier":"<verifier>"}'
```
Expected: `200` with `access_token`. This validates User Story 1's core acceptance scenario (SC-001).

## 5. Call the MCP tools

Using any Streamable HTTP MCP client (or the MCP SDK's inspector/CLI) pointed at `http://localhost:3001/api/mcp` with `Authorization: Bearer <access_token>`:

- `list_retrospectives` → expect exactly the seeded retrospective, `role: "facilitator"` (User Story 2).
- `get_retrospective_detail` with that id → expect cards, groups, reactions, participants, sentiment (if any), action items, **and** `facilitatorNotes` present (User Story 3 + User Story 4 facilitator branch).
- `get_retrospective_summary` with that id → expect the structured summary shape from `contracts/mcp-tools.md`, including `facilitatorNotes` (User Story 5).

## 6. Repeat as a participant (not facilitator)

Redo steps 3–5 authorizing as the seeded participant user instead. Expected difference: `get_retrospective_detail` and `get_retrospective_summary` responses have **no** `facilitatorNotes` key at all (User Story 4, Acceptance Scenario 2 — the core privacy check, SC-005).

## 7. Revoke and confirm immediate rejection

As the facilitator, in the app's Connected Apps page (or directly):
```bash
curl -sX DELETE http://localhost:3001/api/mcp/connections/<connectionId> --cookie "<session cookie>"
```
Then immediately retry `list_retrospectives` with the facilitator's still-held access token from step 4.

Expected: `unauthorized` tool error — the very next call is rejected, not merely after the token's own expiry (Clarification Q1, SC-002).

## 8. Edge cases to spot-check

- `get_retrospective_detail` for a retrospective id the connection has no access to (or a random nonexistent id) → identical `not_found` error either way (FR-009).
- `list_retrospectives` for a freshly-registered connection whose user owns/joins nothing yet → `{ "retrospectives": [] }`, not an error.
- A retrospective with no cards yet → `get_retrospective_detail` returns metadata with empty `cards`/`groups`/`actionItems` arrays, not an error.

## 9. Automated coverage

- Unit/integration: `npm run test:server` must cover `FacilitatorAccess`, `McpConnection` status transitions, and the token-validation live-check path, and must not drop the coverage floor (`npm run test:server:coverage`).
- E2E: `npm run e2e` must include the new Playwright spec covering steps 3–7 above end-to-end against the emulator.
