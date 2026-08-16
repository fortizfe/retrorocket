# Feature Specification: Fix Suggested Grouping Card Loss

**Feature Branch**: `046-fix-suggested-grouping-card-loss`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Siguiendo con el desarrollo de la agrupación de tarjetas recomendadas, actualmente existe un bug que cuando se selecciona una de las agrupaciones sugeridas, las tarjetas se borran y se pierden. Revisa este comportamiento para detectar donde está el bug y solucionarlo."

## Clarifications

### Session 2026-08-16

- Q: Should this fix also repair already-broken production data (groups created before the fix, whose cards are already invisible), or only prevent the issue going forward? → A: Fix going forward AND repair already-broken existing groups (backfill the correct column value) so previously "lost" cards reappear.
- Q: When forming a group from an accepted suggestion fails (e.g. the request errors partway through), what should the facilitator see? → A: A clear error message is shown; cards stay visible and ungrouped, and the facilitator can retry manually.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accepting a suggested grouping keeps its cards on the board (Priority: P1)

A facilitator opens the AI-generated grouping suggestions for a column and accepts one of the proposed groupings. Today, the moment the facilitator accepts, the member cards vanish from the board instead of reappearing as a visible group. The cards are not shown individually and are not shown grouped — they simply disappear from view, forcing the facilitator to believe the content was lost. The facilitator needs the accepted cards to remain fully visible on the board, now presented together as a group, exactly as happens when a group is created any other way in the app.

**Why this priority**: This is active data-loss-perceived behavior in a feature the team is actively developing (spec 044). It makes the "accept suggestion" action actively harmful to use, undermining trust in the whole grouping feature and blocking any further work on it until fixed.

**Independent Test**: Can be fully tested by adding several cards to a column, requesting suggestions, accepting one proposed grouping, and confirming that every card that was part of the accepted suggestion is still visible on the board — now shown together as a single group — with no card missing.

**Acceptance Scenarios**:

1. **Given** a column with cards and open grouping suggestions, **When** the facilitator accepts one suggested grouping, **Then** all cards that were part of that suggestion remain visible on the board, now displayed together as a group in their original column.
2. **Given** a suggestions panel with multiple proposed groupings, **When** the facilitator accepts more than one suggestion in the same session, **Then** each accepted grouping's cards remain visible as their own group, and no cards from any accepted or still-pending suggestion disappear.
3. **Given** an accepted suggestion has just formed a new group, **When** another participant is viewing the same board at the same time, **Then** that participant also sees the group and its cards appear, without needing to refresh the page.
4. **Given** a newly formed group from an accepted suggestion, **When** the facilitator uses existing group actions (expand/collapse, remove a card from the group, disband the group), **Then** those actions work the same way they do for groups created through any other existing method.
5. **Given** open grouping suggestions, **When** the facilitator rejects a suggestion or closes the suggestions panel without accepting it, **Then** no cards are altered, hidden, or removed — this action only affects the suggestion itself.

---

### Edge Cases

- What happens if the facilitator accepts a suggestion while another participant is simultaneously editing or deleting one of the same cards? The resulting state must not leave a card permanently invisible; existing conflict/last-write handling for cards applies.
- What happens if the network request to form the group fails partway through? The board must not end up in a state where cards are marked as grouped but no visible group exists for them; the facilitator sees a clear error message, and the cards remain visible and ungrouped so the facilitator can retry.
- What happens when a facilitator accepts a suggestion, then immediately reloads the board? The formed group and its cards must still be visible after reload, not just in the live session.
- What happens when a suggestion is accepted for a column, and the facilitator then requests new suggestions for the same column again? Cards already placed in a group from a prior acceptance must not be offered again as ungrouped suggestion candidates, and must remain visible in their group.
- What happens to groups that were already formed from accepted suggestions before this fix was deployed, whose cards are currently invisible? Those existing groups must be identified and repaired (not just newly formed groups going forward), so their cards reappear without requiring the facilitator to redo the grouping.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST keep every card that belongs to an accepted grouping suggestion visible on the board at all times; accepting a suggestion MUST NOT cause any card to disappear from view.
- **FR-002**: The system MUST display the group formed from an accepted suggestion in the same column where its member cards originated, immediately after acceptance, without requiring a manual page refresh.
- **FR-003**: The system MUST correctly associate a group formed from an accepted suggestion with its originating column, so the group is recognized as belonging to that column everywhere the board reads column-group associations (e.g., card counts, column contents, group rendering).
- **FR-004**: The system MUST propagate a newly formed group and its member cards to all participants currently viewing the board in real time, consistent with how other card and group changes already propagate.
- **FR-005**: The system MUST support existing group actions (expand/collapse, remove a member card, disband the group) on groups formed from accepted suggestions, identically to groups created by any other existing method.
- **FR-006**: Rejecting a suggestion or closing the suggestions panel without accepting MUST leave all cards — grouped or ungrouped — completely unaffected.
- **FR-007**: If forming a group from an accepted suggestion fails or only partially completes, the system MUST NOT leave affected cards in a state where they are marked as grouped but are not shown as part of any visible group.
- **FR-007a**: When forming a group from an accepted suggestion fails, the system MUST show the facilitator a clear error message, leave the affected cards visible and ungrouped, and allow the facilitator to retry accepting the suggestion.
- **FR-008**: The system MUST persist the group formed from an accepted suggestion so it remains visible, correctly placed in its column, after the board is reloaded.
- **FR-009**: The system MUST identify and repair pre-existing groups that were already broken by this bug (formed before the fix, with cards not visibly shown in any column), correcting their column association so their cards become visible again without requiring the facilitator to recreate the grouping.

### Key Entities

- **Grouping Suggestion**: A proposed cluster of two or more cards from the same column that the AI analysis judged to share a topic or similar content (defined in spec 044); accepting it is the trigger for the group-formation behavior this feature fixes.
- **Card Group**: A persisted group of cards that must always be associated with exactly one column — the column shared by its member cards — so it is correctly displayed as part of that column's contents.
- **Card**: Existing retrospective board entity; a card's grouped/ungrouped state and column must stay mutually consistent with the group it is reported to belong to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of accepted grouping suggestions result in all their member cards remaining visible on the board immediately after acceptance, across every board column.
- **SC-002**: 0 reported or reproduced cases of cards disappearing after accepting a suggested grouping, verified through repeated manual and automated regression testing of the accept-suggestion flow.
- **SC-003**: A group formed from an accepted suggestion becomes visible to every other participant viewing the board within the same real-time latency the app already achieves for other card and group changes, with no manual refresh needed.
- **SC-004**: A group formed from an accepted suggestion remains correctly visible, in its original column, after the board is reloaded, in 100% of cases.
- **SC-005**: 100% of pre-existing groups broken by this bug (formed before the fix) have their cards visible again after the repair is applied, with no facilitator action required.

## Assumptions

- This fix addresses a regression/gap in the "accept suggestion" flow introduced by the AI card grouping feature (spec 044); it does not change how suggestions are generated, scored, or presented, nor any other part of that feature's scope.
- Groups created through existing, already-working methods (e.g., manually forming a group by other in-app actions) are not affected by this bug and are treated as a regression baseline to protect, not something to redesign.
- The fix applies wherever the loss occurs in the accept-suggestion path, including any data sent to or stored by the system when a group is formed, since the visible symptom (cards disappearing) stems from how the new group is recorded and associated with its column.
- Repairing pre-existing broken groups (FR-009) only needs to correct their column association; the group's other recorded data (member cards, order, collapse state) is assumed to already be intact and does not need separate repair.
