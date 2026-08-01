# Phase 0 Research: Reliable Backend-Mediated Access for Concurrent Retrospective Teams

This feature has no `NEEDS CLARIFICATION` markers in its Technical Context — the codebase
investigation performed during `/speckit-specify` and `/speckit-plan` already located the concrete
root causes and the exact files involved. This document records those findings as Decision /
Rationale / Alternatives, per Phase 0's format, so Phase 1 design and `/speckit-tasks` can proceed
directly from it.

## 1. Root cause of the HTTP 429 errors that block login under light concurrent use

**Decision**: The primary cause is that every `express-rate-limit` instance in the backend
(`authLimiter` in `auth.ts`, `boardsLimiter` in `boards.ts`, `profileLimiter` in `profile.ts`,
`retrospectiveLimiter` in `retrospectives.ts`, and `mcp.ts`'s token limiter) keys its 100–300
requests/15-minute window on `req.ip` using the library's default key generator, while the Express
app (`server/src/http/app.ts` / `api/index.ts`) never calls `app.set('trust proxy', ...)`. Running
behind Vercel's edge network, `req.ip`/`req.socket.remoteAddress` as seen by the Node process
reflects Vercel's own proxy hop, not each distinct browser's public address, unless `trust proxy`
is configured to read the standard forwarded-for header Vercel sets. Without it, many or all
concurrent users collapse into the same rate-limit bucket, so a handful of people's combined
ordinary traffic (page loads, `/api/auth/session` checks, WebSocket reconnect handshakes) is
enough to exhaust one shared bucket — after which *every* user, including someone trying to log in
for the first time, is rejected with 429. This precisely matches the reported symptom: login stops
working once a few teammates are already connected, with very little total traffic.

**Fix direction**: Configure `trust proxy` correctly for Vercel's proxy chain so `req.ip` reflects
each distinct client again. This alone resolves the common case (distinct home/office IPs). As a
second, independent layer — required by spec FR-002 and the edge case covering a whole team behind
one shared office/NAT IP — key the limiter for authenticated routes by the existing session
identity (`rr_session` cookie / user id) when a session is present, falling back to IP only for the
routes that necessarily precede a session (e.g. `/api/auth/login/:provider` itself). Limits/windows
are also resized to comfortably cover steady-state + reconnect-storm traffic for a 10-participant
team, not the much lower implicit assumption they were originally sized for.

**Rationale**: This is the smallest change that satisfies FR-001/FR-002/FR-003 (stop false
positives, keep real abuse protection, distinguish legitimate users) without replacing the
already-adequate `express-rate-limit` + per-router convention established by `014`/`017`/`018`/`019`.

**Alternatives considered**: Simply raising every limiter's numeric ceiling — rejected as treating
the symptom, not the cause; a high-enough ceiling might mask the shared-bucket bug at 10 users only
to reintroduce it at team sizes the product will grow into. A shared external store (Redis) for
rate-limit state — rejected as unnecessary; the bug is address attribution, not per-instance state
loss, and `auth.ts`'s existing comment already flags a shared store as a possible *future* need for
global limits, not something this fix requires.

## 2. `useRetrospectiveColumns.ts` — the standing "Firebase channel" connection

**Decision**: `src/features/boards/retrospective/hooks/useRetrospectiveColumns.ts` opens a live
`onSnapshot` listener directly against `retrospectives/{id}/columns` for as long as a board is open
in a browser tab — one standing Firestore Listen-channel connection per open board per participant.
It was explicitly scoped *out* of `019`'s migration (see
`src/test/architecture/retrospective-board-no-firestore.test.ts`'s `EXPECTED_REMAINING_OFFENDERS`
comment: "columns are seeded once at board creation... never written by this feature"). That
reasoning addressed writes, not reads — the read-path was left as a live Firestore listener even
though the data is static. Critically, `GET /api/retrospectives/:id` (`retrospectives.ts`'s
`serializeBoardState`) **already returns `columns`** as part of the single-request board state
(`RetrospectiveState.columns` in `backendRetrospectiveClient.ts`), and that state is already fetched
and kept current (via the existing WebSocket channel from `019`) through `BoardDataContext`. This
listener is confirmed the most likely source of the frequently-observed "petición a channel de
Firebase" — it is a real, currently-live, per-participant standing connection, unlike the
project's other remaining Firestore imports, which are dead code (§4).

**Fix direction**: Rewire `useRetrospectiveColumns` (and its consumers — `RetrospectiveBoard.tsx`,
`GroupableColumn.tsx`, `FacilitatorMenu.tsx`, `TeamMoodTab.tsx`, `ImprovedExportPopover.tsx`,
`BoardDataContext.tsx`) to read `columns` from the board state already provided by
`BoardDataContext`/`backendRetrospectiveClient.getBoardState`, instead of opening its own Firestore
connection. No new backend endpoint or WebSocket event type is required — the data already exists
in the payload this screen already fetches and keeps live.

**Rationale**: Lowest-risk, highest-impact fix available: it removes a genuinely live, per-tab
standing direct-to-Firebase connection using data the backend already serves, satisfying
FR-006/FR-007/FR-008 without adding any new surface area (Simplicity/KISS).

**Alternatives considered**: Adding a dedicated `columns` WebSocket event type mirroring the
existing card/group/timer events — rejected as unnecessary; columns are effectively static after
board creation (the reason `019` deprioritized them), so no live-update semantics are needed beyond
what a single already-fetched snapshot provides.

## 3. `UserProfileCache.ts` / `useEnrichedParticipants.ts` — a second, redundant direct-Firestore read

**Decision**: `useEnrichedParticipants.ts` (used by `ResponsiveParticipantDisplay.tsx`, rendered in
`RetrospectiveTopbar.tsx` on every board) calls `UserProfileCache.getProfiles()`, which
batch-reads the `users` collection directly from the browser via `firebase/firestore`'s
`getDoc`/`getDocs`, solely to attach each participant's `photoURL`. This duplicates data the
backend already provides: `ParticipantDTO` (`server/src/application/ports/retrospective.ts`) and
its serialization (`retrospectives.ts`'s `serializeParticipant`) already include `photoURL` per
participant, and the frontend's own `Participant` type
(`src/features/boards/types/participant.ts`) already declares `photoURL?: string | null`. This
file was carried forward from `019` as a documented `PERMANENT_EXCEPTIONS` entry ("this feature's
ports don't cover it, no UserPort exists") — but no new port is actually needed, because the data
it fetches is already present on the object it's enriching.

**Fix direction**: Delete `useEnrichedParticipants.ts` and `UserProfileCache.ts`; have
`ResponsiveParticipantDisplay.tsx` consume the `photoURL` already present on each `Participant` it
is passed, directly.

**Rationale**: Closes the last live direct-Firestore read with a deletion, not a new integration —
the simplest possible fix (Simplicity/KISS), and removes the one thing keeping the
`retrospective-board-no-firestore.test.ts` allowlist non-empty.

**Alternatives considered**: Building a small backend `UserPort`/endpoint to serve the same batch
profile lookup — rejected as solving a problem that doesn't exist once the redundancy is
recognized; would add a port, route, and client method for data already in hand.

## 4. `signInWithCustomToken` and the dead direct-Firebase code paths

**Decision**: `bootstrapSession()` (`src/features/auth/services/backendAuthClient.ts`) calls
`signInWithCustomToken(auth, result.firebaseCustomToken)` directly against Firebase Auth on every
app load for every authenticated user. Its own inline comment in `UserContext.tsx` states its sole
purpose: "so Firestore keeps working for screens outside this feature's scope" — i.e., it exists
only to satisfy Firestore security rules for the direct client reads in §2 and §3. Once those are
migrated, no browser code depends on an authenticated Firebase client context anymore, and this
call can be removed. Separately, a set of files still import `firebase/firestore` directly but have
**zero live callers** in the rendered app today (confirmed by repo-wide import search, not just the
existing architecture test's assumptions, which were stale on this point):
`useCards.ts` → `cardService.ts` + `cardInteractionService.ts` (only reachable via the also-unused
`CreateCardForm.tsx`); `useParticipants.ts` → `participantService.ts` (only reachable via the also-
unused `JoinPanelForm.tsx`); plus `OptimizedRetrospectiveService.ts` and `useFirestore.ts` (both
`firebase/firestore`-importing, zero non-test importers), and `migrateUserProviders.ts` (same).
`FirestoreListenerManager.ts` is also dead code with zero non-test importers, but — verified
directly — it contains **no `firebase/firestore` import at all**; it is a generic reference-counted
listener registry (takes an arbitrary `() => () => void` callback), so it is not itself a
direct-Firebase file and would not be caught by the architecture test in §6 regardless of its
allowlists. It is still included in this feature's dead-code removal as ordinary hygiene (Simplicity
— no reason to keep an unused abstraction), not because FR-006/FR-007 require it. (A file named
`ImprovedParticipantService.ts`, initially assumed to exist alongside its test
`ImprovedParticipantService.test.ts`, was checked directly and does **not** exist on disk — only the
orphaned test remains, already dead weight from some earlier, incomplete cleanup; it is removed for
the same hygiene reason, not as a "direct Firebase" file.)

**Fix direction**: Remove the `signInWithCustomToken` call from `bootstrapSession()` (the
emulator-only `window.__e2eSignIn` hook in `firebase.ts`, gated behind `useEmulator`, is unaffected
since it never runs in production). Delete the confirmed-dead files outright, following the same
precedent `019`'s research.md already set for dead code (e.g. `typingStatusService.ts`) — leaving
them in place risks a future silent regression per spec FR-007 and the corresponding edge case.

**Rationale**: Completes FR-005/FR-006/FR-007: after this, zero application code capable of
contacting Firebase directly from the browser remains reachable *or* present, for both
authentication and retrospective board data. It also directly reduces the concurrent request volume
against Firebase's own API-key-scoped quota at the moment most likely to matter (many teammates
loading the app around the same time), independent of the backend rate-limiter fix in §1.

**Alternatives considered**: Leaving the dead files in place with a code comment warning against
reconnecting them — rejected; the existing architecture test already shows that allowlists silently
go stale (its own `EXPECTED_REMAINING_OFFENDERS` no longer matched reality), so deletion is the more
reliable guarantee, consistent with `019`'s own precedent and this project's Simplicity principle.

## 5. Preserving the existing push-based live-update channel

**Decision**: The WebSocket-based real-time channel built in `019`
(`GET /api/retrospectives/:id/live`, `FirestoreRealtimeGatewayAdapter`, `backendRealtimeClient.ts`,
`useRetrospectiveRealtimeSync.ts`) already satisfies this feature's push-not-polling requirement
(FR-008) and its 2-second p95 delivery target (FR-009) for cards, groups, action items, the timer,
typing indicators, and participants. No `setInterval`/polling loop exists anywhere in this data
path. This feature does not replace or redesign that channel; it (a) folds `columns` into the
already-fetched board-state payload rather than adding a new event type (§2), and (b) ensures the
channel's existing reconnect-with-backoff behavior (`backendRealtimeClient.ts`) cannot itself
trigger the rate-limiter false positives fixed in §1 — reconnects perform a REST resync
(`getBoardState`) plus a new upgrade request, both of which must be classified as legitimate,
per-session traffic once §1 ships, not summed into an unrelated shared bucket.

**Rationale**: Directly answers the user's request ("push o... websockets, lo que consideres más
óptimo") by confirming and hardening the mechanism already chosen and built for this exact purpose,
rather than introducing a second, competing real-time mechanism — consistent with this feature's
Assumptions.

**Alternatives considered**: None re-evaluated here; `019`'s research.md §1 already compared
WebSocket against SSE and polling and the reasoning still holds. Re-litigating transport choice
would be scope creep beyond this feature's actual bug (throttling + residual direct-Firebase
reads), not a request to redesign a mechanism that already works.

## 6. Regression guard

**Decision**: `src/test/architecture/retrospective-board-no-firestore.test.ts` already exists as a
static import-boundary test enforcing "no new `firebase/firestore` import outside an explicit
allowlist." This feature empties both its `EXPECTED_REMAINING_OFFENDERS` list (§2, §4 close the
last live offenders) and its `PERMANENT_EXCEPTIONS` list (§3 closes the one previously
irreducible exception), so the test becomes a true zero-tolerance guard going forward — matching
FR-007's requirement that no such path can be silently reintroduced.

**Rationale**: Reuses an existing, already-proven verification mechanism instead of inventing a new
one (Simplicity, Prefer Proven approach already established in this codebase).
