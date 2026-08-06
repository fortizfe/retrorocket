# Contract Delta: Typing Status Timing & Accessibility

This documents only what changes on top of the base real-time protocol established in `specs/019-retro-board-backend-access/` (WS `entity_change` events) and the existing `POST /api/retrospectives/:id/typing` route. **No wire-protocol change** — every request/response shape, WS event shape, and Firestore document shape is unchanged. This delta is entirely about *when* the client writes and *how quickly* other viewers see the effect, plus one additive, non-visual accessibility surface.

## `POST /api/retrospectives/:id/typing` *(request/response shape unchanged)*

**Behavior change**: the client-side cadence of calls to this endpoint changes, not the endpoint itself.

| Scenario | Before | After |
|---|---|---|
| User keeps typing continuously in a column | Alternates `isActive:true` / `isActive:false` roughly every throttle window (2000ms), because of the flawed 300ms auto-off — this is the reported bug | Sends `isActive:true` once when typing starts, then a refresh `isActive:true` at most once per 2000ms while typing continues — never sends `isActive:false` while the user is still actively typing |
| User stops typing without an explicit action (submit/cancel/blur/empty) | Backend already receives spurious `isActive:false` calls mid-typing (the bug); a "real" stop was indistinguishable from the flicker | Backend receives exactly one `isActive:false` call, 3000ms after the last keystroke |
| User submits, cancels, empties the textarea, blurs, or the component unmounts | Sends `isActive:false` immediately (unchanged) | Unchanged — still immediate |

## WS `entity_change` (`entity: "typingStatus"`) *(event shape unchanged)*

**Behavior change**: viewers stop seeing a rapid `created`→`deleted`→`created`→`deleted` flicker sequence for a single continuous typing session; they see one `created`/`updated` event when typing starts (and at most one refresh `updated` per 2000ms while it continues), then exactly one `deleted` event when the user actually stops (client-explicit) or after the server's safety-net sweep detects a stale doc (disconnect case, see below).

| Scenario | Before | After |
|---|---|---|
| Continuous typing, connected the whole time | Repeated `created`/`deleted` pairs roughly every 2s (the bug) | One `created`, then zero or more `updated` refreshes, no `deleted` until typing actually stops |
| User disconnects while marked as typing (tab closed, network lost, crash) | `deleted` event delivered once the server's sweep detects the doc is older than 5000ms (checked every 1000ms — worst case ~6s) | `deleted` event delivered once the server's sweep detects the doc is older than 3000ms (checked every 500ms — worst case ~3.5s) |

## New: accessible status announcement *(client-only, no wire change)*

Not a network contract — a DOM contract for `TypingPreview.tsx`. A `role="status"`/`aria-live="polite"`/`aria-atomic="true"` element is always present in the DOM (even when no one is typing, with empty content), carrying the same text the visible card renders. Assistive technology receives one announcement per actual state change (participant set starting/stopping/changing for a column), never a duplicate for an unchanged state, and never an announcement caused by the flicker this feature removes.

## Unchanged

- `GET /api/retrospectives/:id/live` (WS upgrade), heartbeat ping/pong, reconnect/backoff behavior — untouched.
- Firestore `typingStatus` document shape and doc-id pattern (`{retroId}_{userId}_{column}`) — untouched.
- Every other entity's `entity_change` contract (`card`, `group`, `actionItem`, `timer`, `participant`, `retrospective`, `facilitatorNote`) — untouched.
