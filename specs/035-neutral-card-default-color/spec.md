# Feature Specification: Neutral Default Card Color

**Feature Branch**: `035-neutral-card-default-color`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Quiero que en la vista de los board (retrospectivas), cambie el comportamiento por defecto del color de la tarjeta cuando se añaden nuevas tarjetas. Actualmente, al añadir una tarjeta a una columna, se aplica a su background el color de la columna en la que se añade (verde si va a que se hizo bien, rojo si va a que me retraso, etc). Lo que quiero es eliminar ese comportamiento y que la tarjeta se añada al panel sin aplicar el color de la columna."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a card without an inherited column color (Priority: P1)

As a participant in a retrospective board, when I open the "add card" form in any column and submit a new card without manually choosing a color, I want the card to be added with a neutral background instead of automatically taking on that column's associated color, so that the color of a card only ever reflects a choice I actually made.

**Why this priority**: This is the entire scope of the requested change — it directly reverses the current default-coloring behavior that the user wants removed. Without this, the feature delivers no value.

**Independent Test**: Can be fully tested by opening the "add card" form in any column (e.g. a "went well" column that currently defaults to green), submitting a new card without touching the color picker, and verifying the created card has the neutral default background rather than the column's associated color.

**Acceptance Scenarios**:

1. **Given** a board column that currently defaults new cards to a color associated with that column (e.g. green for "what went well", red for "what went wrong"), **When** a user opens the add-card form for that column and submits a card without changing the pre-selected color, **Then** the created card is added with the neutral default background, not the column's associated color.
2. **Given** any column in any board template (e.g. Start/Stop/Continue, Mad/Sad/Glad, custom columns), **When** a user adds a card without manually selecting a color, **Then** the resulting card's background is the same neutral default regardless of which column it was added to.
3. **Given** the add-card form is open, **When** the user inspects the color picker before submitting, **Then** the neutral/default swatch is shown as pre-selected instead of a column-associated color.

---

### User Story 2 - Manually choose a card color (Priority: P2)

As a participant, I want to still be able to pick a specific color for a card myself, so that I can highlight or categorize cards when I choose to, independent of the column default.

**Why this priority**: The user's request is only to remove the automatic default; it does not ask to remove manual color selection. Preserving this ensures the change doesn't regress existing functionality.

**Independent Test**: Can be fully tested by opening the add-card form, explicitly selecting a non-default color from the color picker, submitting, and verifying the created card retains that manually chosen color.

**Acceptance Scenarios**:

1. **Given** the add-card form is open with the neutral color pre-selected, **When** the user manually picks a different color from the color picker and submits the card, **Then** the created card is added with the manually chosen color.
2. **Given** a card already exists on the board, **When** the user edits the card and changes its color, **Then** the card's color updates to the newly chosen color (unaffected by this change).

---

### Edge Cases

- What happens for columns that previously had no explicit color mapping and already fell back to a neutral default? Behavior is unchanged — they already used the neutral default.
- What happens to cards created before this change that already carry a column-inherited color? They are unaffected; this change only affects the default applied to newly created cards going forward, not existing card data.
- What happens when a user adds a card, does not touch the color picker, but the form is re-opened after a prior submission (e.g. adding multiple cards in a row)? Each new add-card form instance must pre-select the neutral default again, not the color left over from a previous manual selection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT pre-select or apply a column-associated color when a new card is created; the color previously derived from the target column's identity or title MUST no longer influence the card's default background.
- **FR-002**: The system MUST pre-select the same neutral default background for a new card's color regardless of which column the card is being added to.
- **FR-003**: The system MUST continue to allow users to manually select any available color for a card before or after creation via the existing color picker.
- **FR-004**: When a user submits a new card without manually changing the pre-selected color, the created card MUST be persisted with the neutral default color.
- **FR-005**: The neutral default color MUST be visually distinct from every column-associated color previously used as a default, so users can tell at a glance that no column-based color was applied.
- **FR-006**: Existing cards created before this change MUST retain their currently stored color and MUST NOT be retroactively altered.

### Key Entities

- **Card**: A retrospective board item with a background color attribute. Previously defaulted to a color derived from its parent column at creation time; now defaults to a fixed neutral color regardless of parent column.
- **Column**: A grouping within a board (e.g. "What went well", "What went wrong") that previously supplied a suggested/default card color; after this change, no longer influences a new card's default color.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created cards across all columns and board templates are added with the neutral default background when the user does not manually change the color, regardless of the column they were added to.
- **SC-002**: Users can still successfully assign any of the previously available colors to a card in 100% of cases where they choose to do so manually.
- **SC-003**: No existing card's stored color changes as a result of this update.

## Assumptions

- "Neutral" default means the same non-color (white/blank) background that is already used elsewhere in the system as the fallback for columns without a recognized color mapping, so no new color needs to be introduced.
- This change applies only to the default/pre-selected color shown when creating a new card; it does not remove or alter the manual color picker, nor any column-level visual styling (e.g. column headers keeping their own color identity).
- This change applies uniformly across all board templates and custom columns; no column is exempted from losing its default-color behavior.
- No data migration is required or desired for previously created cards.
