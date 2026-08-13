# Feature Specification: AI Card Grouping

**Feature Branch**: `044-ai-card-grouping`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Quiero refinar y mejorar la parte de los boards (retrospectivas) que propone agrupaciones de tarjetas por temas y contenidos similares. Lo primero es ajustar el desplegable. Actualmente aparece en la esquina superior izquierda y quiero que aparezca pegado al botón como el resto de popups de la aplicación. Tambien quiero reenfocar la funcionalidad de esa feature, para que en vez de calcularlo con un algoritmo como ahora, se calcule usando el modelo de IA descargado que se usa para el análisis de sentimiento. Me gustaría que se propusioeran agrupacioens de tarjetas similares o de temas similares basado en el análisis con el modelo de IA. Elimina el código antiguo a este respecto con el fin de quitar ruido del código."

## Clarifications

### Session 2026-08-13

- Q: The spec's SC-004 says suggestions arrive "within a few seconds... for a typical column size," but doesn't pin a concrete scale target. What column size should the "few seconds" response-time target be validated against? → A: Up to 25 cards per column
- Q: Should cards written in different languages on the same topic be proposed as a group (cross-language matching), or does grouping only need to work reliably within a single language? → A: Grouping only needs to work reliably for cards written in the same language; mixed-language columns may not group well across languages
- Q: Should a proposed group have a maximum card count cap (like today's algorithm), or can a group be unbounded in size if the AI judges the cards similar? → A: Keep a maximum group size cap so groups stay reviewable/actionable

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Suggestions popup opens next to its button (Priority: P1)

A facilitator running a retrospective clicks the "Suggestions" option in a column's menu to see proposed card groupings. Today the resulting popup can appear detached from that button, floating in the top-left corner of the screen regardless of where the column is on the board. The facilitator instead needs the popup to open right next to the button they clicked, the same way every other popup/menu in the app behaves, so the connection between the action and the result is visually obvious and the popup doesn't cover unrelated parts of the board.

**Why this priority**: This is a visible, confusing bug affecting the feature's usability today. It is a self-contained fix that does not depend on how groupings are computed, and it immediately improves trust and orientation for every user of the feature.

**Independent Test**: Can be fully tested by opening the grouping-suggestions popup from a column in any position on the board (left edge, right edge, center, top, scrolled down) and confirming the popup consistently renders attached to the triggering button and fully within the visible screen area.

**Acceptance Scenarios**:

1. **Given** a board with multiple columns, **When** a user clicks "Suggestions" on a column near the left edge of the board, **Then** the popup appears immediately next to that column's menu button, not in an unrelated corner of the screen.
2. **Given** a board with multiple columns, **When** a user clicks "Suggestions" on a column near the right edge or bottom of the visible board area, **Then** the popup repositions itself so it stays fully visible on screen while remaining anchored to the triggering button.
3. **Given** the suggestions popup is open, **When** the user scrolls or resizes the browser window, **Then** the popup's position updates to stay attached to its button (or closes, consistent with how other popups in the app handle this).

---

### User Story 2 - Groupings reflect AI-based topic/content similarity (Priority: P2)

A facilitator wants the proposed card groupings to actually reflect what cards are about, not just how similar their wording is. Today's suggestions come from a text-matching algorithm that misses cards that describe the same underlying topic in different words. The facilitator wants suggestions generated using the same on-device AI capability the app already uses to understand card sentiment, so that groupings feel more like a human reading the cards and noticing shared themes.

**Why this priority**: This is the substantive quality improvement the user is asking for and the main reason to revisit this feature, but it builds on the popup existing and behaving correctly (User Story 1), and delivers value independently of the positioning fix.

**Independent Test**: Can be fully tested by adding a set of cards to a column that describe similar topics using varied wording (no shared keywords) and confirming the "Suggestions" action proposes them as a group, then adding clearly unrelated cards and confirming they are not grouped together.

**Acceptance Scenarios**:

1. **Given** a column containing several cards that describe the same underlying topic using different words or phrasing, **When** the user requests suggestions, **Then** those cards are proposed as a group.
2. **Given** a column containing cards on clearly unrelated topics, **When** the user requests suggestions, **Then** those cards are not proposed as a group together.
3. **Given** suggestions have been generated, **When** the user reviews a proposed group, **Then** the user can accept it (merging the cards into a group) or reject it, consistent with today's behavior.
4. **Given** a column with too few cards to form any meaningful group, **When** the user requests suggestions, **Then** the system clearly communicates that no groupings were found rather than showing an empty or broken popup.

---

### Edge Cases

- What happens when the on-device AI analysis is still loading/downloading when the user requests suggestions? The system must show a clear in-progress state rather than an empty or frozen popup.
- What happens when the AI-based analysis cannot run at all (e.g., the user's browser or device does not support it)? The system must show a clear, non-technical message that the feature is unavailable, without silently falling back to the old algorithm (which is being removed).
- What happens when a column has only 0 or 1 card? No groups are proposed, and the system communicates this clearly instead of erroring.
- What happens when the trigger button is at the very edge of the viewport? The popup must flip or shift to stay fully on-screen while remaining visually anchored to the button, matching the app's other popups.
- What happens when cards are added, edited, or removed by another participant while the suggestions popup is open? Suggestions may become stale; reopening the popup should reflect current cards.
- What happens with a column containing cards in multiple languages? Grouping quality is only guaranteed within a single language; cards on the same topic written in different languages may not be proposed as a group together.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the card-grouping suggestions popup visually anchored to (opening immediately adjacent to) the button that triggered it, matching the positioning behavior used by every other popup/menu in the application.
- **FR-002**: The system MUST keep the suggestions popup fully within the visible screen area, repositioning it (e.g., flipping to the opposite side) when the default position would render it partly or fully off-screen, consistent with other popups in the app.
- **FR-003**: The system MUST compute proposed card groupings using the same on-device AI capability already used for sentiment analysis of cards, rather than the current text-similarity algorithm.
- **FR-004**: Proposed groupings MUST reflect similarity of topic or meaning between cards' written content, not merely literal keyword or character overlap.
- **FR-005**: Users MUST be able to review each proposed grouping and individually accept or reject it, preserving today's accept/reject interaction.
- **FR-005a**: The system MUST cap the number of cards in a single proposed group so groups remain small and reviewable, rather than allowing an unbounded group to form.
- **FR-006**: The system MUST scope proposed groupings to cards within the same column, consistent with current behavior.
- **FR-006a**: Grouping quality is only required to be reliable for cards written in the same language; the system is not required to match same-topic cards across different languages within a mixed-language column.
- **FR-007**: The system MUST show a clear loading/in-progress state while AI-based grouping analysis is running.
- **FR-008**: The system MUST show a clear, user-understandable message when AI-based grouping cannot be computed (e.g., analysis unavailable or fails), without silently falling back to a different computation method.
- **FR-009**: The system MUST remove the previous text-similarity grouping algorithm and any code, configuration, or tests that exist solely to support it, once the AI-based computation replaces it, so no unused grouping logic remains in the codebase.
- **FR-010**: The system MUST preserve all other existing user-facing behavior of the grouping-suggestions feature (how it is triggered, how suggestions are displayed and actioned) except for where the popup appears and how groupings are computed.
- **FR-011**: The system MUST perform AI-based grouping analysis without transmitting card content to an external service, consistent with the on-device, local-only approach already used for sentiment analysis.

### Key Entities

- **Grouping Suggestion**: A proposed cluster of two or more cards from the same column that the AI analysis judged to share a topic or similar content; has member cards and is individually accepted or rejected by the user.
- **Card**: Existing retrospective board entity whose text content is the input to both sentiment analysis and grouping-suggestion analysis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The grouping-suggestions popup appears attached to its triggering button, fully within the visible screen area, in 100% of cases regardless of the triggering column's position on the board.
- **SC-002**: Facilitators reviewing proposed groupings judge them as topically coherent (cards that genuinely belong together) in at least 80% of proposed groups during usability validation, an improvement over the prior keyword-matching approach.
- **SC-003**: No card content leaves the user's device during grouping analysis, preserving the same privacy posture as the existing sentiment-analysis feature.
- **SC-004**: Users receive grouping suggestions (or a clear "no groupings found" / "unavailable" message) within a few seconds of requesting them for a column of up to 25 cards, with no indefinite loading state.
- **SC-005**: The codebase contains exactly one card-grouping computation approach after this change, with no leftover, unused implementation of the prior algorithm.

## Assumptions

- The application's existing on-device AI infrastructure (used today to download and run a sentiment-analysis model locally, with no server calls) will be extended or reused to also produce the signal needed to judge topical/content similarity between cards, preserving the same local-only, privacy-preserving execution model. Because today's sentiment models only output a sentiment label and confidence score (not a reusable representation of meaning), delivering genuine semantic grouping may require this on-device pipeline to also load a small additional model suited to comparing text meaning — this is an implementation detail left to the planning phase, not a change to user-facing scope.
- Grouping suggestions remain scoped to cards within a single column, matching current behavior; cross-column grouping is out of scope for this refinement.
- The feature remains manually triggered by the user (via the existing "Suggestions" action) rather than becoming automatic or continuous.
- No fallback to the removed text-similarity algorithm is provided if AI-based analysis is unavailable; the feature instead clearly communicates unavailability, per the user's request to remove the old code entirely.
- The separate server-side card-grouping logic used elsewhere in the backend is out of scope for this refinement, which targets the client-side board "Suggestions" popup and its computation.
