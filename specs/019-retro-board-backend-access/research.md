# Phase 0 Research: Retrospective Board Backend-Mediated Access

All items below were resolved through direct codebase inspection and Vercel platform documentation (no `NEEDS CLARIFICATION` markers remain in spec.md); this document records the resulting design decisions and their rationale. This feature is materially larger than `017`/`018`: it both migrates ~10 Firestore collections' worth of write/read operations behind the backend (the same kind of work as `017`/`018`) **and** introduces a genuinely new subsystem — a backend-mediated, server-push real-time delivery channel — that has no precedent anywhere in this codebase.

## 1. The real-time transport: WebSocket over the existing Vercel Function, backed by a server-side Admin SDK Firestore listener

**Decision**: Add one new WebSocket endpoint, `GET /api/retrospectives/:id/live` (upgraded from HTTP), served by the same single Express app/Vercel Function that already serves every other route (`retro-rocket/api/index.ts`). Implementation shape, per Vercel's own documented pattern for Node.js Function WebSockets:

```ts
// api/index.ts becomes an http.Server (not a bare req/res handler), with the
// existing Express app mounted on it, and a WebSocketServer attached to that
// same http.Server instance:
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/retrospectives-live' /* upgrade routed by board id in the query/subprotocol */ });
export default server;
```

On the server side, for each retrospective board that has **at least one open WebSocket connection on that function instance**, the backend opens **one server-side Firestore listener per watched collection** (`cards`, `groups`, `actionItems`, `retrospectives` (for timer + `columnGroupingStates` + board metadata), `facilitatorNotes` (scoped per-facilitator), `typingStatus`, `participants`) via `firebase-admin`'s `onSnapshot` — i.e., the exact same push mechanism the browser uses today, just moved server-side. Each Firestore change is translated into a small JSON event and immediately relayed over every open WebSocket connected to that board on that instance. When the last WebSocket for a board on an instance closes, that instance tears down its Firestore listeners for that board.

**Rationale**:

- Vercel's official documentation (`vercel.com/docs/functions/websockets`) confirms Node.js Vercel Functions — including plain Express apps, not just Next.js — support WebSockets today: *"Use Express, Hono, or h3 to handle WebSocket connections by exporting the server as the default export... Requires the `ws`... package."* This directly satisfies the Clarifications' requirement for **genuine server-push**, not polling (FR-019a): the backend does not wait to be asked, it pushes the instant Firestore notifies it.
- Using Firestore itself (via `firebase-admin`, server-side) as the event source — rather than inventing a new message bus — means **no new message-broker dependency** (no Redis, no third-party pub/sub) is needed for correctness, even across multiple concurrent Vercel Function instances: Firestore already reliably delivers change events to every listener subscribed to a given query, server-side listeners included, regardless of which process/instance registered them. Two participants connected to two different Function instances for the same board each get their own instance's independent Firestore listener, and Firestore itself does the fan-out — this is the same guarantee the current all-client architecture already relies on, just with the listener moved server-side. (`server/src/adapters/redis/` and `server/src/adapters/firestore/` are pre-existing **empty placeholder directories** in this repo — confirmed via directory listing — with zero files and no dependency in `package.json`; this design deliberately does not need to populate either.)
- This also **reduces** total Firestore listener/read volume versus today: today, N browsers open N independent `onSnapshot` listeners per board; with this design, all browsers connected to the same board *on the same Function instance* share one server-side listener per collection, and the WebSocket fan-out to those browsches is essentially free (in-process). This is a genuine cost/scalability improvement, not just an architectural relocation.
- `firebase-admin` is already a project dependency (used by every existing adapter); `ws` is the one new dependency this feature adds, and it is the same library Vercel's own documentation uses — an established, actively maintained, minimal-footprint library, satisfying constitution Principle III (Prefer Proven Third-Party Libraries).

**Alternatives considered**:
- *Server-Sent Events (SSE)* instead of WebSocket — rejected because SSE is one-directional (server→client only); this feature also needs the client to send typing-status signals and to open/close per-board subscriptions, which would then need a second channel (regular POST requests) alongside SSE, adding complexity without a compensating benefit over a single bidirectional WebSocket. (Typing-status *writes* already go through ordinary REST per FR-017 regardless of transport choice — but the subscribe/unsubscribe handshake is cleaner as one connection.)
- *Short-interval polling* — explicitly rejected by the Clarifications (FR-019a): does not qualify as "genuine push" regardless of interval.
- *A third-party realtime service (e.g. Pusher/Ably/Vercel-hosted Redis pub/sub)* — rejected for this iteration: adds a new paid external dependency and a new secret/credential to provision, when the Admin-SDK-listener approach above achieves the same outcome with zero new infrastructure beyond one new npm package, keeping this feature's blast radius consistent with `014`'s "no new required secret beyond what's already provisioned" pattern (`018` research.md §"Constraints"). Worth revisiting only if a future feature needs cross-region fan-out or true horizontal scale beyond a single Firestore project's listener capacity.
- *One Firestore listener per (board, collection) shared globally across all Function instances via an in-memory singleton* — not meaningfully different from "per-instance" in Vercel's model (each Function instance already has its own process memory; there is no shared in-memory space across instances), so "per-instance" is simply the accurate description of the same design, not a rejected alternative.

## 2. Function duration, reconnection, and resync

**Decision**: Configure `maxDuration` for the WebSocket route via `vercel.json`'s `functions` block (a longer duration than the project's current implicit default, capped by plan). The frontend's WebSocket client implements **reconnect-with-exponential-backoff**, matching Vercel's own documented client pattern, and on every successful (re)connection, first performs a normal `GET /api/retrospectives/:id` REST fetch (FR-002/FR-004) to resync full state, then resumes the live subscription. This satisfies the spec's edge case ("the mechanism delivering live updates... temporarily unavailable... resynchronizes... without requiring a full page reload") by construction: reconnect + resync is client-side JavaScript, not a page reload.

**Rationale**: Vercel's own WebSocket documentation explicitly calls out that Functions reach a maximum duration and states the expected mitigation is client-side reconnection with backoff — this is normal, expected behavior on this platform, not a failure mode to design around exhaustively. A retrospective session can easily run longer than a single Function invocation's duration, so reconnection is a **routine**, not exceptional, occurrence and must be first-class in the client, not an afterthought.

**Alternatives considered**: Relying on the WebSocket connection lasting the entire retrospective session uninterrupted — rejected as incompatible with the serverless execution model regardless of `maxDuration` value chosen; reconnect logic is required either way, so it is designed in from the start rather than bolted on.

## 3. Real-time event envelope

**Decision**: A single, uniform JSON message shape for every server→client push, regardless of entity type:

```json
{ "type": "entity_change", "entity": "card" | "group" | "actionItem" | "timer" | "typingStatus" | "participant" | "retrospective" | "facilitatorNote", "op": "created" | "updated" | "deleted", "id": "<doc id>", "data": { /* full current entity, mirroring the REST GET shape; omitted for op:"deleted" */ } }
```

mapped directly from Firestore's own `QuerySnapshot.docChanges()` `type` (`'added' | 'modified' | 'removed'` → `created | updated | deleted`). Client subscribes to exactly one board per WebSocket connection (`GET /api/retrospectives/:id/live`); the board id is fixed for the connection's lifetime (no multi-board multiplexing), matching the fact that a browser tab only ever has one retrospective board open at a time.

**Rationale**: A uniform envelope means the frontend needs exactly one message handler (dispatch on `entity`), not a bespoke handler per collection — Simplicity (KISS). Reusing Firestore's own added/modified/removed vocabulary avoids inventing a parallel one. `facilitatorNote` events are only ever sent to the WebSocket connection belonging to that same facilitator (server-side filter before relay), preserving FR-013's visibility scoping over the wire, not just in the REST responses.

**Alternatives considered**: A separate message `type` per entity (e.g. `card_created`, `card_updated`, ...) — rejected as needless enumeration (10 entities × 3 ops = 30 message types) for no behavioral benefit over `{entity, op}` as two fields.

## 4. Authentication for the WebSocket connection

**Decision**: Reuse the existing `rr_session` httpOnly cookie exactly as every REST route does. Because the WebSocket upgrade request is itself a same-origin HTTP request, the browser automatically attaches the session cookie; the server reads it during the `upgrade` event (before accepting the WebSocket handshake) via the existing `readCookie(req, SESSION_COOKIE)` + `sessionService.verify(...)` — identical to `requireSession()` in `boards.ts`/`profile.ts` — and rejects the upgrade (closes with an error code) if unauthenticated. No new auth mechanism, no token-in-URL workaround needed, since the cookie already travels with the upgrade request same-origin.

**Rationale**: Directly satisfies FR-003 ("MUST authenticate every retrospective-board request using the existing session-based authentication already in place") for the realtime channel too, with zero new secrets or credential types.

## 5. REST API surface shape

**Decision**: One resource-oriented router, `retrospectiveRouter`, mounted at `/api/retrospectives`, plus board-scoped sub-resources, following the exact `requireSession()` + rate-limiter + `AppError` conventions of `boards.ts`/`profile.ts`:

| Resource | Endpoints |
|---|---|
| Board | `GET /api/retrospectives/:id` (full state, FR-004), `POST /api/retrospectives/:id/join` (FR-005) |
| Cards | `POST /api/retrospectives/:id/cards`, `PATCH /api/cards/:id`, `DELETE /api/cards/:id`, `POST /api/cards/:id/vote`, `POST /api/cards/:id/like`, `PUT /api/cards/:id/reaction`, `DELETE /api/cards/:id/reaction`, `POST /api/retrospectives/:id/cards/reorder` (batch) |
| Groups | `POST /api/retrospectives/:id/groups`, `DELETE /api/groups/:id`, `POST /api/groups/:id/cards`, `DELETE /api/groups/:id/cards/:cardId`, `PATCH /api/groups/:id` (collapse state) |
| Column grouping display | `PATCH /api/retrospectives/:id/column-grouping` |
| Timer | `PUT /api/retrospectives/:id/timer` (create/configure), `POST /api/retrospectives/:id/timer/start`, `/pause`, `/reset`, `DELETE /api/retrospectives/:id/timer` |
| Facilitator notes | `POST /api/retrospectives/:id/notes`, `PATCH /api/notes/:id`, `DELETE /api/notes/:id` (list is returned inline in `GET /api/retrospectives/:id`, scoped to the caller) |
| Action items | `POST /api/retrospectives/:id/action-items`, `PATCH /api/action-items/:id`, `DELETE /api/action-items/:id`, `POST /api/cards/:id/convert-to-action-item` |
| Sentiment | `PUT /api/cards/:id/sentiment` (computed result), `PUT /api/cards/:id/sentiment/override` (facilitator only) |
| Typing | `POST /api/retrospectives/:id/typing` (`{ column, isActive }`) |
| Realtime | `GET /api/retrospectives/:id/live` (WebSocket upgrade) |

**Rationale**: Mirrors `017`/`018`'s resource-per-router style; sub-resources that are logically owned by a card/group (vote, like, reaction, reorder) hang off `/cards/*`/`/groups/*` rather than being nested under `/retrospectives/:id/cards/:cardId/*`, keeping URLs short and matching how `boards.ts` already flattens `/api/boards/:id/join` rather than `/api/users/:uid/boards/:id/join`.

**Alternatives considered**: A single mega-endpoint (`POST /api/retrospectives/:id/actions` with a discriminated-union body) — rejected as harder to rate-limit/authorize per-operation-type and a worse fit for the existing per-route Express conventions than granular REST resources.

## 6. Ports and adapters

**Decision**: One new port per bounded sub-area, all implemented against `firebase-admin`'s `Firestore` instance obtained via the existing `getFirestore()` singleton (already initialized once in `auth-wiring.ts`), following `017`'s `BoardsPort`/`FirestoreBoardsAdapter` and `018`'s `ProfilePort`/`FirestoreProfileAdapter` precedent exactly:

- `RetrospectiveBoardPort` (board read/join/timer/column-grouping — the `retrospectives/{id}` document and its embedded fields)
- `CardPort` (cards CRUD, vote, like, reaction, reorder)
- `CardGroupPort` (groups CRUD)
- `ActionItemPort` (action items CRUD + convert-from-card)
- `FacilitatorNotePort` (notes CRUD, scoped by `facilitatorId`)
- `SentimentResultPort` (save/override)
- `TypingStatusPort` (set/clear)
- `ParticipantPort` (join/list) — reuses the `participants` collection already read by `FirestoreRetrospectiveReadAdapter` (015); this feature adds the **write** side that adapter deliberately excludes (its own doc comment: *"this interface exposes no write methods at all"*).
- `RealtimeGatewayPort` — the abstraction the WebSocket layer depends on to register/unregister per-board Firestore listeners and broadcast events; its one concrete adapter (`FirestoreRealtimeGatewayAdapter`) is what implements §1's design. Kept as its own port (Interface Segregation) so route handlers for ordinary writes never need to know the realtime layer exists.

**Rationale**: Interface Segregation (constitution Principle IV) — each port stays narrowly scoped to one bounded concern, exactly like the existing `BoardsPort`/`ProfilePort`/`RetrospectiveReadPort` split. `FirestoreRetrospectiveReadAdapter` (015, MCP) is left **entirely unmodified**: it is read-only by explicit design (FR-013 of `015`) and serves a different caller (the MCP connector, not this screen); this feature adds sibling write-capable adapters rather than mutating that one.

**Alternatives considered**: One monolithic `RetrospectivePort` covering everything — rejected as violating Interface Segregation and creating an oversized adapter mirroring the "God object" anti-pattern the constitution's SOLID principle explicitly guards against.

## 7. Vote/like/reaction concurrency (spec FR-008/FR-009, no-lost-update guarantee)

**Decision**: `voteCard`, `toggleLike`, and reaction add/remove are implemented server-side using Firestore's atomic primitives — `FieldValue.increment()` for votes, `FieldValue.arrayUnion()`/`arrayRemove()` for likes/reactions (the same primitives the client already uses for likes/reactions today, per the exact-shape research above) — executed inside the Admin SDK, which is immune to the read-then-write race the current **client-side** `voteCard` has (it does a plain `getDoc` + computed `updateDoc`, not `increment()`).

**Rationale**: Moving `voteCard` specifically from read-then-write to `increment()` is a direct, low-risk fix for the concurrency gap flagged during the codebase inventory, and is exactly what FR-008 ("MUST keep the resulting vote count accurate under concurrent votes... no lost updates") requires — this is a correctness requirement of the *new* backend implementation, not a preservation of the old client behavior verbatim (the old behavior is the bug being fixed by centralizing writes server-side, consistent with the spec's Edge Cases entry on concurrent voting).

**Alternatives considered**: Porting the existing read-then-write logic as-is server-side — rejected because it would carry the exact race condition into the backend and fail FR-008/SC-006's testable no-lost-update guarantee under concurrent load; using a Firestore transaction instead of `increment()` — unnecessary, since `increment()`/`arrayUnion()`/`arrayRemove()` are themselves atomic server-side operations that don't require a transaction wrapper for a single-document single-field update.

## 8. Reorder/move atomicity (spec FR-010)

**Decision**: `POST /api/retrospectives/:id/cards/reorder` accepts the full batch of `{ cardId, order, column? }` updates in one request and applies them via a single Firestore `WriteBatch` (atomic, all-or-nothing), replacing the current client-side `batchUpdateCardOrder`'s sequential `Promise.all` of independent writes (confirmed via code inspection to have no atomicity guarantee today, despite its name).

**Rationale**: Directly satisfies FR-010 ("no card duplicated or missing if the operation is interrupted partway through") and the corresponding Edge Case — a `WriteBatch` either fully commits or fully fails, eliminating the partial-application failure mode the current implementation is exposed to. Firestore batches are capped at 500 operations, far above any realistic single-column-reorder card count, so no chunking logic is needed.

**Alternatives considered**: Preserving the sequential-write behavior for parity with today — rejected for the same reason as §7: the spec's FR-010 is an explicit correctness bar for the new implementation, and `WriteBatch` is a proven, already-available Admin SDK primitive (no new dependency) that meets it directly.

## 9. Cascade delete on board deletion

**Decision**: This feature does not change `017`'s existing `deleteBoard` use-case/Firestore transaction, but flags (for a follow-up, not in this feature's scope) that the current `deleteRetrospectiveCompletely` cascade — confirmed via inspection to delete only `participants` and `cards`, leaving `groups`, `actionItems`, `facilitatorNotes`, `sentimentResults`, and `countdown_timers`/`typingStatus` documents orphaned — is a pre-existing gap, not one this feature introduces or is required to fix (spec FR-021 requires no data loss for *existing* data, not a retroactive cleanup of already-orphaned documents from past deletions, and board deletion itself is explicitly `017`'s scope, not `019`'s).

**Rationale**: Simplicity/YAGNI — expanding this feature's scope to also rewrite `017`'s delete cascade is not required by any FR/SC in `019-retro-board-backend-access`'s spec and would blur this feature's boundary. Noted here so the gap is documented rather than silently rediscovered later.

**Alternatives considered**: Fixing the cascade as part of this feature since the new adapters for `groups`/`actionItems`/`facilitatorNotes`/`sentimentResults` are being built anyway — reasonable, low-cost, and left as an **optional** task in `tasks.md` (not a hard FR), since the new adapters make it cheap to also delete these collections' documents by `retrospectiveId` from the same `WriteBatch`/loop `017`'s `DeleteBoard` use-case already runs, but it is not mandated by this feature's spec.

## 10. Dead code retirement

**Decision**: `src/features/boards/retrospective/services/typingStatusService.ts` (confirmed via repo-wide grep to have exactly one importer — its own test file — everywhere else uses `OptimizedTypingStatusService.ts`) is deleted outright as part of this feature, along with its test file, once the frontend's typing-status write path moves to the new backend client.

**Rationale**: Same rationale as `018` research.md §9 (`userService.ts` retirement) — a fully-superseded, zero-live-callers Firestore-direct module left in the tree after this migration would violate Simplicity/YAGNI and create an easy-to-miss accidental-reimport regression path.

**Alternatives considered**: Leaving it in place unused — rejected for the reason above.

## 11. Facilitator role and timer-control authorization

**Decision**: "Facilitator" for this feature is exactly `uid === retrospective.createdBy` (confirmed in `RetrospectiveBoard.tsx`: `const isFacilitatorFlag = uid === retrospective.createdBy`) — the same single, fixed-at-creation owner concept `017` already calls "owner" for rename/delete. No new role field, no reassignment mechanism. `FacilitatorMenu.tsx` (under `countdown/components/`, the component actually wired into `RetrospectivePage.tsx`) composes `FacilitatorMenuTabs`/`TimerTab` from `facilitator/components/` internally — both trees are live, not competing/dead implementations; this feature's UI wiring is unaffected either way since only the *service layer* changes.

**Rationale**: Confirmed by direct inspection, closing the ambiguity noted during `/speckit-clarify`'s initial scan without needing to ask the user (the answer was already unambiguous in code) — the backend's `requireFacilitator()` guard (mirroring `boards.ts`'s ownership check pattern for rename/delete) is simply `board.createdBy === session.sub`.

## 12. Rate limiting

**Decision**: One `retrospectiveLimiter` (`express-rate-limit`, same shape/skip-in-testMode pattern as `boardsLimiter`/`profileLimiter`) applied to the whole `retrospectiveRouter`. The WebSocket upgrade endpoint is rate-limited separately by capping concurrent open connections per session (a simple in-memory counter per Function instance), since `express-rate-limit`'s request-count model does not apply to a single long-lived upgrade.

**Rationale**: Consistent with the existing per-router convention; the WebSocket-specific cap prevents a single misbehaving client from opening unbounded concurrent connections against one instance.

## 13. `firestore.rules` — left unchanged, deliberately

**Decision**: No change to any existing client-facing Firestore security rule for the collections this feature touches (`retrospectives`, `cards`, `groups`, `actionItems`, `facilitatorNotes`, `sentimentResults`, `participants`, `typingStatus`, `countdown_timers`).

**Rationale**: Identical reasoning to `018` research.md §13 — the backend's `firebase-admin` access bypasses rules by design regardless of the client-facing rule's current shape, so this feature's guarantees (FR-001, FR-002, FR-020) hold independent of it; auditing/tightening rules across every remaining direct consumer of these collections (there should be none left in-scope after this feature, but a repo-wide audit is a separate concern) is explicitly out of this feature's boundary.

## 14. Retiring the app-wide Firebase custom-token bridge's last dependent

**Decision**: Once this feature ships, `bootstrapSession()`'s Firebase custom-token sign-in (`backendAuthClient.ts`, kept alive since `014` specifically for "screens not yet migrated — such as real-time board collaboration", per `017`/`018`'s own Assumptions) has **no remaining in-scope consumer** in the application. Removing that bridge entirely is **not** part of this feature (it is a cross-cutting cleanup affecting app-wide bootstrap, not the retrospective board screen itself) but is flagged as a natural, low-risk follow-up once this feature is verified in production.

**Rationale**: Confirms this feature is the one that finally makes the bridge's continued existence unnecessary, closing the loop `017`/`018` explicitly left open — worth recording so the follow-up isn't lost, without expanding this feature's own scope to include it (Simplicity/YAGNI: removing a still-harmless, currently-relied-upon bridge is safest as its own small, easily-revertible change after this feature is confirmed stable).
