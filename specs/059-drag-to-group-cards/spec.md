# Feature Specification: Drag-to-Group Cards with Inline Group Title Editing

**Feature Branch**: `059-drag-to-group-cards`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User story US-RETRO-059 — "Agrupación de Tarjetas mediante Drag & Drop con Edición Inline" (Epic: Retrospective Board Interaction & Clustering, Priority P1, Size M). As a facilitator or participant of a RetroRocket retrospective, I want to drag one card onto another within the same column to group them intuitively and rename the group instantly, so that related ideas are synthesised quickly and the board stays visually tidy without interrupting the meeting.

## Context

Today a column can hold card groups, but a group can only be created by accepting an AI grouping suggestion (spec 044/047/049). Dragging a card within a column only reorders it. A group has no way to be renamed after creation: an untitled group shows "Group of N cards", and a suggestion-derived title is fixed. Grouped cards are rendered outside the column's drag surface, so nothing can be dropped on an existing group.

Mixing reorder and group on one drag gesture creates a well-known intent conflict: a person dragging to reorder accidentally merges two cards. This feature resolves that conflict spatially and temporally, following the Apple pattern for folder creation (iOS Springboard / macOS Dock): the edges of a target card mean "insert here", its centre means "group with this", and grouping only arms after a short dwell.

## Clarifications

### Session 2026-10-21

- Q: Is dragging a card out of a group in scope? → A: Yes. Dragging a group member out of its group ungroups it in the same column, and dragging a member onto another group in the same column moves it there (option C).
- Q: Who may group, move between groups and rename groups? → A: Any participant who can edit the board; no facilitator-only restriction and no per-board setting (option A).
- Q: What happens to manual (drag / "Group with…") groups when a column leaves "suggestions" mode, which disbands all its groups? → A: Ask for an accessible confirmation first, but only when the column has at least one manual group. Confirming disbands all groups as today; cancelling keeps the mode and the groups (option C).
- Q: Where does a newly created group appear in the column? → A: In the target card's position. Groups and ungrouped cards share one common order in the column and are interleaved (option C).
- Q: Should there be an explicit Undo after an accidental grouping? → A: No. Reverting is done by dragging the card out of the group or with "Remove from group" (option A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a group by dropping one card onto another (Priority: P1)

A participant drags Card A and holds it over the centre of Card B in the same column. After a short dwell, Card B shows it is ready to receive a group (raised, accent-outlined, translucent, with a "Drop to group" badge). Releasing creates a new group containing both cards. Its title shows a localized default ("New group") and opens straight into inline editing with the text selected, so the participant can type the real name or just press Enter.

**Why this priority**: This is the core value of the story — the fastest possible path from "these two ideas are the same" to a named cluster. Without it, nothing else in the story has a purpose.

**Independent Test**: On a board with two ungrouped cards in one column (grouping mode "none"), drag one onto the centre of the other, hold, release. Verify that a group with both cards appears for every connected participant and that the title is in edit mode with its text selected.

**Acceptance Scenarios**:

1. **Given** a column whose grouping mode is not "by user" and two ungrouped cards A and B in it, **When** I drag A and hold it over the central zone of B past the dwell threshold, **Then** B shows the grouping feedback (accent outline, subtle raise, translucent surface, "Drop to group" badge).
2. **Given** B is showing the grouping feedback, **When** I release A, **Then** a new group is created that contains B as primary card and A as member, **in B's position in the column** (the column does not jump), and every participant sees it in real time.
3. **Given** a group was just created by my drop, **When** it appears, **Then** its title shows the localized default title, is in inline-edit mode, has keyboard focus, and its whole text is selected.
4. **Given** I am dragging A over B, **When** the pointer sits in B's top or bottom edge zone, **Then** an insertion indicator is shown and no grouping feedback appears; releasing there reorders A to that position (today's behavior).
5. **Given** I am dragging A quickly across the centre of B without stopping, **When** I pass through in less than the dwell threshold, **Then** no grouping feedback is shown and no group is created if I release after leaving the centre zone.
6. **Given** B shows grouping feedback, **When** I move A back into an edge zone or off B, **Then** the feedback disappears and the dwell timer restarts on the next entry.

---

### User Story 2 - Rename a group inline (Priority: P1)

Any participant can click a group's title (or focus it and press Enter or Space) to turn it into an inline text field that keeps the same position and typography. Enter or leaving the field saves the title, which syncs in real time. Escape cancels and restores the previous title. Clearing the title and confirming falls back to the localized default title.

**Why this priority**: The story explicitly couples grouping with "rename it instantly". A cluster without a meaningful name gives little synthesis value, and the default title from Story 1 is only useful if it can be replaced. It also lets existing groups (including suggestion-derived ones) be renamed for the first time.

**Independent Test**: On any board with an existing group, click its title, type a new name, press Enter. Verify that every participant sees the new title and that Escape and an empty title behave as specified.

**Acceptance Scenarios**:

1. **Given** a group exists, **When** I click its title or press Enter/Space while it has focus, **Then** the title becomes a text field in the same place, with the same size and no visible layout shift, showing a visible focus ring.
2. **Given** the title field is being edited, **When** I type a new name and press Enter or move focus elsewhere, **Then** the title is saved, shown again as plain text, and updated for every participant in real time.
3. **Given** the title field is being edited, **When** I press Escape, **Then** editing ends and the title shown before editing is restored, with nothing saved.
4. **Given** the title field is being edited, **When** I clear it (or leave only spaces) and confirm, **Then** the group shows the localized default title instead of an empty title.
5. **Given** a title longer than the maximum length is typed or pasted, **When** it is entered, **Then** input stops at the maximum length.
6. **Given** another participant renames the same group while I am editing it, **When** I confirm my edit, **Then** my title is saved (last write wins) and both participants end up seeing the same final title.

---

### User Story 3 - Add a card to an existing group by dropping it (Priority: P2)

A participant drags an ungrouped card onto the central zone (header or body) of an existing group in the same column. Dropping on the group's top or bottom edge places the card before or after the group instead (FR-036). The group shows the same "ready to receive" feedback. Releasing adds the card as a new member, with a smooth insertion animation.

**Why this priority**: It completes the clustering loop — once groups exist, growing them is as common as creating them. It depends on the same drag surface as Story 1, but Story 1 alone already delivers a viable slice.

**Independent Test**: On a column with one group and one ungrouped card, drag the card onto the group, hold, release. Verify that the group now lists the card as its last member and that totals in the group header update.

**Acceptance Scenarios**:

1. **Given** a column has an existing group and an ungrouped card, **When** I drag the card over the group's central zone (middle 50%, header or body) past the dwell threshold, **Then** the group shows the grouping feedback and the "Drop to group" badge.
2. **Given** the group shows the grouping feedback, **When** I release, **Then** the card is added as the group's last member, animates into place, and the group's totals of votes, likes and reactions include it.
3. **Given** the group is collapsed, **When** I drop a card on it, **Then** the card is added and the collapsed summary's member count increases; the group stays collapsed.

---

### User Story 4 - Grouping stays inside the column and respects "group by user" (Priority: P1)

Dragging can never move or group a card across columns. A card dragged over another column, or outside its own column, gets a "not allowed" cursor. The other column shows no drop zones, and on release the card springs back to its original position with nothing changed. When a column is in "group by user" mode, drag-to-group is turned off and dragging only reorders, so the per-user separation is never broken.

**Why this priority**: These are guard rails for Story 1. Without them, the new gesture would corrupt board structure (cross-column groups, or merging cards from different authors in a by-user view). They must ship together with Story 1.

**Independent Test**: Drag a card from column A over column B and release, then verify that nothing changed and the card springs back. Switch a column to "group by user", drag a card onto the centre of another card, and verify that no grouping feedback appears and no group is created.

**Acceptance Scenarios**:

1. **Given** I am dragging a card from column A, **When** the pointer is over column B or outside column A, **Then** the cursor shows "not allowed" and column B shows no insertion indicator or grouping feedback.
2. **Given** I release a card over column B or outside column A, **When** the drop ends, **Then** the card animates back to its original position in column A and no reorder, move or grouping is persisted.
3. **Given** a column's grouping mode is "by user", **When** I drag a card over the centre of another card, **Then** no grouping feedback appears, the gesture behaves purely as reorder within that author's section, and releasing never creates a group or adds to one.
4. **Given** a column's grouping mode is "by user", **When** I open a card's actions, **Then** the "Group with…" action is not offered.
5. **Given** the board is anonymous and a column's persisted mode is "by user" (which an anonymous board displays as an ungrouped list), **When** I drag a card onto another, **Then** drag-to-group follows the displayed mode (enabled).

---

### User Story 5 - Group cards without dragging: keyboard and screen readers (Priority: P1)

A participant who uses only the keyboard or a screen reader can group cards with the same outcome as dragging. Every ungrouped card has a "Group with…" action. It opens a picker that lists the other cards and groups of the same column, and choosing one creates the group or adds to it, with the same inline-title behavior as Story 1. Keyboard drag (Space to grab, arrows to move, Space to drop) also supports grouping. Every drag state is announced to assistive technology.

**Why this priority**: The constitution (Principle VIII, WCAG 2.1 AA) makes full keyboard operability of drag & drop non-negotiable, so a pointer-only grouping gesture cannot ship.

**Independent Test**: Using only the keyboard, open "Group with…" on card A, choose card B, confirm. Verify that a group is created and its title is in edit mode with focus. With a screen reader running, perform a keyboard drag and verify the announcements.

**Acceptance Scenarios**:

1. **Given** an ungrouped card in a column whose mode is not "by user", **When** I open its actions with the keyboard, **Then** a "Group with…" action is available to me as a participant, whether or not I own the card.
2. **Given** I choose "Group with…", **When** the picker opens, **Then** it lists every other ungrouped card and every group in the same column (and only that column), each with a readable label (card text excerpt or group title). It is fully keyboard-operable, and Escape closes it and returns focus to the action that opened it.
3. **Given** I pick a card in the picker, **When** I confirm, **Then** a new group is created exactly as in Story 1, including focus moving to the title field with its text selected. **Given** I pick a group instead, **Then** the card is added as in Story 3.
4. **Given** the column has no other card or group, **When** I open the card's actions, **Then** "Group with…" is either absent or disabled with an explanation, never an empty picker.
5. **Given** I grab a card with the keyboard, **When** I move it with the arrow keys over another card, **Then** I can choose between reordering and grouping. The current intent is announced (for example "Over card '…'. Drop to create a group with both cards." versus "Position 3 of 7"), and dropping applies the announced intent.
6. **Given** any drag (pointer or keyboard), **When** it starts, passes over a target, changes intent, ends, or is cancelled, **Then** a polite live announcement describes the state in the user's language, for example "Card picked up.", "Over card '…'. Drop to create a group with both cards.", "Group created.", "Drag cancelled. Card returned to its position."

---

### User Story 6 - Drag a card out of a group or into another group (Priority: P2)

A participant drags a card that is already inside a group. Dropping it on the column's ungrouped list takes it out of the group, leaving it as an independent card at that position. Dropping it on another group in the same column moves it into that group. Dropping it on the centre of an ungrouped card creates a new group with that card. The same-column restriction, dwell threshold and grouping feedback apply exactly as for ungrouped cards.

**Why this priority**: It keeps clusters correctable with the same gesture that builds them, so a misplaced card can be fixed without menus. It builds on the column drag surface from Stories 1 and 3.

**Independent Test**: On a column with group G1 (3 cards), group G2 (2 cards) and an ungrouped card, drag a G1 member to the ungrouped list, then drag a G2 member onto G1. Verify the resulting memberships for every participant.

**Acceptance Scenarios**:

1. **Given** a group with three or more cards, **When** I drag one of its members (or its primary card) and release it in a reorder zone of the column's ungrouped list, **Then** the card leaves the group and becomes an independent card at that position. If it was the primary card, the first remaining member becomes the primary card.
2. **Given** a group with exactly two cards, **When** I drag one of them out, **Then** the card becomes independent and the group dissolves, leaving the other card independent too. The drag itself is the confirmation, and the result is announced ("Card removed. Group dissolved.").
3. **Given** two groups G1 and G2 in the same column, **When** I drag a card from G1 and hold it over G2 past the dwell threshold and release, **Then** the card is moved from G1 into G2 as its last member in one step. If G1 is left with a single card, G1 dissolves as in scenario 2.
4. **Given** I drag a grouped card onto the centre of an ungrouped card in the same column, **When** I release after the dwell, **Then** the card leaves its group and forms a new group with the target, and the new group's title enters inline edit as in Story 1.
5. **Given** I drag a grouped card and release it back over its own group, outside any column, or over another column, **When** the drop ends, **Then** nothing changes and the card springs back.
6. **Given** a column whose displayed mode is "by user", **When** I look at its groups, **Then** grouped cards cannot be dragged into other groups or onto cards (consistent with FR-010).
7. **Given** a keyboard or screen-reader user focuses a grouped card, **When** they open its actions, **Then** they can choose "Move to group…" (other groups and cards of the column) or "Remove from group", with the same outcomes as scenarios 1–4.

---

### Edge Cases

- **Target deleted mid-drag**: another participant deletes Card B (or the target group is disbanded) while I am dragging A over it. The drop does nothing harmful: no group is created, no reference to a missing card or group remains, A stays where it was, and I see a short non-blocking notice ("That card is no longer available").
- **Dragged card deleted mid-drag**: my drag ends cleanly with the same notice, and nothing is persisted.
- **Card grouped concurrently**: between my drag start and my drop, another participant puts A or B into a group, or moves one of them to another column. The operation is rejected as a whole with the notice, and the board shows the true current state. A card is never left in two groups, or in a group whose column differs from the card's column.
- **Two participants drop onto the same card at the same time**: both operations are evaluated against the current state. The first creates the group; the second is rejected cleanly with the notice (FR-022/FR-024) and that participant then sees the new group and can drop onto it again, never producing two groups that claim the same card.
- **Grouped cards as drag sources**: any card, grouped or not, can be dragged (Story 6). Groups themselves cannot be dragged onto other groups or cards (no group merging).
- **Group left with one card**: whenever a removal or move leaves a group with a single card, that group dissolves automatically. A group always has at least two cards.
- **Source group changed mid-drag**: if the dragged card's own group is dissolved or the card is removed from it by someone else during the drag, the drop is validated against the current state. It either succeeds from the card's new state or is rejected with the conflict notice; no partial move is left behind.
- **Dropping a card onto itself / its original slot**: no change.
- **Legacy ordering**: columns created before this feature have no common order between groups and cards. Until the first reorder or grouping operation in such a column, it keeps today's visual order (groups first, by existing group order, then ungrouped cards by card order). The first write fixes that sequence as the column's common order.
- **By-user mode layout**: in "by user" mode, cards are shown per author section. Groups belong to no single author, so they are listed above the sections as today, and the common order applies only in the other modes.
- **Very fast drags and touch scrolling**: a drag that only passes through a card's centre without dwelling never groups. Starting a drag still needs the existing small movement threshold, so taps and scrolls never start one.
- **Reduced motion**: with the reduced-motion preference set, the grouping feedback keeps the outline, translucent surface and badge but drops the scale and spring movement. The spring-back on an invalid drop becomes an immediate return.
- **Editing a title when the group disappears**: if the group I am renaming is disbanded by someone else, the field closes without error and my pending text is discarded.
- **Mode switch away from "suggestions"**: switching a column away from the AI "suggestions" mode still disbands every group in that column. If the column contains at least one manual group, the participant must confirm first (FR-033). Cancelling keeps the column in "suggestions" mode with every group intact.
- **Export**: exported boards (PDF/DOCX/TXT) show the group's current title. An untitled group shows the localized default title.
- **Read-only situations**: wherever a board is not editable for the current user, no grouping feedback, inline editing or "Group with…" action is offered.

## Requirements *(mandatory)*

### Functional Requirements

**Drag intent & feedback**

- **FR-001**: While a card is dragged over another ungrouped card in the same column, the system MUST split the target into three zones by height: the top 25% and bottom 25% mean *reorder* and the middle 50% means *group*.
- **FR-002**: In a reorder zone, the system MUST show an insertion indicator at the prospective position and let the surrounding cards shift smoothly to open the slot. Releasing MUST reorder exactly as today.
- **FR-003**: The *group* intent MUST arm only after the dragged card has stayed continuously inside the target's central zone for a dwell threshold of 180 ms (acceptable range 150–200 ms). Leaving the zone MUST disarm it and reset the timer.
- **FR-004**: While the group intent is armed, the target (card, or an existing group's header/body) MUST show grouping feedback. That feedback is a subtle scale-up (about 2%) with spring motion, an accent-coloured outline, a translucent frosted surface, and a floating "Drop to group" badge. Colour MUST NOT be the only cue: the badge text is the redundant cue.
- **FR-005**: Releasing while the group intent is armed on an ungrouped card MUST create a new group whose primary card is the target and whose only member is the dragged card. The group belongs to the column both cards are in.
- **FR-006**: Releasing while the group intent is armed on an existing group MUST add the dragged card as that group's last member.

**Column order (groups and cards interleaved)**

- **FR-034**: In modes other than "by user", each column MUST present its groups and ungrouped cards as a single ordered sequence, persisted and synchronized in real time for all participants.
- **FR-035**: A group created by drag or "Group with…" MUST take the target card's position in that sequence. Adding a card to a group MUST NOT move the group. A card removed or dragged out of a group MUST take the position where it was dropped; if it is removed through a control, it takes the position right after its former group. When a group dissolves, its remaining cards MUST take the group's position, in group order (primary first).
- **FR-036**: A group MUST also expose reorder zones: thin top and bottom edge bands of 25% of its height, capped so that the group's header always stays inside the group zone (Story 3) so that a dragged card can be placed immediately before or after it, while its middle 50% is the group zone (FR-001/FR-003 apply). Groups themselves remain non-draggable (FR-007); a group's position changes only as a result of the operations above.
- **FR-007**: Both ungrouped and grouped cards MUST be usable as drag sources. Groups MUST NOT be drag sources (no group merging).

**Same-column restriction & by-user mode**

- **FR-008**: A drag MUST be confined to its source column. Over any other column, or outside the source column, the system MUST show a "not allowed" cursor and MUST NOT show any insertion indicator or grouping feedback.
- **FR-009**: Releasing outside the source column MUST return the card to its original position with a spring-back animation and MUST NOT persist any change.
- **FR-010**: When the column's *displayed* grouping mode is "by user", the system MUST disable the group intent entirely (no central zone, no feedback, no "Group with…" action). Dragging MUST only reorder within the author's section.

**Inline title editing**

- **FR-011**: Every group MUST display a title. When a group has no stored title, the system MUST display the localized default group title ("New group" / "Nuevo grupo") in the viewer's language.
- **FR-012**: Immediately after a group is created by drag or by "Group with…", the creating participant's view MUST put that group's title in inline-edit mode with focus and the full text selected. Other participants' views MUST NOT be put in edit mode.
- **FR-013**: Any participant who can edit the board MUST be able to enter inline-edit mode by clicking the title or pressing Enter/Space while the title has focus. The title MUST be exposed as an interactive control with an accessible name that states it can be renamed.
- **FR-014**: The inline field MUST occupy the same position and typographic size as the displayed title, with no visible layout shift. It MUST have a visible focus indicator and text contrast of at least 4.5:1 in both light and dark themes.
- **FR-015**: Enter or focus leaving the field MUST save the title. Escape MUST cancel and restore the value shown before editing. Saving an unchanged value MUST NOT issue a write.
- **FR-016**: Titles MUST be trimmed of surrounding whitespace. An empty or whitespace-only result MUST be stored as "no title", so it displays the localized default (FR-011), never an empty string. Titles MUST be limited to 60 characters.
- **FR-017**: Title changes MUST be persisted and propagated to every connected participant in real time. Concurrent renames resolve as last write wins.

**Keyboard & assistive technology**

- **FR-018**: Every ungrouped card in a column whose displayed mode is not "by user" MUST offer a "Group with…" action, reachable by keyboard and screen reader, to every participant who can group by dragging (not only the card's owner or the facilitator).
- **FR-019**: "Group with…" MUST open an accessible picker that lists only the other ungrouped cards and the groups of the same column. Choosing a card MUST behave like FR-005 + FR-012; choosing a group MUST behave like FR-006. Escape MUST close the picker and return focus to its trigger.
- **FR-020**: Keyboard dragging (grab, move with arrows, drop) MUST support both reorder and group intents on a target card or group. There MUST be an explicit, announced way to switch between the two intents while over a target.
- **FR-021**: The system MUST announce drag lifecycle states through a polite live region in the user's language: pick-up, over target with the current intent and the target's label, intent changes, drop result (reordered / group created / added to group) and cancellation.

**Integrity & concurrency**

- **FR-022**: Creating a group MUST be validated against the current server-side state as one atomic operation. Both cards must still exist, belong to the same retrospective and the same column, and neither may already belong to a group. If any check fails, nothing MUST be written.
- **FR-023**: Adding a card to a group MUST be validated atomically. The group and the card must still exist, the card must be ungrouped, and it must be in the group's column. If any check fails, nothing MUST be written.
- **FR-024**: When a grouping operation is rejected because the board changed underneath it, the initiating participant MUST see a short, non-blocking, localized notice. Their view MUST reflect the true current board state. No card or group MUST be left referencing a missing or mismatched counterpart.
- **FR-025**: Grouping MUST NOT alter any card's own votes, likes or reactions. The group header MUST continue to show the aggregated totals of all its cards.

**Preserved behavior**

- **FR-026**: The existing ways to dissolve a group or remove a card from a group, with their existing confirmation, MUST keep working unchanged. Any confirmation MUST be operable by keyboard and screen reader.

**Drag out & move between groups**

- **FR-029**: Releasing a grouped card in a reorder zone of the column's ungrouped list MUST remove it from its group and place it at that position as an independent card. Removing the primary card MUST promote the first remaining member.
- **FR-030**: Releasing a grouped card on another group of the same column (group intent armed) MUST move it into that group as its last member in a single atomic operation. Releasing it on an ungrouped card's centre MUST remove it from its group and create a new group with the target (FR-005, FR-012).
- **FR-031**: Whenever an operation leaves a group with exactly one card, the system MUST dissolve that group in the same atomic operation. Drag-out MUST NOT ask for confirmation (the gesture is the confirmation) and MUST announce the result, including a dissolution.
- **FR-032**: Grouped cards MUST offer keyboard/screen-reader equivalents, "Move to group…" and "Remove from group", with the same outcomes as FR-029/FR-030, available to the same participants as FR-018.

**Mode-switch safeguard**

- **FR-033**: Every group MUST record its origin: *manual* (drag or "Group with…") or *suggestion* (an accepted AI suggestion). A group without a recorded origin counts as *suggestion*. When a participant switches a column away from "suggestions" mode and the column contains at least one manual group, the system MUST first show an accessible, keyboard-operable confirmation stating how many groups will be undone. Confirming disbands all of the column's groups, as today. Cancelling MUST leave the column in "suggestions" mode with all groups intact. With no manual groups present, the switch proceeds without confirmation, as today.
- **FR-027**: Reordering ungrouped cards within a column MUST keep working as today when the drop lands in a reorder zone or between cards.
- **FR-028**: All new user-visible text (default title, badge, picker, notices, announcements, accessible names) MUST be available in every supported locale.

### Key Entities

- **Card group**: A named cluster of cards in one column of one retrospective. It has one primary card and an ordered list of member cards, an optional title (absent means "show the localized default"), and a collapsed/expanded state. This feature adds the ability to change its title after creation, and an origin (*manual* or *suggestion*; absent means *suggestion*) used by the mode-switch safeguard. A card belongs to at most one group, and a group's cards always live in the group's column.
- **Card**: An idea in a column. Its grouping-related attributes (which group it belongs to, whether it is the primary card, its order within the group) change when it is grouped. Its votes, likes and reactions never change because of grouping.
- **Column order**: The single sequence of a column's items (groups and ungrouped cards) in modes other than "by user". It is shared by all participants and changes only through reorder, grouping, ungrouping and dissolution.
- **Column grouping mode**: A per-column display mode ("none", "by user", "suggestions"). The mode actually displayed decides whether drag-to-group is available; an anonymous board displays "by user" as "none".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A participant can turn two related cards into a named group in under 5 seconds (drag, hold, release, type the name, Enter), with no menu or dialog involved.
- **SC-002**: In usability testing, at least 95% of drags meant as reorders end as reorders, never as accidental groups.
- **SC-003**: A newly created group, or a renamed title, appears for every other connected participant within 1 second under normal network conditions.
- **SC-004**: 100% of grouping outcomes available by pointer (create group, add to group) can be completed with the keyboard alone and with a screen reader, and every drag state change is announced.
- **SC-005**: Under concurrent conflicting edits (deletes, moves, simultaneous drops), automated checks find zero cards that reference a missing group, zero groups that reference a missing card, and zero cards that are in more than one group or in a group of another column.
- **SC-006**: Zero cross-column changes result from dropping a card outside its own column.
- **SC-007**: The new surfaces (grouping feedback, inline title field, picker, badge) report zero WCAG 2.1 AA violations in automated accessibility scans in both the light and dark themes.

## Assumptions

- **Who can group and rename** (confirmed in Clarification 2026-10-21): any participant who can edit the board, not only the facilitator or the card owners. This matches today's rule that any participant can drag and accept grouping suggestions. No new server-side permission check is introduced.
- **Primary card choice**: the card dropped *onto* becomes the group's primary card, and the dragged card becomes the member, mirroring "drop into a folder".
- **Default title storage**: the default title is not stored as text. A group without a title shows the localized default, so participants using different languages each see it in their own language. This replaces today's "Group of N cards" label for untitled groups; the card count stays visible in the group header.
- **Title length**: 60 characters maximum. This is a reasonable bound for a column-width header, longer than the 35-character AI-suggested titles.
- **Drag-out and moving between groups are in scope** (Clarification 2026-10-21, Story 6). Business rule 3 of the story is honored both by the new drag gestures and by keeping the existing remove/dissolve controls.
- **No explicit Undo** (Clarification 2026-10-21): an accidental grouping is reverted by dragging the card out (FR-029) or with "Remove from group" (FR-032). No undo toast is offered.
- **Group merging is out of scope**: dropping a group onto a card or onto another group is not supported.
- **"Suggestions" mode teardown guarded** (Clarification 2026-10-21): switching away from "suggestions" still disbands all groups in the column, as in spec 047. When manual groups are present, a confirmation comes first (FR-033). Groups created before this feature carry no origin and count as suggestion groups, since suggestions were the only way to create them.
- **Mobile/touch**: drag-to-group uses the existing drag activation (a small movement threshold). Touch devices get the same zones and dwell, and "Group with…" is the precise alternative.
- The existing real-time board synchronization and the existing aggregated totals of votes, likes and reactions are reused as they are.
