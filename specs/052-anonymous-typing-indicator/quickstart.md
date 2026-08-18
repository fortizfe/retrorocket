# Quickstart: Validating the Anonymous Typing Indicator

Validates spec.md's three user stories end-to-end. Pairs with
[typing-indicator-anonymity-contract.md](contracts/typing-indicator-anonymity-contract.md)
and [typing-i18n-keys-contract.md](contracts/typing-i18n-keys-contract.md)
for exact expected values — this guide only lists the steps and what to
check, not full expected strings already documented there.

## Prerequisites

- Repo dependencies installed (`npm install` at `retro-rocket/`).
- Firebase emulators available for E2E (`npm run e2e` already handles this
  via `firebase emulators:exec`).
- Two browser sessions/contexts (or one browser + one incognito window) to
  observe cross-participant behavior for User Stories 1 and 3.

## §1. Unit-level check (fast feedback loop)

```bash
cd retro-rocket
npm test -- TypingPreview
npm test -- GroupableColumn
```

Expect the extended `TypingPreview.test.tsx` and `GroupableColumn*.test.tsx`
suites to cover, at minimum, every row of the anonymity contract's rendering
table (single/double/multiple typist × anonymous/non-anonymous, plus the
avatar-cluster-absence assertion and the live-region-text-parity assertion).

## §2. Manual check — User Story 1 (anonymous board hides identity)

1. `npm run dev` and open a board created with anonymous mode **enabled**
   (create via the existing anonymous-board creation flow from feature 051,
   or toggle it on from the facilitator menu).
2. In one browser session, start typing a new card in any column (don't
   submit).
3. In a second session (different participant), look at that column:
   - Visible card text reads the generic message (`typing.anonymous`), with
     **no name, no initials, no avatar**.
   - Open the accessibility tree / screen reader and confirm the live region
     (`role="status"`) announces the same generic text.
4. Repeat with a second participant also typing in the same column
   simultaneously: text still reads the single generic message (no "2
   people" wording, no second avatar).
5. Stop typing in both sessions: the card disappears the same way (timing,
   animation) it does today for named typists.

## §3. Manual check — User Story 2 (non-anonymous board keeps names)

1. Open a board with anonymous mode **disabled** (the default).
2. Repeat step 2–5 above.
3. Confirm the card shows the typist's display name (single typist) or the
   existing "name y N más" / "name and N more" phrasing (multiple typists),
   with avatars showing initials — i.e. pixel-for-pixel the same as before
   this feature, per the anonymity contract's non-anonymous rows.

## §4. Manual check — User Story 3 (live toggle, no reload)

1. Open a board as facilitator in one session, as a participant in another,
   with anonymous mode initially **disabled**.
2. Have the participant start typing (don't submit) so the facilitator sees
   the named indicator.
3. From the facilitator menu, toggle anonymous mode **on**.
4. Without reloading either session, confirm the facilitator's view of the
   indicator updates to the generic message within the same latency the
   anonymity toggle already achieves for other UI (card-author hiding, per
   feature 051 SC-004) — no added delay.
5. Toggle anonymous mode back **off** and confirm the indicator reverts to
   the named text, again without a reload.

## §5. E2E automated check

```bash
cd retro-rocket
npm run e2e -- --grep "typing indicator"
```

The extended `retrospective-board.spec.ts` MUST include a new scenario for
an anonymous board (asserting the generic text via both `visibleTypingText`
and `typingLiveRegion` helpers already defined in that file) alongside its
two existing named-typist scenarios, which MUST continue to pass unchanged
(their literal `/está escribiendo/` assertions still match, per the i18n
keys contract's note that the Spanish value is unchanged).

## §6. Accessibility spot-check

- Confirm no new WCAG 2.1 AA violation is introduced: the live region's role/
  aria attributes are unchanged (§ live-region contract), and removing the
  avatar cluster in anonymous mode removes a `title` tooltip that was itself
  the identity leak — nothing accessibility-relevant is lost.
- Verify in both light and dark themes that the generic-message card renders
  with the same contrast-compliant styling as the named-message card (no new
  color/style branch is introduced — only content changes).

## Done when

- [ ] §1 unit tests pass locally with coverage ≥ the project floor.
- [ ] §2–§4 manual checks confirm the exact behavior in the anonymity
      contract for all three user stories.
- [ ] §5 E2E scenario passes, and the two pre-existing typing scenarios still
      pass unchanged.
- [ ] §6 accessibility spot-check finds no regression.
