# Quickstart: Validating Anonymous Board Mode

Prerequisites: Firebase emulator suite configured (as used by `npm run e2e`), repo dependencies installed (`npm install` at `retro-rocket/`). Most scenarios need **two browser sessions** signed in as different users — one acting as the board's facilitator (creator), one as an ordinary participant — since this feature's core value is what *other* participants see.

## 1. Run the backend and frontend together against the emulator

```bash
cd retro-rocket
npm run emulators &        # firebase emulators:start --only auth,firestore
npm run dev:all            # vite (frontend) + vite-node --watch server/src/dev-server.ts (backend)
```

## 2. Create a board with the anonymity choice (User Story 1, FR-001, FR-002, SC-001)

1. Sign in as User A. Open the create-board flow for any template.
2. **Expected**: a clearly labeled anonymity control is present, defaulted to **off**.
3. Leave it at the default, create the board. Open it — card author names behave exactly as today.
4. Create a second board, this time switching the control **on** before creating. Open it — confirm it opens already anonymous (no author names, per §3 below).
5. Repeat for at least one other board template — confirm the control is present and behaves identically regardless of template (FR-001).

## 3. Participate in an anonymous board (User Story 2, FR-003–FR-007, SC-002, SC-003)

With the anonymous board from step 2.4 open in two sessions (A = facilitator, B = participant):

1. Have both A and B add a few cards. **Expected**: no card, in either session, shows an author name or any other identifying label — including in A's own (facilitator) view (spec Clarification: no role-based exception).
2. Open a column's grouping menu in either session. **Expected**: only "no grouping" and "suggested groupings" are offered — "group by user" is absent, not merely disabled.
3. Exercise every other card/board interaction from both sessions — create, edit, vote, like, comment/react, drag/reorder, delete a card; start/pause the facilitator timer. **Expected**: every one of these behaves identically to a non-anonymous board (no error, no different outcome) — only the author label and the grouping option differ.
4. Repeat steps 1–2 against the **non-anonymous** board from step 2.3 as a control — confirm author names and "group by user" still appear exactly as before this feature shipped.

## 4. Facilitator toggles anonymity live (User Story 3, FR-008–FR-011, SC-004)

With the **non-anonymous** board from step 2.3 open in two sessions (A = facilitator, B = participant):

1. In B's session, set a column's grouping to "group by user" — confirm B can see it grouped by author.
2. In A's session, open the facilitator menu and switch the board to anonymous.
3. **Expected in B's session, without reloading**: within ~2 seconds, card author names disappear, the persistent anonymity indicator appears, and the column B set to "group by user" now displays ungrouped, with "group by user" no longer offered in its menu (FR-010).
4. In A's session, switch the board back to non-anonymous.
5. **Expected in B's session, without reloading**: author names and the indicator's absence return, and — with no action from B — the same column automatically shows grouped by user again (the choice was preserved, never overwritten — research.md §5).
6. As User B (non-facilitator), attempt `PUT /api/retrospectives/:id/anonymity` directly (e.g. via a REST client or DevTools). **Expected**: `403 Forbidden`, and the facilitator-menu control itself is not rendered in B's UI at all (FR-011).

## 5. Exports reflect the current mode (FR-012, SC-006)

1. With the board from step 4 currently **anonymous**, export it as TXT, DOCX, and PDF. **Expected**: none of the three files include a per-card author line.
2. Switch the board back to non-anonymous and export again in all three formats. **Expected**: all three now include the author line, exactly as before this feature.

## 6. Legacy boards default correctly (spec Clarification, FR-002)

1. Using an existing board created before this feature (or a Firestore document with no `isAnonymous` field, via the emulator UI), open it.
2. **Expected**: it behaves as non-anonymous — author names and "group by user" appear exactly as they did before this feature, with no migration step run.

## 7. Automated checks

```bash
npm run test:server           # backend unit tests: new setAnonymous adapter method/use-case, extended createBoard, extended route
npm run test:run              # frontend unit tests: extended backendRetrospectiveClient/backendBoardsClient, CardHeader/GroupableColumn conditionals, facilitator-menu toggle, indicator, export services
npm run type-check:server && npm run type-check
npm run lint
npm run e2e                   # Playwright: create-anonymous-board, participate-anonymous, facilitator-toggle-live (two contexts), export-anonymous
```

All must pass, and coverage thresholds (80% branches/functions/lines/statements) must hold, per constitution Principles I, VI, VII.

## 8. Accessibility spot-check (constitution Principle VIII)

1. With a board anonymous, tab through the facilitator menu's toggle and confirm it's keyboard-operable with a visible focus ring and a correct accessible name/state (matches `ActionColumnToggle`'s existing pattern).
2. Confirm the persistent anonymity indicator conveys its state via text, not color/icon alone, and passes 4.5:1 contrast in both light and dark themes.
