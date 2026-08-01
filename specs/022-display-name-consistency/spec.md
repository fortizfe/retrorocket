# Feature Specification: Consistent Display Name Resolution Across the App

**Feature Branch**: `022-display-name-consistency`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "Quiero mejorar la caracteristica de nombre para mostrar. Actualmente los usuarios pueden configurar en la página de perfil un display name para mostrar en los distintos lugares donde aparecen los usuarios (tableros retro, listas de participantes, etc). Lo que quiero es que en todos esos sitios lo que se muestre para cada usuario sea lo configurado para su display name. Los nuevos usuarios, al conectar la cuenta de google o github, se almacenará como display name su nombre obtenido de la conexión de dicha cuenta como default value. El funcionamiento será que cada tarjeta creada se almacenará el id y display name del usuario. Al mostrar esa tarjeta en la retro, si el usuario existe, se mostrará el display name configurado para ese usuario actualmente. Por el contrario, si el usuario ya no existe porque se haya borrado, se mostrará el display almacenado junto con la tarjeta. Este comportamiento será igual para todos los sitios donde haya que mostrar el display name de los usuarios."

## Clarifications

### Session 2026-08-01

- Q: The spec had a contradiction between the Edge Cases section ("without requiring a manual page reload") and SC-002 ("within one page reload") for how fast a rename propagates to already-open board views. Which is correct? → A: Live, no reload required — the renamed user's new name propagates through the board's existing real-time sync to everyone already viewing it, immediately.
- Q: Should "currently configured" display name (FR-001) always be resolved against the user's actual account/profile, or is it acceptable to resolve it only from a specific retrospective's own participant/join record (which today is not refreshed on rejoin, and can go stale)? → A: Always resolve against the account/profile, independent of whether the user is still an active participant of that specific board.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every surface shows a user's currently configured display name (Priority: P1)

As any participant, whenever I see another user referenced anywhere in the product — on a retro board card, in a "group by user" header, on a like or reaction tooltip, in the participant list, or in an exported board document — I see the name that user currently has configured in their profile, even if that content (a card, a like, a reaction, a board join) was created before they last changed their name.

**Why this priority**: This is the core defect the feature exists to fix. Today, different surfaces disagree with each other: a card shows the name captured when it was created (which can go stale the moment its author renames), while participant lists and exported documents either show a stale captured value or, in the case of exports, the raw internal user id. Without one consistent, always-current resolution rule applied everywhere, users cannot trust that any name they see is accurate "right now."

**Independent Test**: Have a user create a card, like another card, react to a card, and join a retrospective, then rename themselves in the Profile page. Reload the board and confirm every surface referencing that user (their card's author label, the "group by user" header, their like/reaction tooltip, the participant list, and a freshly generated PDF/DOCX/TXT export) shows the new name — not the old one, and not a raw identifier.

**Acceptance Scenarios**:

1. **Given** a signed-in user who created a card, liked a card, and reacted to a card under an earlier display name, **When** they change their display name in the Profile page, **Then** their new name is shown on that card's author label, on the like tooltip, and on the reaction tooltip the next time each is displayed.
2. **Given** a user who joined a retrospective and is still an active account, **When** another participant views the participant list, **Then** the currently configured display name is shown, even if the user renamed after joining.
3. **Given** two different participants who happen to share the same currently configured display name, **When** their cards, likes, reactions, or group-by-user headers are displayed, **Then** each participant's content remains separately and correctly attributed (no merging of distinct accounts because their displayed names match).
4. **Given** a retro board exported to PDF, DOCX, or TXT, **When** the export is generated, **Then** every author reference in the document shows a resolved display name, never a raw internal user identifier.

---

### User Story 2 - Deleted users' past contributions still show a real name (Priority: P2)

As a participant reviewing a retro board, when I see a card, like, reaction, or participant entry attributed to someone whose account has since been deleted, I still see the display name that person was using at the time of that action, instead of a raw identifier, a broken label, or an error.

**Why this priority**: This is the safety net that prevents the exact defect closed for cards in a prior fix from resurfacing on the surfaces not yet covered — most concretely, exported documents today show the raw internal id for a card's author. Closing this consistently, everywhere, is what makes User Story 1's "always current" rule safe: there must always be a durable fallback for the one case where "current" is undefined.

**Independent Test**: Simulate a user whose account has been deleted after they created a card, liked a card, reacted to a card, and joined a board. Confirm every one of those surfaces still shows their last-known display name rather than their raw id, a blank field, or an error.

**Acceptance Scenarios**:

1. **Given** a card, like, or reaction created by a user whose account has since been deleted, **When** that content is displayed or exported, **Then** the display name captured at the time of that action is shown.
2. **Given** content created before this capability existed (no captured display name) by a user who has also since been deleted, **When** that content is displayed or exported, **Then** a clear, readable generic fallback label is shown — never the raw internal identifier and never a blank/broken label.
3. **Given** a participant list containing an entry for a user whose account has since been deleted, **When** the list is displayed, **Then** their last-known display name is shown rather than the entry disappearing or showing a raw identifier.

---

### User Story 3 - New users start with a sensible default display name (Priority: P3)

As a new user connecting my Google or GitHub account for the first time, I immediately have a meaningful display name — taken from that account — without having to visit the Profile page and set one manually before I can participate.

**Why this priority**: The resolution rules in User Story 1 and 2 only produce a trustworthy result if every user has a real display name from their very first action. This closes the gap at the source, so no user ever creates a card, like, or reaction with an empty or placeholder name.

**Independent Test**: Connect a brand-new account via Google (or via GitHub), without visiting the Profile page, then create a card. Confirm the card's author label shows the name obtained from the connected account, and confirm the Profile page shows that same name as the current, editable display name.

**Acceptance Scenarios**:

1. **Given** a new user who connects their Google account for the first time, **When** their account is created, **Then** their display name is set to the name from their Google account.
2. **Given** a new user who connects their GitHub account for the first time, **When** their account is created, **Then** their display name is set to the name from their GitHub account (or their GitHub username, if their account has no public name).
3. **Given** a user with a default, provider-derived display name, **When** they open the Profile page and set a new display name, **Then** the new value replaces the default everywhere it is shown, per User Story 1.

---

### Edge Cases

- What happens when a user renames while other participants already have the board open? Their updated name must reach those already-open views without requiring a manual page reload, consistent with how participant data already updates live elsewhere on the board.
- What happens when a card, like, or reaction was created by a user whose account has since been deleted? The captured display name from the time of that action is shown, never the raw identifier.
- What happens when content predates this capability (no captured name) and its author's account has since been deleted? A generic, readable fallback label is shown, never the raw identifier.
- What happens when two participants share the exact same currently configured display name? They remain two separate, correctly attributed identities everywhere (grouping, likes, reactions, participant list).
- What happens when a board is exported (PDF/DOCX/TXT) and contains content from deleted or legacy (pre-capability) authors? The export applies the same resolution and fallback rules as the live on-screen view, at the moment the export is generated.
- What happens for a brand-new user who has not yet set a custom display name? The name obtained from their Google/GitHub connection is shown everywhere until they change it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show, on every surface where a user is referenced (retro board cards, "group by user" headers, like tooltips, reaction tooltips, participant lists, and exported board documents), the display name currently configured in that user's profile, whenever that user's account still exists — regardless of when the underlying card, like, reaction, or participant entry was created, and regardless of whether that user is still an active participant of the specific retrospective the content belongs to.
- **FR-001a**: The "currently configured" name in FR-001 MUST always be resolved against the user's actual account/profile record, never solely against a single retrospective's own participant/join record — a board-local record MUST NOT be trusted as authoritative for "current" if it can go stale (e.g., is not refreshed when a user renames without leaving and rejoining that specific board).
- **FR-002**: System MUST capture and durably store, at the moment of each user-attributed action (creating a card, liking a card, reacting to a card, joining a retrospective), the acting user's id together with their display name at that time.
- **FR-003**: When the acting user's account no longer exists (has been deleted), System MUST display the display name captured at the time of that action instead of the raw internal identifier or an error.
- **FR-004**: When no display name can be determined at all for a piece of content — neither a currently configured name nor a captured one (e.g., content created before this capability existed, whose author has also since been deleted) — System MUST show a clear, readable, generic fallback label, never the raw internal identifier.
- **FR-005**: System MUST apply the same resolution order — currently configured name, then captured name, then generic fallback — consistently on every surface listed in FR-001, including exported board documents, so that no two surfaces ever disagree about which name to show for the same user and the same piece of content.
- **FR-006**: System MUST continue to treat each user as a distinct identity for grouping and attribution purposes even when two users share the same currently displayed display name; distinct accounts MUST NOT be merged because their displayed names match.
- **FR-007**: When a user changes their display name in the Profile page, the updated name MUST become the one shown across all of that user's existing and future attributed content — without requiring any existing card, like, reaction, or participant entry to be edited or recreated. For a retro board already open in another participant's session, this update MUST appear live, through the board's existing real-time sync, without requiring a manual page reload.
- **FR-008**: System MUST set a new user's display name to the name obtained from their Google or GitHub account at the moment they first connect that account, so no manual input is required before they can participate.
- **FR-009**: Users MUST be able to change their display name at any time from the Profile page; this remains the single source of truth for the "currently configured" name used by FR-001.
- **FR-010**: Resolving, capturing, or displaying a display name MUST NOT change which cards belong to which group, or how votes, likes, or reactions are counted or aggregated.
- **FR-011**: Retro board "group by user" headers MUST continue to sort alphabetically (A→Z) by the resolved display name.

### Key Entities

- **User Account**: The canonical, authenticated person, with a display name configurable from the Profile page and a default value derived from their connected Google or GitHub account. Can be deleted, at which point its current display name is no longer resolvable and any content it authored falls back to what was captured at the time of each action.
- **Card**: A retrospective contribution; stores the author's id together with the display name captured at creation time, used only once the author's account is deleted.
- **Like / Reaction**: A per-card interaction; stores the acting user's id together with the display name captured at the time of that interaction, used only once that account is deleted.
- **Participant**: A record of a user having joined a specific retrospective; associated with a display name. Per FR-001a, this record's stored name is not itself treated as authoritative for "current" — display resolution always checks the user's account/profile while it exists, falling back to a last-known name only once the account has been deleted.
- **Exported Board Document**: A generated artifact (PDF, DOCX, or TXT) that must apply the same name-resolution rules as the live board at the moment it is generated, so it never contains a raw internal user identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of surfaces that reference a user (cards, group headers, like/reaction tooltips, participant lists, and exported documents) show a human-readable display name, with zero raw internal identifiers visible or exported, across the app.
- **SC-002**: When an existing user changes their display name, the new name becomes visible live, without a page reload, on every board already open by another participant, and everywhere else they are referenced, with no content needing to be recreated or manually edited.
- **SC-003**: When a user's account is deleted, 100% of their previously created content continues to display their last-known display name rather than an error, a blank field, or a raw identifier.
- **SC-004**: New users see a meaningful display name immediately after their first sign-in via Google or GitHub, with zero required setup steps before creating their first card.
- **SC-005**: Two participants who share an identical display name remain distinctly and correctly attributed everywhere (grouping, likes, reactions, participant list) 100% of the time.

## Assumptions

- "Account no longer exists" means the account has been deleted via the existing account-deletion capability. A user who is simply offline, temporarily disconnected, or not currently an active participant in one specific retrospective still "exists," and their currently configured name must be resolved wherever they are referenced.
- This feature supersedes the card-display behavior of the prior display-name fix: previously, a card always showed the name captured at creation time, even after its author later renamed themselves, with a live lookup used only as a fallback for cards created before that capability existed. Going forward, the currently configured name takes priority whenever the account exists; the captured name becomes the fallback used only once the account has been deleted.
- Likes and reactions already store a per-action id and name today; this feature applies the same "currently configured name first, captured name as the deleted-account fallback" resolution to their display, mirroring the corrected card behavior, without requiring any migration of historical data.
- Exported board documents (PDF, DOCX, TXT) currently render the raw internal user id for a card's author; this feature brings them in line with the resolution behavior used on-screen.
- No historical data backfill or migration is required. Resolution happens at display/export time using whatever captured id-and-name and current-account data is already available, the same "resolve on read" approach already used for legacy cards.
- Setting a new user's display name from their connected Google or GitHub account at first sign-in is assumed to already exist in the current implementation; this feature formalizes it as a guaranteed, tested contract rather than introducing new behavior.
- Ephemeral live indicators that only reflect momentary activity (e.g., a "user is typing…" indicator) are out of scope for the durable id-and-name capture requirement in FR-002, since they are not a source of stale or incorrect long-term attribution.
