# Quickstart: Validate the Typing Indicator Ordering Fix

## Prerequisites

- From `retro-rocket/`: `npm install` (if not already done).
- Firebase CLI available for the emulator (already a project dependency, used by `npm run e2e`).

## 1. Unit tests (fast inner loop — TDD red/green)

```sh
cd retro-rocket
npm run test:run -- OptimizedTypingStatusService
```

**Expected before the fix**: the new ordering/failure-handling test cases (added per research.md §4) fail — a `false` write for a key can be observed by the mock before an earlier, still-pending `true` write for the same key settles.

**Expected after the fix**: all cases pass, including:
- Writes for the same `{retrospectiveId, column}` key reach the mock in issuance order even when the test resolves their underlying promises out of order.
- A rejected write for a key does not block the next queued write for that same key.
- Writes for different keys remain independent (no unnecessary cross-column serialization).

Run the full suite with coverage to confirm the 80% floor (Constitution VI) still holds:

```sh
npm run test:coverage
```

## 2. End-to-end regression (the originally failing test)

```sh
cd retro-rocket
npm run e2e -- -g "typing indicator appears live for a second participant"
```

**Expected before the fix**: fails with a Playwright strict-mode violation — two elements matching `está escribiendo` for the same participant (the reported CI failure on `main`).

**Expected after the fix**: passes consistently. Per SC-001, run it 20 times back-to-back locally (or accumulate that count across CI re-runs) to build confidence beyond a single green run, since this was a timing-sensitive race:

```sh
for i in $(seq 1 20); do npm run e2e -- -g "typing indicator appears live for a second participant" || break; done
```

Also confirm the pre-existing flicker-under-delay regression test still passes (FR-005/SC-004 — this fix must not reintroduce the flicker that feature 026 already resolved):

```sh
npm run e2e -- -g "does not flicker for the other participant under a brief simulated network delay"
```

## 3. Full gate parity with CI

```sh
cd retro-rocket
npm run type-check
npm run lint
npm run test:coverage
npm run e2e
```

All four MUST pass before this fix is considered complete, matching the constitution's merge-blocking CI gates (type-check, lint, test-with-coverage, Playwright E2E).

## Manual sanity check (optional)

1. `npm run dev:all` (starts web + API dev servers) and `npm run emulators` in a separate terminal.
2. Open the same board in two browser windows as two different participants.
3. In window A, start typing in one column, then quickly cancel/clear and start typing in a different column.
4. In window B, confirm the "está escribiendo" indicator is only ever shown in one column at a time for participant A, with no flash of it appearing in both.
