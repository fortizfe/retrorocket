# Feature Specification: Fix Typing Indicator Ghost State on Column Switch

**Feature Branch**: `027-fix-typing-status-race`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "Test que falla: e2e/retrospective-board.spec.ts:596 — detecta 2 indicadores \"está escribiendo\" visibles a la vez para el mismo usuario (columna 1 y columna 2), violando el modo estricto de Playwright. Causa: OptimizedTypingStatusService.setTypingStatusDebounced envía cada escritura isActive:true/false sin esperar a la anterior ni garantizar orden. Si la escritura false de la columna 1 llega al backend antes que una true tardía de esa misma columna, el documento de Firestore se resucita y el indicador \"fantasma\" tarda hasta ~3.5s en desaparecer. Por qué ahora se ve: el commit c80297c (el fix del parpadeo) eliminó el timer de 300ms que antes auto-corregía este estado obsoleto casi al instante, así que la condición de carrera —que ya existía— ahora es visible durante mucho más tiempo. Arreglo sugerido: serializar por columna las llamadas a setTypingStatus para que lleguen al servidor en el mismo orden en que se emiten."

## Clarifications

### Session 2026-08-07

- Q: If an individual typing-status write fails (e.g., network error) while an earlier update for the same participant/column is still pending in the ordering queue, should the system retry it before letting later updates proceed (strict ordering), or discard it and continue immediately with the next queued update (best-effort ordering)? → A: Discard the failed update and continue immediately with the next queued update; rely on the existing disconnect-safety window to correct any resulting inconsistency.
- Q: Is 1 second the right "settle" bound for SC-002 (how quickly other participants see the indicator land in its correct final column after a switch), given the ordering guarantee may require waiting on a pending write? → A: Yes, keep 1 second.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Typing indicator follows the participant, not a stale column (Priority: P1)

A participant is typing a new card in one column, then stops (submits, cancels, or clears the text) and starts typing in a different column. Other participants watching the board must see the indicator move cleanly: it disappears from the first column and appears in the second, with no moment where both columns show that same participant as "typing" at once.

**Why this priority**: This is the exact defect reported by the failing regression test. A ghost indicator lingering in a column the participant already left is actively misleading — it tells viewers someone is drafting a card in a place no one is, which undermines the trust the whole typing-indicator feature (026) was built to establish.

**Independent Test**: Can be fully tested by having one participant type in column A, stop, then immediately type in column B, while a second participant observes — at no point should the second participant see the indicator active in both columns simultaneously, and it delivers value by making the live status trustworthy.

**Acceptance Scenarios**:

1. **Given** a participant is typing in column A and another participant is watching, **When** the first participant stops typing in column A (via submit, cancel, or clearing the text) and starts typing in column B, **Then** the watching participant sees the indicator disappear from column A and appear in column B, with no period where both are shown for that participant.
2. **Given** a participant switches columns quickly and repeatedly while typing, **When** a watching participant observes the board over that whole period, **Then** at every moment at most one column shows that participant as typing.
3. **Given** network conditions vary in speed (some status updates travel faster than others), **When** a participant stops typing in one column and starts in another, **Then** the final state watching participants see always reflects the participant's most recent action, never an earlier one arriving late.

---

### User Story 2 - Stopped typing stays stopped (Priority: P2)

A participant stops typing entirely (submits or abandons a card, closes the compose box) and does not start typing again anywhere. Other participants must see the indicator clear promptly and it must not reappear on its own afterward.

**Why this priority**: A self-clearing indicator that spontaneously reactivates — even briefly — is confusing and erodes confidence in the live collaboration features, but it's a narrower case than the column-switch scenario in User Story 1.

**Independent Test**: Can be fully tested by having a participant type, then stop completely, and observing from a second session that the indicator clears and stays cleared for a sustained period afterward.

**Acceptance Scenarios**:

1. **Given** a participant was typing and then stops with no further activity, **When** a watching participant keeps observing the board for the following several seconds, **Then** the indicator clears within the existing expected time bound and never reappears without a new, genuine typing action.

---

### User Story 3 - Multiple participants typing in different columns stay independent (Priority: P3)

Two or more participants are typing at the same time in different columns. Each participant's indicator must accurately reflect only their own current activity, unaffected by another participant's status changes.

**Why this priority**: Validates that the fix for the ordering defect doesn't introduce cross-participant interference; lower priority because it's a coverage/regression-safety scenario rather than the reported defect itself.

**Independent Test**: Can be fully tested by having two participants type simultaneously in two different columns and confirming a third, watching participant sees exactly two accurate, independent indicators throughout.

**Acceptance Scenarios**:

1. **Given** two participants are typing in two different columns at the same time, **When** one of them stops and switches to a third column, **Then** the other participant's indicator is unaffected throughout.

### Edge Cases

- What happens when a participant switches columns faster than the time it takes for a status update to reach the server (e.g., rapid clicking between "add card" forms)?
- How does the system behave when a status update is delayed enough that it would otherwise arrive after a more recent one for the same participant and column?
- What happens if a participant's stop-typing signal never arrives at all (e.g., they lose connection mid-typing)? The indicator must still clear within the existing bounded safety window rather than persist indefinitely.
- What happens when a participant types, stops, and immediately starts again in the very same column?
- What happens when an individual typing-status update itself fails outright (e.g., a network error), rather than merely arriving late? The system discards that failed update and continues immediately with the next queued update for that participant/column, rather than retrying or blocking later updates — any resulting inconsistency is corrected by the existing disconnect-safety window (FR-004/FR-007).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST ensure that, for any single participant and column, "typing" status updates take effect for other viewers in the exact order the participant performed the corresponding actions (start typing, stop typing), regardless of the order in which those updates happen to reach the server over the network.
- **FR-002**: The system MUST NOT show a participant as "typing" in a column after that participant has explicitly stopped in that column (via submit, cancel, clearing the text, or losing focus), even under variable network delivery timing.
- **FR-003**: At any given moment, the system MUST show at most one active "typing" column per participant to other viewers — never two or more columns simultaneously attributed to the same participant.
- **FR-004**: If a participant disconnects or otherwise fails to send an explicit stop signal, the system MUST still clear their typing indicator for other viewers within the existing bounded safety window (no change to that existing disconnect-cleanup behavior).
- **FR-005**: The fix MUST preserve the existing behavior that a typing indicator stays continuously visible, without flickering off, for as long as a participant keeps actively typing in a column (established by the prior flicker fix; this feature must not regress it).
- **FR-006**: The existing automated regression test covering this scenario (typing indicator visibility across a column switch) MUST pass consistently, not intermittently, once this fix is in place.
- **FR-007**: If an individual typing-status update fails to reach the server (e.g., a network error) while an earlier update for the same participant and column is still pending, the system MUST discard the failed update and proceed immediately with the next queued update, rather than retrying it or blocking later updates — any resulting inconsistency is corrected by the existing disconnect-safety window (FR-004).

### Key Entities

- **Typing Indicator**: Represents one participant's live "is typing" status in one specific column of a retrospective board. Identified by the combination of participant and column; carries an active/inactive state and a recency signal used both for display to other participants and for the disconnect-safety clearing behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across 20 consecutive runs of the existing column-switch regression test (locally or in CI), zero runs observe more than one column simultaneously showing the same participant as typing.
- **SC-002**: When a participant stops typing in one column and starts in another, other participants see the indicator fully settle into its correct final location (old column cleared, new column shown) within 1 second under normal network conditions.
- **SC-003**: The disconnect-safety clearing behavior (indicator clears within roughly 3.5 seconds when a participant disconnects mid-typing without an explicit stop) continues to work exactly as before this fix.
- **SC-004**: The no-flicker guarantee from the prior fix (indicator stays visible without interruption while a participant keeps typing continuously) continues to hold, with zero regressions observed in the existing continuous-visibility regression test.

## Assumptions

- This feature is a targeted correctness fix for the ordering defect described above, not a redesign of the typing-indicator feature; the existing visual design, accessibility live region, and disconnect-safety window (026) are all retained unchanged.
- "Variable network conditions" refers to the kind of latency jitter already observed between a local development environment and a CI environment running against the Firebase emulator under load; no specific network-simulation tooling is assumed.
- Only one browser tab/session per participant is in scope; a participant deliberately typing in the same board from two tabs simultaneously is out of scope.
- The fix applies to the typing-status write path only; no change to how typing status is read or rendered by viewers is required.
