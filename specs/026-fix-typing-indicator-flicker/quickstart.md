# Quickstart: Validating the Typing Indicator Flicker Fix

Prerequisites: repo checked out on `026-fix-typing-indicator-flicker`, dependencies installed (`npm install` inside `retro-rocket/`), Firebase emulators available (`firebase-tools` is already a devDependency).

## 1. Automated checks

```bash
# Frontend unit tests (OptimizedTypingStatusService, useTypingStatus, TypingPreview)
npm run test:run

# Frontend coverage gate (Constitution VI — must stay at/above vitest.config.ts thresholds)
npm run test:coverage

# Backend unit tests (FirestoreRealtimeGatewayAdapter's sweep constants)
npm run test:server

# E2E (Constitution VII) — requires the Firestore/Auth emulators
npm run e2e
```

All of the above must pass before this feature is considered done. New/changed test files per plan.md's Project Structure section:
- `src/test/features/boards/retrospective/OptimizedTypingStatusService.test.ts` (modified — replaces the 300ms-auto-deactivate assertion with one proving no auto-deactivation occurs)
- `src/test/features/boards/retrospective/useTypingStatus.test.ts` (modified — inactivity timeout assertion updated to 3000ms)
- `src/test/lib/components/ui/TypingPreview.test.tsx` (added/modified — live region role/aria-live/aria-atomic and text-mirroring assertions)
- `e2e/retrospective-board.spec.ts` (modified — the existing typing-indicator test extended for no-flicker and accessibility)

## 2. Manual validation — User Story 1 (stable indicator while typing continues)

1. Start the dev server (`npm run dev:server` in one terminal, `npm run dev` in another) against the Firestore emulator (`npm run emulators`).
2. Open the same retrospective board in two browser windows/profiles as two different signed-in participants (A and B).
3. On A, start adding a card and type continuously for 10+ seconds (a sentence with natural pauses under 3 seconds between words).
4. On B, watch the column A is typing in: confirm the "está escribiendo" indicator appears once and stays visible the entire time A keeps typing, with **no flicker** (no disappear/reappear cycle) — this is the core reported defect.

## 3. Manual validation — User Story 2 (indicator clears promptly and predictably)

1. Continuing from §2, have A stop typing (stop pressing keys, do not submit/cancel/blur).
2. On B, confirm the indicator disappears within roughly 3 seconds of A's last keystroke and does not reappear on its own.
3. Repeat, but this time have A submit the card (or cancel) instead of just pausing — confirm B sees the indicator disappear promptly, without waiting the full 3 seconds.
4. Repeat, but this time close A's browser tab entirely mid-typing (simulating a disconnect) — confirm B sees the indicator disappear within a few seconds (server sweep bound, §5 below).

## 4. Manual validation — User Story 3 (multiple simultaneous typists)

1. With three participants (A, B, C) on the same board, have A and B both start typing in the same column at overlapping but offset times.
2. On C, confirm both A and B appear as typing.
3. Have A stop (per §3) while B keeps typing. Confirm C sees only B remain, and B's indicator does not flicker as a side effect of A's state change.

## 5. Manual validation — User Story 4 (accessible announcement)

1. Enable a screen reader (VoiceOver on macOS, NVDA on Windows) or use the browser's accessibility inspector to watch the live region.
2. Repeat §2: as A starts typing, confirm the screen reader announces that A is typing (or the accessibility inspector shows the live region's text updating) without needing to navigate to the indicator manually.
3. While A keeps typing with no change in the typist set, confirm no repeated/duplicate announcements occur.
4. As A stops (per §3), confirm the live region's content clears in step with the visual indicator — no stale "is typing" announcement is left behind.
5. Run the axe-core accessibility check added to `e2e/retrospective-board.spec.ts` and confirm no new violations are introduced by the live region.

## 6. Regression check — wire protocol and unrelated behavior unchanged

- `POST /api/retrospectives/:id/typing` request/response shape is unchanged — inspect network traffic during §2–§4 and confirm no new fields.
- The WS `entity_change` event shape for `entity: "typingStatus"` is unchanged — only its frequency/timing changes (see `contracts/typing-status-timing-delta.md`).
- The board-deletion cascade test (`e2e/retrospective-board.spec.ts`, "deleting a board cascade-deletes ... typing status") still passes unmodified — confirms the Firestore doc shape and deletion path are untouched.
- No new client-side polling loop is introduced — confirm via the browser's network panel that no new fixed-interval request pattern appears during idle periods (SC-004).
