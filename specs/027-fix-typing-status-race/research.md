# Phase 0 Research: Fix Typing Indicator Ghost State on Column Switch

No items in Technical Context were left as `NEEDS CLARIFICATION` — the two scope-impacting decisions (failure handling during ordering; the 1s settle bound) were already resolved in the spec's `/speckit-clarify` session. What follows is the code-level investigation confirming the root cause and choosing a fix approach.

## 1. Root cause (confirmed)

**Decision**: The defect is an unordered write race in `OptimizedTypingStatusService.setTypingStatusDebounced` (`src/features/boards/retrospective/services/OptimizedTypingStatusService.ts:15-17`). Every call — `isActive:true` on each throttled keystroke, `isActive:false` on stop — fires `backendRetrospectiveClient.setTypingStatus(...)` immediately and independently, with no `await` linking one call to the next and no mechanism preventing two in-flight requests for the *same* participant+column from completing out of issuance order.

**Evidence**: The failing E2E test (`e2e/retrospective-board.spec.ts:596`) shows `locator('span.text-blue-700').filter({ hasText: /está escribiendo/ })` resolving to 2 elements at once — both belonging to the visible typing card (not the accessible live region), meaning two different columns simultaneously rendered "typing" for the same single participant. The only way that happens given the doc model (`typingStatusDocId = {retroId}_{userId}_{column}`, `isActive:false` → `docRef.delete()`, per `FirestoreTypingStatusAdapter.ts:13-44`) is if a `true` write for the abandoned column reached Firestore *after* the `false` write that was supposed to clear it, recreating the doc.

**Why this is more visible now than before feature 026**: prior to `c80297c`, `OptimizedTypingStatusService` carried its own unconditional 300ms auto-deactivation timer, which self-corrected any resurrected state almost immediately (at the cost of the flicker that 026 fixed). Removing that timer (026, research.md §2) was the correct fix for the flicker, but it also removed the thing that had been incidentally masking this pre-existing ordering race — now a resurrected "ghost" doc survives up to the full ~3.5s disconnect-safety TTL window (`FirestoreRealtimeGatewayAdapter.ts:15-21`) instead of ~300ms.

**Alternatives considered**: None — this is a confirmed root cause via direct code inspection and reproduction in CI, not a hypothesis requiring further investigation.

## 2. Fix approach: per-key FIFO write queue

**Decision**: Add a small per-key (`{retrospectiveId}_{column}`) promise queue inside `OptimizedTypingStatusService`. `setTypingStatusDebounced` looks up any pending promise for that key; if none, it fires the write immediately (preserving today's synchronous-call behavior for the common, non-overlapping case — required so existing tests in `OptimizedTypingStatusService.test.ts` that assert `mockSetTypingStatus` was called synchronously right after invocation keep passing unmodified). If a write for that key is still in flight, the new call is chained onto it via `.then()`, so it is only sent to the server once the prior one has settled — guaranteeing server-observed order matches client-issued order for that key, regardless of individual request latency.

**Rationale**: This is the minimal change that satisfies FR-001/FR-002/FR-003 without touching the wire protocol, the doc model, or any other consumer of `typingStatuses` — consistent with the "no wire-protocol change" constraint the spec's Assumptions section carries forward from feature 026. It requires no new dependency (Constitution III/V) and keeps the service's existing single responsibility (write-forwarding) intact, just extended to also guarantee order (Constitution IV).

**Alternatives considered**:
- *Sequence numbers + last-write-wins on the server*: the server would need to track a monotonic counter per participant+column and reject/ignore any write with a lower sequence number than the last one applied. Rejected: requires a `TypingStatusPort`/`FirestoreTypingStatusAdapter` schema change (a new field) and server-side comparison logic, a materially larger diff for the same outcome the client-side queue already achieves, and would touch the "no wire-protocol change" boundary the spec deliberately keeps closed.
- *`AbortController` cancellation of in-flight requests*: when a new write for a key is issued, abort any still-pending request for that key. Rejected: doesn't actually fix the race — an aborted HTTP request may have already been processed server-side before the abort signal arrives (fire time vs. abort time on the client says nothing about server processing time), so this only reduces the *probability* of the race, not eliminates it, and adds meaningful complexity (partial-failure handling, distinguishing "aborted" from "genuinely failed" in the existing `try/catch`).
- *Debounce all writes for a key behind a single trailing-edge timer* (e.g., only send the *last* call within a short window): rejected — reintroduces exactly the kind of independent timer that caused the original flicker bug (026, research.md §1); the hook (`useTypingStatus`) is already the single owner of *when* to write, per 026's design — adding a second timing layer back into the service would violate that established SRP boundary.
- *Always `await` every write from the caller (`useTypingStatus`) instead of queuing inside the service*: rejected — `startTyping`/`stopTyping` are synchronous callbacks invoked from React event handlers (`onChange`, `onClick`, `onBlur`); making them `async` and awaiting each write would block the UI thread's perceived responsiveness on network latency for no benefit the service-internal queue doesn't already provide, and would leak a service-layer concern (network round-trip timing) into the hook, again crossing the SRP boundary 026 established.

## 3. Failure handling within the queue

**Decision**: Per the clarification recorded in spec.md (FR-007), if the write at the front of a key's queue fails (the existing `try/catch` around `setTypingStatus(...)` catches it), the queue proceeds immediately to the next queued write rather than retrying. This is implemented by chaining the *next* write on the *settlement* (not just the success) of the previous one — i.e., using a `.finally()`/`.catch()`-tolerant chain so a rejected promise doesn't halt the queue.

**Rationale**: Matches today's error-handling posture exactly (the existing `setTypingStatusImmediate` already swallows errors into `console.error`, never rethrowing to a caller that could retry) and avoids introducing new retry/backoff logic for a case the existing disconnect-safety TTL sweep (FR-004) already bounds to ~3.5s worst case — consistent with Constitution V (Simplicity/YAGNI): don't build a second correction mechanism when one already exists and already meets the requirement.

**Alternatives considered**:
- *Retry the failed write before advancing the queue* — rejected per the clarification: risks a single slow/failing request stalling all subsequent typing signals for that column indefinitely (no bounded retry budget was requested or justified), trading a bounded ~3.5s worst case for an unbounded one.

## 4. Test strategy

**Decision**: Extend `src/test/features/boards/retrospective/OptimizedTypingStatusService.test.ts` with a deferred-promise mock of `setTypingStatus` (each call returns a promise the test resolves manually, in a controlled order) to prove: (a) a `true` call for column A followed by a `false` call for column A only reaches the mock for the `false` after the `true`'s promise has settled, even if the test resolves them out of program order; (b) a rejected promise for the first queued write does not prevent the second queued write for the same key from firing; (c) calls for *different* keys remain independent and unqueued relative to each other (no cross-column serialization, preserving today's behavior for the non-conflicting case). The existing E2E test (`e2e/retrospective-board.spec.ts:596`) remains the acceptance-level regression gate (FR-006) and requires no changes — it already encodes the exact scenario this fix targets.

**Rationale**: Per Constitution I (TDD, NON-NEGOTIABLE), these unit test cases must be written first (red), then the queue implemented to turn them green, before turning to the already-red E2E test as final confirmation.

## 5. Regression surface

**Decision**: No change to `POST /api/retrospectives/:id/typing`, `SetTypingStatus` use case, `TypingStatusPort`/`FirestoreTypingStatusAdapter` (doc shape, doc id pattern, `isActive:false` → delete semantics), `FirestoreRealtimeGatewayAdapter`'s TTL/sweep constants, the WS `typingStatus` `entity_change` event shape, `useRetrospectiveRealtimeSync`'s `applyTypingStatusChange` reducer, `useTypingStatus`'s throttle/inactivity constants, or `TypingPreview.tsx`'s rendering/accessibility behavior. The fix is confined to `OptimizedTypingStatusService`'s internal write-ordering, plus its own unit tests.

**Rationale**: Confirms the Technical Context's "no wire-protocol change" claim — this is a pure client write-ordering fix, the smallest change that resolves the confirmed race.
