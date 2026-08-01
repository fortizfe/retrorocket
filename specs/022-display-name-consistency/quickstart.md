# Quickstart: Validate Consistent Display Name Resolution

**Feature**: [spec.md](./spec.md) | **Data model**: [data-model.md](./data-model.md) | **Contract**: [contracts/display-name-resolution.md](./contracts/display-name-resolution.md)

Manual/exploratory validation guide. Automated coverage (unit + Playwright E2E) is sequenced separately in `tasks.md` per the constitution's TDD and E2E requirements — this guide is for a human (or an agent driving a real browser) to confirm the feature works end-to-end.

## Prerequisites

- Firebase emulators running (`auth`, `firestore`).
- Frontend dev server and backend dev server running (`retro-rocket/`, both `src/` and `server/`).
- Two browser sessions (or two browser profiles) signed in as two distinct test accounts, e.g. "Jane Smith" and "Alex Chen", both joined to the same retrospective board at the same time.

## Scenario A — A rename propagates live to a board another participant already has open (FR-001, FR-001a, FR-007, SC-002)

1. In session 1, sign in as "Jane Smith," join a board, and create a card, like another card, and react to a card.
2. In session 2 (a different account), open the same board and confirm Jane's card author label, like tooltip, reaction tooltip, and participant-list entry all show "Jane Smith."
3. Without reloading session 2, go to session 1's Profile page and change the display name to "Jane S.," then save.
4. **Without reloading session 2**, confirm every one of those same surfaces (card author label, like tooltip, reaction tooltip, participant list) updates to "Jane S." live.

**Expected**: FR-001, FR-001a, FR-007, SC-002 satisfied. Network tab in session 1 should show a single `PATCH /api/profile` call; no extra polling request should be needed in session 2 for the name to update.

## Scenario B — Group-by-user headers resolve and sort by the current name (FR-001, FR-011)

1. With cards from both "Jane S." and "Alex Chen" present, switch grouping to "by user."
2. Confirm both group headers show display names (not raw ids), sorted alphabetically ("Alex Chen" before "Jane S.").

**Expected**: FR-001, FR-011 satisfied.

## Scenario C — Distinct participants sharing a display name stay separate (FR-006, SC-005)

1. Set up two different test accounts that both have the display name "Sam Lee" (different uids), each creating at least one card, one like, and one reaction.
2. Confirm group-by-user shows two distinct "Sam Lee" groups, each correctly attributed, and confirm like/reaction tooltips distinguish them by not merging their interactions into one count.

**Expected**: FR-006, SC-005 satisfied.

## Scenario D — Content whose author has "left" (no participant record refresh needed to stay correct) (FR-001a)

1. As "Jane S.," create a card, then close that session (do not explicitly leave/remove — there is no such feature).
2. From session 2, reload the board and confirm Jane's card, like, and reaction still show "Jane S." — the current name, not whatever was captured at creation time, even though she is no longer actively connected.

**Expected**: FR-001a satisfied — resolution does not depend on the author being currently online/connected, only on their account still existing.

## Scenario E — Author whose account "no longer exists" falls back to the captured name (FR-003, FR-004)

Since no account-deletion capability exists in this app yet (research.md §4), simulate this directly against the emulator:

1. Seed (or reuse) a card/like/reaction whose `createdByName`/`username` is set (e.g. "Old Name") but whose `userId` has **no** matching `participants` doc on this board (delete or never create that participant doc in the emulator).
2. Reload the board and confirm the card/like/reaction still shows "Old Name" — not a raw uid, not an error.
3. Additionally seed a card with neither `createdByName` nor a matching `participants` doc (simulating pre-`020` legacy data with a since-vanished author).
4. Reload and confirm this one shows the generic fallback label (`retrospective.grouping.unknownAuthor`) — never a raw uid, never a blank/broken label.

**Expected**: FR-003, FR-004 satisfied; resolution order matches [data-model.md](./data-model.md#resolvedisplayname-generalized-from-resolveauthordisplayname-srclibutilscardhelpersts).

## Scenario F — New user gets a provider-derived default name (FR-008, SC-004)

1. Connect a brand-new account via Google (or GitHub) without visiting the Profile page.
2. Create a card immediately.
3. Confirm the card's author label shows the name from the connected provider account, and confirm the Profile page shows that same name as the current, editable value.

**Expected**: FR-008, FR-009, SC-004 satisfied.

## Scenario G — Exported documents never contain a raw uid (FR-005, SC-001)

1. On a board containing: a card from a currently-active author, a card whose author has since renamed, and (if reachable via emulator seeding) a legacy/deleted-author card per Scenario E.
2. Export to TXT, PDF, and DOCX.
3. Open each exported file and confirm every "Autor: …" line shows a resolved display name (current, captured, or generic fallback per the same rules as the on-screen view) — grep/search the raw uid string in each exported file and confirm zero matches.

**Expected**: FR-005, SC-001 satisfied.

## Success criteria mapping

| Success Criterion | Verified by |
|---|---|
| SC-001 (100% of surfaces show a name, zero raw ids, incl. exports) | Scenarios A, B, E, G |
| SC-002 (rename visible live, no reload) | Scenario A |
| SC-003 (deleted-account content keeps last-known name) | Scenario E |
| SC-004 (new users get a meaningful default name) | Scenario F |
| SC-005 (same-name participants stay distinct) | Scenario C |
