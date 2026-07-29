# Quickstart: Validate Display Names on Retro Board Cards

**Feature**: [spec.md](./spec.md) | **Data model**: [data-model.md](./data-model.md) | **Contract**: [contracts/cards-api.md](./contracts/cards-api.md)

Manual/exploratory validation guide for confirming the fix end-to-end. Automated coverage (unit + Playwright E2E) is sequenced separately in `tasks.md` per the constitution's TDD and E2E requirements — this guide is for a human (or an agent driving a real browser) to confirm the feature actually works.

## Prerequisites

- Firebase emulators running (`auth`, `firestore`) — same setup already used by the existing Playwright suite (`firebase emulators:exec --only auth,firestore "playwright test"` in `retro-rocket/playwright.config.ts`).
- Frontend dev server and backend dev server running (`retro-rocket/`, both `src/` and `server/`).
- At least two distinct signed-in test accounts with different display names (e.g. "Jane Smith" and "Alex Chen") able to join the same retrospective board.

## Scenario A — New cards capture and display the author's name

1. Sign in as "Jane Smith" and open a retrospective board.
2. Create a new card in any column.
3. Inspect the network response for the `POST /api/retrospectives/:id/cards` call — confirm the response body includes `"createdByName": "Jane Smith"` alongside `"createdBy": "<uid>"`.
4. Confirm the card's author label (visible without any special grouping mode) shows "Jane Smith" — not the raw uid.

**Expected**: FR-002, FR-005 satisfied; matches [contracts/cards-api.md](./contracts/cards-api.md).

## Scenario B — Group headers show names, sorted alphabetically

1. With cards created by both "Jane Smith" and "Alex Chen" present on the board, switch the column grouping mode to "by user".
2. Confirm each group header shows the author's display name (not a raw uid).
3. Confirm the groups appear in alphabetical order: "Alex Chen" before "Jane Smith".

**Expected**: FR-001, FR-004 satisfied.

## Scenario C — Distinct participants with the same display name stay separate

1. Set up two different test accounts that both have the display name "Sam Lee" (different uids).
2. Have each create at least one card.
3. Group by user and confirm two separate "Sam Lee" groups appear (one per author), each containing only that author's cards — cards are not merged.

**Expected**: FR-003 satisfied.

## Scenario D — Author who has left the retrospective still shows their real name

1. As "Jane Smith", create a card, then leave/close the retrospective session so she's no longer an active participant.
2. Reload the board as a different signed-in user.
3. Confirm Jane's card (in both the per-card label and the "group by user" header) still shows "Jane Smith" — not a generic "unknown user" fallback and not her uid.

**Expected**: FR-005 satisfied — name persists because it was captured at creation time, independent of live participant presence.

## Scenario E — Legacy card (no captured name) falls back correctly

1. Using the Firestore emulator, seed (or reuse) a card document that predates this fix — i.e., has `createdBy` but no `createdByName`.
2. **While the author is still an active participant**: reload the board and confirm the card/group shows the author's name, resolved from the live `participants` list.
3. **After the author also leaves** (no longer in `participants`): reload the board and confirm the card/group shows the generic, localized fallback label (e.g. an "unknown user" style string) — never the raw uid, never a blank or broken label.

**Expected**: FR-006 satisfied; resolution order matches [data-model.md](./data-model.md#resolvedauthorgroup-new-internal-view-model-rendering-only).

## Scenario F — Cards with no author at all (existing behavior preserved)

1. If reachable in this app (e.g. via a seeded card with no `createdBy`), confirm the existing "no author" UI treatment is unchanged — no raw identifier, no regression.

**Expected**: FR-007 satisfied.

## Success criteria mapping

| Success Criterion | Verified by |
|---|---|
| SC-001 (100% of group headers show names) | Scenarios B, C, D, E |
| SC-002 (100% of per-card labels show names/fallback) | Scenarios A, D, E, F |
| SC-003 (at-a-glance attribution) | Scenarios B, C |
| SC-004 (alphabetical group order) | Scenario B |
