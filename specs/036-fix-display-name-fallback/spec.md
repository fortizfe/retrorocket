# Feature Specification: Fix Configured Display Name Not Used on New Boards

**Feature Branch**: `036-fix-display-name-fallback`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Actualmente tenemos un bug en la aplicación relativo a los display name (nombre para mostrar) de los usuarios. He creado un nuevo tablero y las tarjetas que escriben los usuarios salen con el nombre completo de google en vez de con lo configurado para el nombre para mostrar de dicho usuario. Revisa como está implementada esa funcionalidad y donde puede estar el desvío. Corrígelo cuando des con ello."

## Clarifications

### Session 2026-08-10

- Q: For boards/cards/participants that already exist with the wrong (raw connected-account) name before this fix ships, should this fix also correct them, or only fix new records going forward? → A: Fix-forward only; no backfill — already-affected records are corrected via the existing self-heal path (a user resaving their Profile display name refreshes their name across their existing boards).
- Q: Should the typing-status indicator ("X is typing…") be included in this fix's scope, or is it out of scope as an ephemeral, non-durably-stored indicator? → A: Include it — it is driven by the exact same defective name-resolution path as cards, participants, likes, and reactions, so it is fixed alongside them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cards on a brand-new board show the author's configured name (Priority: P1)

As a participant who has already set a custom display name in my Profile page, when I create or write a card on a retrospective board that I have just created or joined for the very first time, I see my configured display name on that card — not the full name from my connected Google or GitHub account.

**Why this priority**: This is the exact defect reported: cards are the most visible, highest-traffic surface on a retrospective board, and showing the wrong name undermines trust in a feature (custom display names) users have deliberately configured.

**Independent Test**: As a user with a custom display name already saved in the Profile page, create a brand-new retrospective board, write a card on it, and confirm the card's author label shows the configured display name rather than the connected account's raw name.

**Acceptance Scenarios**:

1. **Given** a user who has set a custom display name in their Profile page, **When** they create a new retrospective board and write a card on it, **Then** the card's author label shows their configured display name.
2. **Given** a user who has set a custom display name in their Profile page, **When** they join an existing board for the very first time and write a card on it, **Then** the card's author label shows their configured display name, not their connected account's raw name.
3. **Given** a user who has never customized their display name (still using the name derived from their connected account), **When** they write a card on any board, **Then** the card's author label shows that same name, with no behavior change from today.

---

### User Story 2 - Participant list and group headers on a brand-new board show the configured name (Priority: P2)

As a participant, when I create or join a board for the first time, the participant list and any "group by user" headers show my configured display name from the very first moment I appear on that board, not my connected account's raw name.

**Why this priority**: This is the same underlying defect surfacing on the other places a user's name first gets recorded for a board — the participant list and grouped views are consulted immediately after board creation/joining, so this should be fixed alongside cards to close the defect consistently rather than leaving a visible gap.

**Independent Test**: As a user with a custom display name, create a new board (or join one for the first time) and confirm both the participant list and the "group by user" headers show the configured display name immediately, without needing to first edit the Profile page again.

**Acceptance Scenarios**:

1. **Given** a user who has set a custom display name, **When** they create a new board, **Then** their entry in that board's participant list shows their configured display name from the moment the board is created.
2. **Given** a user who has set a custom display name, **When** they join a board for the first time, **Then** their entry in that board's participant list shows their configured display name from the moment they join.
3. **Given** a board grouped by user that includes a participant who just joined for the first time, **When** the grouping is displayed, **Then** that participant's group header shows their configured display name.

---

### User Story 3 - Likes, reactions, and typing status on a brand-new board show the configured name (Priority: P3)

As a participant, when I like or react to a card, or my typing status is shown, on a board I have just created or joined for the first time, these show my configured display name rather than my connected account's raw name.

**Why this priority**: Same root defect, lower visibility and lower user impact than cards or the participant list, but leaving it unfixed would let the same wrong name resurface on the remaining surfaces the moment a user interacts with a brand-new board.

**Independent Test**: As a user with a custom display name, create a new board, like a card, react to a card, and start typing a card; confirm every one of those surfaces shows the configured display name.

**Acceptance Scenarios**:

1. **Given** a user who has set a custom display name, **When** they like a card on a board they just created or joined, **Then** the like's attribution shows their configured display name.
2. **Given** a user who has set a custom display name, **When** they react to a card on a board they just created or joined, **Then** the reaction's attribution shows their configured display name.
3. **Given** a user who has set a custom display name, **When** their typing status is shown on a board they just created or joined, **Then** it shows their configured display name.

---

### Edge Cases

- What happens for a user who has never set a custom display name and is still using the name derived from their connected account? No visible change — the configured name and the connected-account name are identical, so behavior stays the same.
- What happens if a user changes their display name in the Profile page at the same moment they create or join a new board? The board's newly created records should reflect whichever configured name was in effect at that moment; this is consistent with how a rename already propagates today.
- What happens to boards, cards, participant entries, likes, reactions, or typing records that were already created with the wrong (raw connected-account) name before this fix ships? They are not automatically corrected by this fix; the existing behavior where saving a new display name on the Profile page refreshes a user's name across their boards continues to apply as the way to correct already-affected records.
- What happens when two participants share the same currently configured display name on a brand-new board? Each remains a separate, correctly attributed participant; this fix does not change attribution/grouping logic, only which name is captured.
- What happens to the account-deletion fallback (showing the name captured at the time of an action, for a user whose account has since been deleted)? It continues to work as today; this fix only corrects what name gets captured at creation time, so future deleted-account fallbacks will correctly show the configured name that was in effect instead of the raw connected-account name.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST capture the author's currently configured display name — not the raw name from their connected Google/GitHub account — when a new card is created, regardless of whether the board is brand new, was just joined for the first time, or was created earlier.
- **FR-002**: System MUST capture a participant's currently configured display name — not the raw name from their connected account — at the moment they create a board or join a board for the first time.
- **FR-003**: System MUST capture the acting user's currently configured display name — not the raw name from their connected account — when they like a card, react to a card, or their typing status is shown, regardless of whether it is their first interaction with that board.
- **FR-004**: The source of truth for "currently configured display name" used by FR-001 through FR-003 MUST be the same one shown and editable on the Profile page, so a card, participant entry, like, reaction, or typing status never disagrees with what the user sees as their own configured name.
- **FR-005**: This fix MUST NOT change existing behavior for records that already correctly show an updated display name today (no regression to previously delivered display-name behavior), including the default name assigned at first sign-in and the account-deletion fallback.
- **FR-006**: This fix MUST NOT change which cards are grouped together, how participants are counted as distinct identities, or how votes/likes/reactions are aggregated — only which name is captured and displayed.

### Key Entities

- **User Profile**: The authoritative record of a user's configured display name, editable from the Profile page; this is the single source that all newly captured names in FR-001 through FR-003 must be read from.
- **Card**: A retrospective contribution that captures the author's display name at creation time; today this capture can incorrectly use the raw connected-account name instead of the configured one.
- **Participant (board membership)**: A record of a user's membership in a specific board, created the first time that user creates or joins that board; today this first-time capture can incorrectly use the raw connected-account name instead of the configured one.
- **Like / Reaction / Typing Status**: Per-action or per-moment indicators that capture the acting user's display name; today this capture can incorrectly use the raw connected-account name instead of the configured one, most visibly the first time the user interacts with a given board.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of cards created on a newly created or newly joined board show the author's currently configured display name, with zero occurrences of a raw connected-account name.
- **SC-002**: 100% of participant list entries and "group by user" headers on a newly created or newly joined board show the currently configured display name from the first moment that participant appears, with zero occurrences of a raw connected-account name.
- **SC-003**: 100% of likes, reactions, and typing status indicators on a newly created or newly joined board show the currently configured display name, with zero occurrences of a raw connected-account name.
- **SC-004**: For any card, participant entry, like, reaction, or typing status created after this fix ships, a user who has already set a custom display name never sees their raw connected-account name, regardless of whether the board itself is brand new or pre-existing. (Content already created with the wrong name before this fix ships is out of scope per the Clarifications and Assumptions below.)

## Assumptions

- This defect only affects records (cards, participant entries, likes, reactions, typing status) created after a user's very first interaction with a specific board is captured; it does not affect the Profile page itself, which already displays the correct configured name.
- Records already created with the wrong (raw connected-account) name before this fix ships are not backfilled or migrated as part of this fix; they continue to be correctable the same way they are today (by the user saving their display name again on the Profile page, which refreshes their name across their existing boards).
- The default display name assigned to a brand-new user at first Google/GitHub sign-in is out of scope for this fix — that behavior already works correctly and is not the source of the reported defect.
- The account-deletion fallback behavior (showing a captured name once an account no longer exists) is out of scope for this fix beyond ensuring the name it captures going forward is the correct one; the fallback mechanism itself is unchanged.
- This fix builds on and does not alter the grouping, voting, likes, or reactions aggregation logic — it only corrects which display name gets captured.
