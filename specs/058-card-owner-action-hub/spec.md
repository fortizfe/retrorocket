# Feature Specification: Card Owner Action Hub (Owner Controls Redesign)

**Feature Branch**: `058-card-owner-action-hub`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Utiliza el fichero card-owner-controls-redesingn.md como entrada para la HU. Completa lo que veas que falte." Source user story: `retro-rocket/.hu/card-owner-controls-redesign.md` (HU-001 / RETROROCK-1, Epic: Retrospective card experience).

## Context

Today a retrospective card shows its owner controls in two places that look unrelated. The colour selector sits in the top-right corner of the card. Edit and delete sit in the bottom-right of the footer. Owners have to look in two places for actions that belong to them. On a crowded board (around 20 cards per column) this is confusing and adds clutter: colour, drag handle, edit, delete and the facilitator menu can all appear on one small card.

The two zones also apply different permission rules. Edit and delete are shown only to the card's owner when editing is allowed. The colour selector checks only whether editing is allowed, so a participant who does not own the card can still see it and try to change that card's colour. The server already rejects colour, content and delete changes from anyone other than the owner, so the gap is in the interface: non-owners are offered a control that cannot succeed. This feature fixes that by putting every owner action behind one gate.

The feature replaces the scattered controls with one **Owner Action Hub**. It is a single trigger that is always visible and opens a compact panel with Edit, Colour and Delete. The facilitator's "convert to action item" menu stays separate and does not change.

## Clarifications

### Session 2026-10-12

- Q: Which design proposal should be implemented (A footer menu, B header toolbar, C header chip + bottom sheet)? → A: Proposal A, a single trigger in the card footer opening a compact anchored panel.
- Q: How should accidental deletion be prevented (inline confirmation, undo toast, or both)? → A: Inline confirmation inside the panel (Confirm / Cancel) before deleting; no undo toast.
- Q: Should individual cards shown inside a card group also use the Owner Action Hub? → A: Yes. Member cards inside a group use the same hub with the same rules; only the group container's own controls are out of scope.
- Q: (Found during implementation) The board identified the current user by display name while cards store the creator's uid, so ownership never matched in production. Fix it within this feature? → A: Yes — full fix: the board identifies the current user by uid everywhere ownership or "mine" state is computed (cards, likes, reactions), as part of 058.
- Q: Should there be a shortcut into edit mode besides the hub (e.g. double-click/double-tap on the card text)? → A: No. Edit mode is entered only via "Edit card" in the Owner Action Hub (two activations).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified owner control on my own cards (Priority: P1)

As the owner of a retrospective card, I want to edit, delete and recolour my card from one control that is always visible. Then I don't have to hunt for scattered controls and can act quickly during a live session.

**Why this priority**: This is the core of the redesign and the MVP. It removes the fragmentation, applies one permission rule to every owner action and frees the top-right corner of the card. On its own it delivers all the user-facing value of the HU.

**Independent Test**: Create a card as user A and confirm that one owner trigger appears in the card footer and the colour selector no longer appears in the header. Open the trigger and check that Edit, Colour and Delete each work end to end.

**Acceptance Scenarios**:

1. **Given** I own a card, editing is allowed and the card is not being edited, **When** the board loads on any screen size, **Then** the Owner Action Hub trigger is visible on the card without hovering or focusing, **And** no separate colour selector appears in the card's top-right area, **And** no separate edit or delete buttons appear in the footer.
2. **Given** the hub is visible on my card, **When** I activate it (tap, click, Enter or Space), **Then** a panel opens with three options: Edit card, Colour and Delete card. Delete is visually set apart as a destructive action.
3. **Given** the panel is open, **When** I pick a colour, **Then** the card shows the new colour right away, **And** other participants see the change in real time, **And** the panel closes, **And** focus returns to the trigger.
4. **Given** the panel is open, **When** I choose "Edit card", **Then** the panel closes and the card enters edit mode, **And** the hub is hidden while I edit, **And** Save and Cancel are the only owner controls in the footer.
5. **Given** I finish editing (Save or Cancel), **When** the card leaves edit mode, **Then** the hub trigger shows again and receives focus.
6. **Given** the panel is open, **When** I choose "Delete card", **Then** an explicit confirmation (a short message plus Confirm and Cancel) appears inside the same panel, **And** the card is not deleted yet.
7. **Given** the delete confirmation is showing, **When** I confirm, **Then** the panel shows a busy state until the deletion finishes, **And** the card leaves the board with an exit animation, **And** focus moves to the next card in the column. If there is no next card, focus moves to the previous card, and if the column is then empty, to the column's "add card" control.
8. **Given** the delete confirmation is showing, **When** I choose Cancel or press Escape, **Then** the confirmation closes, the card stays, and no deletion happens. Cancel returns the panel to its option list. Escape closes the panel and returns focus to the trigger.

---

### User Story 2 - Facilitator privilege stays independent (Priority: P2)

As the facilitator, I want the option to convert a card into an action item to stay available and separate from the Owner Action Hub. My exclusive control should not be mixed with each card owner's controls.

**Why this priority**: This protects an existing facilitator capability from regressing. It ranks below P1 because it needs no new behaviour, only coexistence and visual distinction.

**Independent Test**: As the facilitator, view (a) a card owned by someone else and (b) a card I own. Confirm the convert-to-action control is present and works in both cases, is not inside the owner panel, and looks clearly different from the owner trigger.

**Acceptance Scenarios**:

1. **Given** I am the facilitator and a card can be converted to an action item, **When** I view any card on the board, **Then** the convert-to-action control is still in the card footer and is not part of the Owner Action Hub.
2. **Given** I am the facilitator and I own a specific card, **When** I view that card, **Then** both controls are visible side by side, the owner hub and the facilitator menu, **And** their icons are clearly different so they cannot be confused.
3. **Given** the facilitator's convert-to-action control, **When** this feature ships, **Then** its behaviour, options and placement are unchanged.

---

### User Story 3 - Legible controls on shared and projected screens (Priority: P3)

As a team using RetroRocket on a projected screen or a tablet, I want each card's owner controls to be clearly visible without hover or focus. Then the facilitator and team can easily see which cards each participant can edit.

**Why this priority**: This makes the P1 control usable in the product's typical live-session setting (shared screens, touch devices, no hover). It refines visibility, contrast and touch-target sizing and does not add new capability.

**Independent Test**: Load a board with owned cards in every one of the 15 card colours on a touch device and on a projector-sized desktop window. Confirm the trigger is visible at rest, meets contrast and touch-size targets, and appears only on the viewer's own cards.

**Acceptance Scenarios**:

1. **Given** any of the 15 available card colours, **When** the hub trigger is at rest, **Then** its icon meets a contrast ratio of at least 4.5:1 against the card background.
2. **Given** a mobile or tablet screen (narrower than 768px), **When** I view my own card, **Then** the trigger's touch area is at least 44×44px, **And** every option inside the panel is at least 44px tall, **And** the panel never exceeds 90% of the viewport height.
3. **Given** a desktop screen (768px or wider) with a mouse, **When** I view my own card, **Then** the trigger is at least 36×36px, **And** the panel repositions itself so it stays fully on screen near card or viewport edges.
4. **Given** the panel opens or closes, **When** the open/close animation plays, **Then** no surrounding content moves (no layout shift), **And** the animation lasts between 120ms and 200ms, **And** when the user has asked for reduced motion, the panel appears and disappears without movement (fade only, or instant).

---

### Edge Cases

- **Not the owner**: A participant who does not own a card sees no owner trigger, no colour selector and no edit/delete controls on it. This closes the current gap where non-owners are offered a colour control that the server then rejects.
- **Editing not allowed**: When card editing is not allowed in the current context, even the owner sees no owner trigger or owner controls. Examples are the board's grouping/selection mode and read-only previews such as the grouping suggestions dialog. There is no board-wide lock today, but any future one must follow the same rule.
- **Anonymous board**: Author names stay hidden as today. The hub still appears only on cards the current user created, and other cards show no owner controls. The trigger must not reveal ownership of other people's cards.
- **Editing becomes disallowed while the panel is open**: If editing is turned off (for example, grouping mode starts) while the owner has the panel open, the panel closes and the trigger disappears. Any colour or delete action that is still pending is not sent.
- **Card deleted elsewhere while the panel is open**: If the card is removed by another session or tab while its panel is open, the panel closes cleanly and nothing errors.
- **Delete fails**: If the deletion cannot be completed (network or server error), the card stays on the board and the panel leaves its busy state. The user sees a localized error message and can retry. Today a failed delete is silent and must not be silent after this change.
- **Colour change fails**: If saving the new colour fails, the card goes back to its previous colour and the user sees a localized error message.
- **Repeated activation**: Double-tapping Confirm delete or a colour swatch triggers the action only once.
- **Dragging**: Starting a drag on the card closes any open owner panel. The panel cannot be opened while the card is being dragged.
- **One panel at a time**: Opening the owner panel on one card closes any owner panel or facilitator menu that is open on another card.
- **Click outside / scroll**: Clicking or tapping outside the panel closes it without taking any action. If the card scrolls out of view, the panel closes or stays anchored to the card. It never floats detached from the card.
- **Long content / narrow cards**: On narrow mobile cards (around 160px wide), the trigger and the facilitator menu fit in the footer next to the timestamp without overlapping or truncating it beyond what happens today.
- **Grouped cards**: Individual cards shown inside a card group (expanded or collapsed view) use the same Owner Action Hub, with the same ownership and edit-permission rule as standalone cards. In read-only or preview contexts where editing is disabled (for example, the grouping suggestions preview), no hub is shown. The group container's own controls do not change.

## Requirements *(mandatory)*

### Functional Requirements

**Visibility & permissions**

- **FR-001**: The card MUST show one Owner Action Hub trigger only when the current user is the card's owner **and** editing is allowed. Every owner action (edit, colour, delete) MUST be governed by this single rule.
- **FR-001a**: Ownership MUST be determined by comparing the signed-in user's stable account identifier with the card creator's identifier, never by display name. The same identifier MUST be used for the "mine" state of likes and reactions.
- **FR-002**: The card, whether standalone or shown inside a card group, MUST NOT show a separate colour selector in its header area, or separate edit or delete buttons in its footer, for any user.
- **FR-003**: The hub trigger MUST be visible at rest. Hover or focus MUST NOT be required to reveal it.
- **FR-004**: The hub trigger MUST be hidden while the card is in edit mode, and MUST reappear when edit mode ends.
- **FR-005**: The hub trigger MUST sit in the card footer next to the facilitator's convert-to-action control when that control is present. Its icon MUST be clearly different from the facilitator control's icon.

**Panel contents & behaviour**

- **FR-006**: Activating the trigger MUST open a panel anchored to the trigger. The panel MUST contain, in order: "Edit card", a "Colour" section with the full set of available card colours, and "Delete card". Delete MUST be visually separated and styled as destructive.
- **FR-007**: The Colour section MUST show all 15 existing card colours, mark the card's current colour as selected, and identify each colour by its localized name for assistive technology.
- **FR-008**: Selecting a colour MUST update the card's colour immediately for the owner, sync it to all participants in real time, close the panel and return focus to the trigger. If saving fails, the colour MUST revert and the user MUST see a localized error.
- **FR-009**: Selecting "Edit card" MUST close the panel and put the card into its existing edit mode with the existing Save and Cancel controls. "Edit card" in the hub MUST be the only way into edit mode. Double-clicking, double-tapping or long-pressing the card content MUST NOT start editing.
- **FR-010**: Selecting "Delete card" MUST switch the panel to an inline confirmation state. This state MUST show a short warning that the action cannot be undone, a Confirm control and a Cancel control. No deletion happens until the user confirms.
- **FR-011**: While a confirmed deletion is in progress, the panel MUST show a busy state and MUST ignore further activations. If deletion fails, the card MUST remain, the busy state MUST clear, and a localized error MUST be shown.
- **FR-012**: After a successful deletion, focus MUST move to the next card in the same column. If there is none, it MUST move to the previous card, and if the column is empty, to that column's "add card" control.
- **FR-013**: The panel MUST close when the user presses Escape, clicks or taps outside it, completes an action, starts dragging the card, or loses edit permission. Except after a deletion, closing MUST return focus to the trigger.
- **FR-014**: The panel MUST stay fully inside the viewport. It MUST reposition when space is limited near screen edges and MUST NOT exceed 90% of the viewport height.
- **FR-015**: Only one card menu (owner hub or facilitator menu) MAY be open at a time across the board.

**Facilitator control preservation**

- **FR-016**: The facilitator's convert-to-action control MUST keep its current behaviour, placement in the footer and permissions. It MUST NOT be moved into the Owner Action Hub.

**Accessibility (WCAG 2.1 AA)**

- **FR-017**: The trigger MUST have a localized accessible name (e.g. "Card actions" / "Acciones de tarjeta") and MUST tell assistive technology whether its panel is open or closed. The open state MUST NOT be conveyed by visual change alone.
- **FR-018**: The trigger MUST show a clearly visible focus indicator when focused by keyboard.
- **FR-019**: When the panel opens, keyboard focus MUST move to its first option. Arrow keys MUST move between options and colour swatches. Tab MUST NOT escape the open panel to the rest of the board. Escape MUST close the panel.
- **FR-020**: Each option MUST have a descriptive localized accessible name: "Edit card", "Delete card", "Change colour", and each colour's name. Selecting a colour MUST be announced politely. Entering the delete confirmation state MUST be announced.
- **FR-021**: The trigger icon MUST reach a contrast ratio of at least 4.5:1 against every one of the 15 card background colours in both light and dark themes.
- **FR-022**: On viewports narrower than 768px, the trigger's touch area MUST be at least 44×44px and each panel option at least 44px tall. On wider viewports, the trigger MUST be at least 36×36px.

**Motion**

- **FR-023**: Panel open and close animations MUST NOT cause layout shift in the card or board. They MUST animate only visual position and opacity, and MUST last between 120ms and 200ms.
- **FR-024**: When the user has requested reduced motion, panel animations MUST be replaced by an instant or opacity-only transition. The card exit animation on delete MUST follow the same rule.

**Localization**

- **FR-025**: All new user-facing text MUST be localized in every supported language (Spanish and English) from the start. This covers the trigger label, Edit, Colour section title, Delete, the delete-confirmation message, Confirm, Cancel, and the delete and colour-change error messages.

### Key Entities

- **Card**: An existing retrospective card. Relevant attributes: content, colour (one of 15 curated colours), creator (owner), creation time. This feature adds no new data. It only changes how the owner reaches the existing edit, colour and delete actions.
- **Board edit permission**: The existing board-level flag that decides whether cards can be edited. Combined with ownership, it decides whether the Owner Action Hub shows.
- **Owner Action Hub (UI concept)**: A transient per-card panel with these states: *closed*, *open* (option list), *confirming delete*, *deleting* (busy). Its state lives only while it is open and is never persisted or shared with other participants.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every owner action (edit, colour, delete) is reached from one place on the card. The number of separate owner controls visible on an owned card at rest drops from 3 to 1.
- **SC-002**: 0 owner controls are shown to non-owners or when editing is not allowed, verified across owned, non-owned, grouped and anonymous-board cards. This includes the colour selector that non-owners can see today.
- **SC-003**: 0 accidental deletions: every deletion needs one explicit confirmation step, and 100% of cancelled confirmations leave the card intact.
- **SC-004**: The trigger meets ≥ 4.5:1 contrast on all 15 card colours in light and dark themes (15/15 pass).
- **SC-005**: The trigger touch target is ≥ 44×44px on mobile and ≥ 36×36px on desktop. Every panel option is ≥ 44px tall on mobile.
- **SC-006**: Opening or closing the panel causes zero layout shift. The animation lasts 120–200ms, or uses no movement when reduced motion is requested.
- **SC-007**: Automated accessibility scans of a board with owned and non-owned cards, with the panel closed, open and in delete confirmation, report 0 violations.
- **SC-008**: Users see the panel respond within 100ms of activating the trigger.
- **SC-009**: A keyboard-only user can open the hub, change the colour, enter and leave edit mode, and delete a card without a mouse. Focus is never lost or trapped incorrectly.
- **SC-010**: The facilitator's convert-to-action flow behaves exactly as before. All existing card and board automated tests still pass, with no regressions.
- **SC-011**: The new owner control's behaviour is covered by automated tests that exercise every acceptance scenario above, with at least 80% coverage of the new control.

## Assumptions

- **Chosen design (Proposal A, "Owner Dot Menu")**, confirmed on 2026-10-12: one trigger in the card footer opening a compact anchored panel, on every screen size. Proposal B (an always-visible toolbar in the header) was rejected because it crowds the author row on narrow mobile cards. Proposal C (a header chip that opens a bottom sheet on mobile) is deferred to a later story.
- **Delete confirmation style** (confirmed 2026-10-12): Confirmation is inline in the panel, not a separate modal or an undo toast, so a live retrospective is not interrupted (HU decision D7). Deletion is final once confirmed.
- **Ownership rule unchanged**: A card's owner is the user who created it. This rule and the board-level edit permission are reused as they are.
- **Colour palette unchanged**: The 15 curated card colours stay the same. The panel reuses the existing colour names and visual swatches. Whether the panel also shows the existing detail/name area under the swatch strip is a presentation choice left to planning.
- **Drag handle unchanged**: The card's drag handle stays hover/focus-revealed, a documented exception for pointer-only drag. It can now use the top-right space that the colour selector used to occupy.
- **Card header unchanged**: Author name and sentiment badge are not redesigned.
- **Panel state is local**: Open/closed and confirmation state are per-card and per-viewer, and are not persisted or synced.
- **Real-time sync reuses existing behaviour**: Colour changes and deletions propagate to other participants through the board's existing real-time mechanism.
- **Themes**: Light and dark themes are handled by the existing semantic design tokens. Contrast is still verified in both.
- **Trigger icon**: The exact icon is chosen during planning, from candidates such as a settings or sliders glyph. The only binding rule is that it must clearly differ from the facilitator menu's vertical-dots icon.

### Out of Scope

- Long-press / press-and-hold as the only way to reach owner actions, because controls must be visible at rest.
- Redesigning the facilitator's convert-to-action menu.
- A viewport-specific bottom sheet (Proposal C), planned as a later story.
- Drag-to-colour interactions.
- Column-level edit locking.
- Redesigning the card group container's own controls (group title, expand/collapse, ungroup). Individual cards inside a group are in scope.
- Changing the available card colour palette.
- Removing the reusable colour selector from the product. It stays available for other uses but is no longer used on the card itself.

## Dependencies

- Existing card edit mode (Save/Cancel) and the board's card update, delete and real-time sync behaviour.
- Existing curated card colour palette and localized colour names (spec 037).
- Existing facilitator convert-to-action capability.
- Project principles: Apple HIG design and motion (Principle XI) and WCAG 2.1 AA (Principle X).
