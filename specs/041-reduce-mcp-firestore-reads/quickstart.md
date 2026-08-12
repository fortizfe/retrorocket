# Quickstart: Validating the MCP Connector Read-Volume Optimizations

Prerequisites: Firebase emulator suite running (`npm run emulators` from `retro-rocket/`), backend dev server running (`npm run dev:server`) or `npm run dev:all` for both frontend and backend. An MCP client connection already established for a test user (see `e2e/fixtures/mcp.ts`'s `registerAndConnectMcpClient`, or drive `POST /api/mcp/register` → `/api/mcp/authorize` → `POST /api/mcp/token` manually) to obtain a valid access token for the manual checks below.

## Story 1 — Connection-authorization cache, backoff, and per-identity rate limiting

**Note on SC-001**: the steps below validate SC-001's *constituent mechanisms* (SC-002's cache reduction, SC-003's backoff) individually against the Firestore emulator. SC-001 itself ("a burst of the 2026-08-12 incident's magnitude no longer trips the anti-abuse throttle") cannot be validated by any of these steps or by any automated test — the Firestore emulator does not simulate the Spark-plan `RESOURCE_EXHAUSTED` anti-abuse throttle at all, so there is no local or CI environment where that specific failure mode can be reproduced on demand. SC-001 is confirmed only indirectly, by these mechanisms being in place, and directly only via a post-deploy production observation (e.g., no recurrence of the incident's error pattern in Vercel runtime logs during comparable traffic).

1. Start the Firestore emulator with its debug log enabled (`firestore-debug.log`, produced by `npm run emulators`).
2. Using a valid access token, call `POST /api/mcp` (a `list_retrospectives` tool call, per the MCP Streamable HTTP protocol) three times in quick succession (within a couple of seconds).
3. Count `mcpConnections/{connectionId}` document reads attributable to those three calls in the debug log.
   - **Expected (after fix)**: 1 read (the first call populates the cache; calls 2 and 3 land within the 10s TTL — `SC-002`, `FR-001`), down from 3 today.
4. Wait 11+ seconds, then call again.
   - **Expected**: a fresh read occurs (cache entry expired) — confirms the cache has an upper bound, not indefinite staleness.
5. Revoke the connection (`DELETE /api/mcp/connections/:id`) immediately after a cache-populating call, then call `POST /api/mcp` again with the now-revoked token, from the same backend instance.
   - **Expected**: rejected (`401 unauthorized`) on this very next call — confirms the explicit cache eviction on revoke (data-model.md) still holds even inside the 10s window.
6. Call `POST /api/mcp` six times rapidly with a deliberately invalid Bearer token (or none).
   - **Expected**: the first 5 return `401 unauthorized`; from the 5th accumulated failure onward within the 30s window, subsequent attempts return `429` with `error.code: "auth_backoff"` and a `Retry-After` header (`contracts/mcp-backoff-response.md`, `SC-003`).
7. From two different simulated identities (two distinct valid access tokens for two different uids) issued through the same client/IP, each make ~60 rapid `list_retrospectives` calls (well under the unchanged 120/minute cap per identity).
   - **Expected**: neither identity's calls are rate-limited by the other's volume — confirms `toolLimiter` is now keyed by uid, not shared IP (`FR-003`).

## Story 2 — No duplicate/linear-scaling lookups within a single call

1. Clear/mark the emulator debug log, then call `get_retrospective_detail` (or `get_retrospective_summary`) for a retrospective with at least one card.
2. Count `cards` collection queries attributable to that single tool call.
   - **Expected (after fix)**: 1 query, down from 2 (`SC-004`, `FR-004`).
3. As a user who participates in (but doesn't facilitate) at least 5 retrospectives, clear/mark the debug log and call `list_retrospectives`.
   - **Expected**: the individual-`.doc().get()`-per-retrospective pattern is gone — a single batched `getAll`/chunked read appears instead of N separate point-reads (`SC-005`, `FR-005`).

## Story 3 — Short-lived detail/summary result cache

1. Clear/mark the debug log, call `get_retrospective_detail` for a retrospective, then immediately call it again (within a few seconds, same `retrospectiveId`).
2. Count the underlying `cards`/`groups`/`sentimentResults`/`actionItems` queries across both calls.
   - **Expected (after fix)**: the full fan-out (4 queries) occurs once on the first call; the second call reuses the cached result and issues none of them (`FR-008`).
3. Wait 16+ seconds, then call a third time.
   - **Expected**: a fresh fan-out occurs (cache entry expired at 15s) and reflects any data changed in between.
4. As two different users with access to the same retrospective (one the facilitator, one a plain participant), call `get_retrospective_detail` for the same retrospective back-to-back (within the cache window).
   - **Expected**: both responses correctly include/exclude `facilitatorNotes` per their own access level, even though the cached, requester-independent portion (cards/groups/etc.) was served from the same cache entry for both (data-model.md's "access check stays live" design) — confirms `FR-006` holds under caching.

## Regression check (all stories)

Run the full existing suites and confirm no failures/coverage drop:

```sh
npm run test:server:coverage   # server/vitest.config.ts — thresholds must still pass
npm run test:coverage          # root vitest.config.ts — frontend unaffected but must still pass
npm run e2e                    # Playwright against the Firebase emulator, including
                                # mcp-connector.spec.ts
```

`e2e/mcp-connector.spec.ts` already has the infrastructure this feature's Story 2/3 checks build on: it tracks emulator Firestore hits via `page.on('request')`/`FIRESTORE_HOST_PATTERN` for its existing revoke-rejection check, and `server/test/http/routes/mcpTools.test.ts` already drives the real MCP SDK client against a real HTTP server (with a fake `RetrospectiveReadPort`) for protocol/access-control correctness — that Vitest suite is the right place to confirm `SC-006` (no regression in tool behavior or access control), while the emulator-backed E2E spec is the right place to confirm actual read-volume reduction, since the fake port used by the Vitest suite has no real Firestore calls to count.
