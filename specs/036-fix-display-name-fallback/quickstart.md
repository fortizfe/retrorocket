# Quickstart: Validate the Configured Display Name Fix

## Prerequisites

- From `retro-rocket/`: `npm install` (if not already done).
- Firebase CLI available for the emulator (already a project dependency, used by `npm run e2e`).

## 1. Unit tests (fast inner loop — TDD red/green)

```sh
cd retro-rocket
npm run test:server -- boards.test
npm run test:server -- retrospectives.test
```

**Expected before the fix**: the new test cases (added per research.md §4) fail — a session seeded with `displayName: 'Raw OAuth Name'` and a profile seeded with `displayName: 'Configured Name'` produce a created board/card/participant/like/reaction/typing-status record carrying `'Raw OAuth Name'` instead of `'Configured Name'`.

**Expected after the fix**: all cases pass — every affected record carries the seeded profile's `displayName`.

Run with coverage to confirm the 80% floor (Constitution VI) still holds:

```sh
npm run test:server:coverage
```

## 2. End-to-end regression (the originally reported scenario)

```sh
cd retro-rocket
npm run e2e -- -g "configured display name"
```

**Expected before the fix**: fails — a card/participant on a brand-new board shows the raw test-login name instead of the name set via `PATCH /api/profile` beforehand.

**Expected after the fix**: passes — the card's author label and the participant list both show the configured name immediately, with no reload and no rename event needed (this is the key difference from the already-passing rename-propagation test at `retrospective-board.spec.ts:440`, which only covers renaming *after* content exists on an *existing* board).

Also confirm the existing display-name regression suite (specs 020/022) still passes, since this fix must not reintroduce any previously-fixed defect:

```sh
npm run e2e -- -g "display name|departed|group-by-user|renaming a participant"
```

## 3. Manual reproduction of the original bug report (optional)

1. `npm run dev:all` (starts web + API dev servers) and `npm run emulators` in a separate terminal.
2. Sign in, go to "Mi Perfil", and set a display name that differs from your Google/GitHub account's name (e.g. a nickname).
3. Create a brand-new retrospective board and write a card.
4. **Before the fix**: the card shows your raw Google/GitHub full name. **After the fix**: the card shows the nickname you configured.

## 4. Full gate parity with CI

```sh
cd retro-rocket
npm run type-check
npm run type-check:server
npm run lint
npm run test:coverage
npm run test:server:coverage
npm run e2e
```

All MUST pass before this fix is considered complete, matching the constitution's merge-blocking CI gates (type-check, lint, test-with-coverage, Playwright E2E).
