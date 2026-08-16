# Feature Specification: Suggested Grouping Refinements

**Feature Branch**: `047-suggested-grouping-refinements`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Vamos a seguir refinando la funcionalidad de agrupaciones sugeridas de tarjetas.
- Cuando el modelo de IA encuentre una posible agrupación, debe también sugerir un título corto (no más de 35 caracteres) que identifique el tema de la agrupación. Dicho título debe permitir edición inline por si el usuario quiere modificar el título sugerido.
- Cuando se cambie de un modo de agrupación sugerida a cualquuiera de los demás modos, los grupos deben romperse y todas las tarjetas deben volver a agruparse por el métiodo seleccionado."

## Clarifications

### Session 2026-08-16

- Q: How should the 35-character limit be enforced on the inline-editable suggested title? → A: Hard cap while typing — the input simply won't accept a 36th character (like a standard `maxlength` field).
- Q: Does generating the per-group suggested titles need to fit within the same latency budget already promised for grouping itself (suggestions appear within a few seconds for a column of up to 25 cards)? → A: Same budget — titles must be ready together with the grouping suggestions; nothing appears mid-flow.
- Q: When a facilitator clears the suggested title to empty/whitespace and accepts the group anyway, what should the resulting group's default label be? → A: Numbered "Group N", matching the existing fallback style already used elsewhere in the app for untitled groups (e.g. board export), based on the group's position among that column's groups.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI proposes an editable title for each suggested group (Priority: P1)

A facilitator requests grouping suggestions for a column. Today each proposed group only shows its member cards and a similarity score, leaving the facilitator to invent a name for the topic themselves if they want one. The facilitator instead wants each proposed group to already carry a short, descriptive title suggested by the AI analysis, and wants to be able to tweak that title right there in the suggestions panel before accepting the group, in case the suggested wording isn't quite right.

**Why this priority**: This is the first and most visible improvement requested — it makes suggested groups immediately more useful and actionable without extra manual work, and it is fully self-contained (it does not depend on how mode switching behaves).

**Independent Test**: Can be fully tested by requesting suggestions on a column with groupable cards, confirming each proposed group displays a short title (at most 35 characters), editing that title inline, and confirming the edited title is what gets saved when the group is accepted.

**Acceptance Scenarios**:

1. **Given** the AI analysis proposes a group of similar cards, **When** the suggestions panel renders that proposal, **Then** it displays a short title (at most 35 characters) describing the group's shared topic alongside the member cards.
2. **Given** a proposed group's suggested title is shown, **When** the facilitator clicks/focuses the title and types a replacement, **Then** the title becomes editable inline within the panel without navigating away or opening a separate dialog.
3. **Given** the facilitator has edited a proposed group's title, **When** they accept that group, **Then** the resulting group is created with the edited title, not the original AI-suggested one.
4. **Given** the facilitator leaves a proposed group's title unedited, **When** they accept that group, **Then** the resulting group is created with the AI-suggested title.
5. **Given** multiple proposed groups are shown at once, **When** the facilitator edits the title of one, **Then** the titles of the other proposed groups remain unaffected.
6. **Given** the facilitator rejects a proposed group after editing its title, **When** the rejection is processed, **Then** the edited title is discarded along with the rest of the suggestion.

---

### User Story 2 - Switching away from suggested grouping breaks groups and re-sorts cards (Priority: P2)

A facilitator has accepted one or more suggested groupings in a column, then decides to switch that column to a different grouping mode (no grouping, or group by author). Today the previously accepted groups stay exactly as they are, ignoring the newly selected mode, so the column shows a confusing mix of leftover AI-formed groups plus the new grouping the facilitator actually asked for. The facilitator instead wants the act of switching away from suggested grouping to dissolve those groups and have every affected card re-sorted according to whichever mode they just selected.

**Why this priority**: This is a correctness/consistency fix that prevents a confusing, inconsistent board state, but it is independent of how titles are generated or edited (User Story 1) and can be delivered and verified on its own.

**Independent Test**: Can be fully tested by accepting at least one suggested group in a column, then switching that column's grouping mode to "no grouping" and separately to "group by author," and confirming in each case that the previously accepted group no longer exists as a group and its cards appear individually, sorted per the newly selected mode.

**Acceptance Scenarios**:

1. **Given** a column currently set to suggested grouping with one or more accepted groups, **When** the facilitator switches the column's mode to "no grouping," **Then** those groups are dissolved and every previously grouped card is shown individually, exactly as "no grouping" mode displays cards.
2. **Given** a column currently set to suggested grouping with one or more accepted groups, **When** the facilitator switches the column's mode to "group by author," **Then** those groups are dissolved and every previously grouped card is re-sorted into author-based groups alongside the column's other cards.
3. **Given** a column currently set to suggested grouping with pending (not yet accepted or rejected) suggestions still visible in the panel, **When** the facilitator switches the column's mode away from suggested grouping, **Then** the suggestions panel closes and those pending suggestions are discarded, in addition to any already-accepted groups being dissolved.
4. **Given** a column with accepted groups is being viewed by more than one participant at the same time, **When** one participant switches that column away from suggested grouping, **Then** every participant viewing the board sees the groups dissolve and the cards re-sort accordingly.
5. **Given** a column set to suggested grouping with no accepted groups yet, **When** the facilitator switches to another mode, **Then** nothing needs to be dissolved and the cards simply appear per the newly selected mode.

---

### Edge Cases

- What happens when the AI-suggested title would exceed 35 characters? It is truncated to 35 characters before being shown, and the inline-edit field itself enforces a hard 35-character cap so no keystroke or paste can push it past that limit.
- What happens when the user edits a suggested title down to empty or whitespace-only text and then accepts the group? The system falls back to a numbered default label ("Group N", based on position) rather than creating a group with a blank title.
- What happens to a card's own content, votes, likes, and reactions when its group is dissolved by a mode switch? They must remain unchanged on the individual card afterward.
- What happens when a facilitator switches directly from one non-suggestions mode to another non-suggestions mode (e.g., "no grouping" to "group by author")? No AI-formed groups exist to dissolve, so cards simply re-sort per the newly selected mode, unchanged from current behavior.
- What happens when a facilitator re-triggers suggestions while already in suggested-grouping mode (not switching away)? Existing accepted groups in that column are unaffected; this scenario is unchanged from current behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the AI-based grouping analysis proposes a group, the system MUST include a short suggested title (at most 35 characters) that identifies the group's shared topic, shown alongside the proposed group.
- **FR-001a**: Suggested titles MUST be ready and displayed together with their proposed groups — the system MUST NOT show a proposed group before its title is available, and title generation MUST fit within the same response-time target already required for grouping suggestions to appear (within a few seconds, for a column of up to 25 cards).
- **FR-002**: The system MUST let the user edit a proposed group's suggested title inline within the suggestions panel, without leaving the panel or opening a separate dialog.
- **FR-003**: The inline title-edit field MUST enforce the 35-character limit as a hard input cap — the field MUST NOT accept a 36th character while typing or pasting, matching a standard `maxlength`-style constraint. If the AI-suggested title itself is longer than 35 characters, it MUST be truncated to 35 characters before being shown/populated into the editable field.
- **FR-004**: When a proposed group is accepted, the system MUST create the group using the current title shown for that proposal — the user's edited text if it was changed, or the original AI-suggested title otherwise.
- **FR-005**: When a proposed group's title is edited down to empty or whitespace-only text and then accepted, the system MUST apply a numbered default label (e.g., "Group N", based on the group's position among that column's groups) instead of creating a group with a blank title, matching the existing default-label style already used elsewhere in the app for untitled groups.
- **FR-006**: Editing or rejecting one proposed group's title MUST NOT affect the title of any other proposed group shown in the same panel.
- **FR-007**: Rejecting a proposed group MUST discard any inline title edit made to it, along with the rest of the proposal.
- **FR-008**: When a column's grouping mode is changed away from suggested grouping to any other mode, the system MUST dissolve every group in that column that was created by accepting a suggestion, releasing their member cards back to individual, ungrouped cards.
- **FR-009**: Immediately after dissolving groups per FR-008, the system MUST re-sort the column's cards according to the newly selected grouping mode.
- **FR-010**: Dissolving groups per FR-008 MUST preserve each affected card's own content, votes, likes, reactions, and authorship unchanged.
- **FR-011**: If a column has pending (not yet accepted or rejected) suggestions visible when its mode is changed away from suggested grouping, the system MUST close the suggestions panel and discard those pending suggestions, in addition to dissolving already-accepted groups.
- **FR-012**: The dissolving and re-sorting described in FR-008/FR-009 MUST be visible to every participant currently viewing the board, consistent with the board's existing real-time collaborative behavior.
- **FR-013**: Switching between grouping modes that are neither the current nor the target mode "suggested grouping" (e.g., "no grouping" to "group by author") MUST continue to behave as it does today, since no AI-formed groups exist to dissolve in that case.

### Key Entities

- **Grouping Suggestion**: A proposed cluster of two or more cards from the same column that the AI analysis judged to share a topic, now also carrying a short (≤35 character) suggested title that the user may edit before accepting or discarding along with the rest of the proposal when rejecting.
- **Card Group**: Existing entity representing an accepted grouping of cards; now also understood as something that can be dissolved as a side effect of switching its column away from suggested-grouping mode, not only via explicit manual ungrouping.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of AI-proposed groups display a suggested title of no more than 35 characters at the moment they are shown to the user, with no group appearing before its title is ready, for columns of up to 25 cards within the existing few-seconds response-time target.
- **SC-002**: Facilitators can revise a proposed group's title and accept it without leaving the suggestions panel, in a single continuous interaction (no extra navigation or dialogs).
- **SC-003**: 100% of the time a facilitator switches a column away from suggested-grouping mode, previously accepted groups in that column no longer appear as groups and their cards are shown per the newly selected mode.
- **SC-004**: No card's own content, votes, likes, or reactions are altered or lost when its group is dissolved as part of a mode switch, verified across all participants viewing the board at the time.

## Assumptions

- The on-device AI capability that computes grouping suggestions (embeddings-based, per the prior refinement of this feature) will be extended, or paired with a lightweight companion technique, to also produce a short representative title per proposed group; the specific technique used to generate that title is an implementation detail left to the planning phase, not a change to user-facing scope.
- "Dissolving" a group as described in User Story 2 reuses the same underlying disband behavior already available for manually ungrouping cards today — it removes the group record and releases its cards, without deleting or altering any card data.
- Only groups created through the accept-suggestion flow are affected by the mode-switch-dissolves-groups behavior, since accepting a suggestion is currently the only way a group is created in this feature.
- The 35-character limit applies to the group's title text itself, not to any UI truncation indicator (such as an ellipsis) that might be shown separately when space is constrained.
