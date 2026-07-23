# Feature Specification: Accurate AI Card Sentiment & Team Mood Analysis

**Feature Branch**: `011-ai-sentiment-accuracy`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Quiero que se investigue como funciona actualmente el análisis con IA para establecer el estado de las tarjetas. Actualmente algunas tarjetas salen con resultados poco satisfactorios. También hay desvíos en el análisis de estado de ánimo del equipo. Quiero que investigues el estado actual, que identifiques desvios y mejoras y las apliques. Siempre desde el enfoque de la componetización y library first. Utiliza librerías de terceros si es necesario. elimina el código que no sea necesario para el mismo."

## Overview

RetroRocket runs an in-browser AI analysis that, for each retrospective card,
infers a sentiment "state" (positive / negative / neutral with a confidence
value) and aggregates those per-card states into a team-mood report the
facilitator uses to read the room. This feature investigates the current
behaviour, corrects the deviations that make some card states and the team-mood
report unreliable, and restructures the capability to align with the
constitution's Library-First and componentization principles — including
adopting or upgrading a proven third-party library where it improves accuracy
or reduces bespoke code, and removing code that no longer serves the feature.

This is a correctness and quality feature: the *what* the user sees (a card
badge, a team-mood score, facilitator insights) stays the same, but the results
must become trustworthy, internally consistent, and cheaper to maintain.

## Clarifications

### Session 2026-07-22

- Q: What should a fully-neutral board's headline mood map to on the 1–10 scale? → A: Slightly-low "needs attention" band (~4/10, "Preocupante") — absence of any positive signal is treated as a mild concern, never a positive or "good" mood. (Implementation note: resolves to ≈ 4.6 so the score keeps the "Preocupante" label; exactly 4.0 would render as "Malo" under the existing label bands.)
- Q: When the analysis model or its version changes, what happens to previously stored card states? → A: Recompute — a stored state is stale if the card text OR the model id/version differs; the model identity+version is stored with each result.
- Q: Which direction for the inference library (FR-016)? → A: Migrate from `@xenova/transformers` v2 to its maintained successor `@huggingface/transformers` (v3), subject to the same dependency-vetting / bundle-size gate.
- Q: How should language be handled on a mixed ES/EN board? → A: A single multilingual model handles both languages; no per-card language detection or routing (KISS). Accuracy gains come from better text normalization and the maintained library/model, not routing.

## Current-State Findings *(background — motivates the requirements below)*

The investigation of the existing implementation surfaced the following
deviations. They are recorded here as the rationale for the requirements; the
requirements themselves stay outcome-focused.

**Per-card state ("estado de las tarjetas")**

- **F1 — Results are never trusted across reloads.** Analysis outcomes are
  persisted, but each outcome is stored keyed to a fingerprint derived from the
  card's identifier instead of the card's text. Because the stored fingerprint
  can never match the card's actual text, the app cannot tell whether a saved
  result is still valid, so every card is re-analysed from scratch on each load.
  This wastes work and can surface transient/placeholder states before the
  re-analysis settles.
- **F2 — Long card text is analysed unbounded.** Card content is passed to the
  model without any length normalization. Long cards (pasted notes, links,
  multiple sentences) can be silently cut by the model or yield low-quality
  states, which is a likely source of the "unsatisfactory" card results the user
  reports.
- **F3 — The confidence bar to *display* a card state differs from the bar to
  *count* it.** A card can be confident enough to show a badge to participants
  yet be excluded from the team-mood aggregation (or vice-versa), so what the
  team sees on the board and what the facilitator sees in the report disagree.

**Team mood ("estado de ánimo del equipo")**

- **F4 — Expected negativity is treated inconsistently.** Negative cards in a
  column whose purpose is to capture problems (e.g. "what didn't go well") are
  correctly discounted when computing the headline mood score, but the *same*
  negative cards still trigger "critical/warning negativity" alerts and skew the
  overall negative percentage. The score and the alerts therefore tell different
  stories about the same board.
- **F5 — A fully neutral board scores as a good mood.** The mood scoring
  over-rewards neutral cards, so a board with no clearly positive signal can be
  reported as a clearly positive team mood, misleading the facilitator.
- **F6 — Mood score can be stale.** When column roles/titles change, the
  headline mood score is not always recomputed, so it can lag behind the data it
  claims to summarise.
- **F7 — Aggregation and display use different confidence floors.** The
  team-mood report and the per-card badges apply different minimum-confidence
  rules, compounding F3 at the report level.

**Structure / maintainability**

- **F8 — Bespoke plumbing around the model.** The capability is spread across
  many hand-rolled hooks/services (worker lifecycle, caching, results store,
  persistence) with library type-safety gaps, rather than sitting behind one
  clear, testable module boundary.
- **F9 — Dead / unused code.** At least one persistence method and one or more
  UI/utility exports in the sentiment feature have no remaining callers and
  should be removed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trustworthy card states (Priority: P1)

As a retrospective participant, when I add or edit a card, the sentiment state
shown on that card reflects what I actually wrote, so I trust the board's
signals instead of being distracted by wrong or flip-flopping badges.

**Why this priority**: This is the core complaint ("algunas tarjetas salen con
resultados poco satisfactorios") and the foundation every other outcome builds
on — the team-mood report is only as good as the per-card states feeding it.

**Independent Test**: With analysis enabled, add a representative set of Spanish
and English cards (clearly positive, clearly negative, neutral, very long, and
very short) and confirm each card's displayed state matches human judgement and
does not change on reload when the text is unchanged.

**Acceptance Scenarios**:

1. **Given** a clearly negative card in any language, **When** it is analysed,
   **Then** it is shown as negative with a confidence above the display
   threshold.
2. **Given** a long card (several sentences or a pasted note), **When** it is
   analysed, **Then** its state reflects the overall content rather than being
   dominated or truncated by an arbitrary cut, and it is not left stuck in a
   placeholder state.
3. **Given** a card whose text has not changed, **When** the board is reloaded,
   **Then** its previously computed state is reused without a visible
   re-analysis flicker.
4. **Given** a card whose text is edited, **When** the edit is saved, **Then**
   the card is re-analysed and the state updates to match the new text.

### User Story 2 - A team-mood report that agrees with itself (Priority: P1)

As a facilitator, the team-mood score, the distribution percentages, and the
insight alerts all tell a consistent story about the same board, so I can act on
them with confidence.

**Why this priority**: The user explicitly reports "desvíos en el análisis de
estado de ánimo del equipo". An internally contradictory report (good score but
critical alert, or neutral board reported as positive) actively misleads the
person meant to steer the retro.

**Independent Test**: Build boards with known compositions (all-neutral,
mostly-positive, heavy-negativity-in-a-problems-column, mixed) and verify the
score, percentages, and alerts are mutually consistent and match the intended
reading of each board.

**Acceptance Scenarios**:

1. **Given** a board whose only strong signal is negativity concentrated in a
   column meant to capture problems, **When** the report is generated, **Then**
   that expected negativity is treated the same way by the score and by the
   alerts (it does not raise a critical-negativity alarm while the score treats
   it as neutral).
2. **Given** a board that is overwhelmingly neutral with no clear positive
   signal, **When** the report is generated, **Then** the team mood is reported
   at ≈ 4.6/10 ("Preocupante"), not as a positive, "good", or "Regular"/middling
   mood.
3. **Given** a report is displayed, **When** a column's role or title changes,
   **Then** the mood score and insights recompute to reflect the change.
4. **Given** any board, **When** the report is generated, **Then** a card that
   is confident enough to display a state on the board is counted in the
   report's aggregation on the same basis (and vice-versa).

### User Story 3 - Facilitator override remains authoritative (Priority: P2)

As a facilitator, when I manually correct a card's state, my correction sticks
and is reflected in the team-mood report, and is never silently overwritten by
a later automatic re-analysis.

**Why this priority**: Overrides are the human safety-net for the AI's mistakes;
if fixes to F1–F7 caused re-analysis to clobber overrides, trust would collapse.
It is P2 because the behaviour largely exists today and must be *preserved*
rather than built from scratch.

**Independent Test**: Override a card, then trigger conditions that re-run
analysis (reload, edit a different card, re-enable analysis) and confirm the
override persists and is counted in the report.

**Acceptance Scenarios**:

1. **Given** a card with a facilitator override, **When** automatic analysis
   runs again, **Then** the override is preserved.
2. **Given** a card with a facilitator override, **When** the team-mood report
   is generated, **Then** the override's state is what the report counts.

### User Story 4 - Maintainable, library-first analysis module (Priority: P3)

As a developer, the AI analysis lives behind one clear, independently testable
module boundary that leans on a proven third-party library, with no dead code,
so the capability is safe to change and cheap to maintain.

**Why this priority**: Directly requested ("componetización y library first…
elimina el código que no sea necesario") and required by the constitution, but
it is an enabling/quality outcome rather than a user-visible one, so P3.

**Independent Test**: Review the feature's public surface and dependency graph;
confirm a single documented entry point, that model inference is delegated to a
maintained library, that removed code has no remaining references, and that unit
tests cover the module in isolation without a live backend or a live model.

**Acceptance Scenarios**:

1. **Given** the sentiment/team-mood capability, **When** its public interface
   is inspected, **Then** consumers depend on one cohesive module rather than on
   scattered internal hooks and services.
2. **Given** the codebase after this feature, **When** searched for the removed
   dead code, **Then** no references remain and all checks still pass.
3. **Given** the analysis and mood-scoring logic, **When** the test suite runs,
   **Then** the deviations F1–F7 are each covered by a test that would fail
   against the old behaviour.

### Edge Cases

- A board with fewer than the minimum analysable cards: the report clearly
  communicates "not enough data" rather than presenting a misleading score.
- Cards that are only emojis, punctuation, URLs, or whitespace: handled
  predictably (a defined neutral/low-confidence outcome), never a crash.
- The analysis model fails to load or a single card fails to analyse: the board
  and report degrade gracefully with an explicit state, never a silent wrong
  number.
- Analysis disabled mid-session: card states and the report clear consistently
  and no stale results linger.
- Mixed-language board (Spanish and English cards together): each card is judged
  on its own text without cross-contamination.
- Very large board (many cards): analysis completes without freezing the board
  interaction.

## Requirements *(mandatory)*

### Functional Requirements

**Per-card state accuracy**

- **FR-001**: The system MUST assign each analysable card a state (positive,
  negative, or neutral) plus a confidence value that reflects the card's actual
  text in both Spanish and English.
- **FR-002**: The system MUST normalize card text before analysis so that long
  content is handled deliberately (not arbitrarily truncated by the model) and
  produces a state representative of the whole card.
- **FR-002a**: The system MUST classify Spanish and English cards with a single
  multilingual model and MUST NOT perform per-card language detection or routing;
  accuracy improvements come from text normalization and the maintained
  library/model, not from language-specific model selection.
- **FR-003**: The system MUST define and consistently apply a single rule for
  when a card is confident enough to be treated as having a displayed state, and
  MUST use that same basis wherever card states are shown and wherever they are
  counted.
- **FR-004**: The system MUST reuse a previously computed card state only when
  BOTH the card's text AND the model identity/version that produced the state are
  unchanged, and MUST re-analyse a card when its text changes OR when the model
  or its version changes, without leaving cards stuck in a transient/placeholder
  state.
- **FR-004a**: The system MUST record, with each stored card state, the identity
  and version of the model that produced it, so a state can be detected as stale
  when the model or its version changes (independent of any text change).
- **FR-005**: The system MUST treat empty, whitespace-only, or below-minimum
  card content as a defined outcome (not an error and not a misleading state).

**Team-mood consistency**

- **FR-006**: The system MUST treat expected negativity (negative cards in a
  column whose role is to capture problems) identically in the headline mood
  score, the distribution percentages, and the insight alerts — it MUST NOT be
  discounted in one place and penalised in another.
- **FR-007**: The system MUST report a **neutral-dominant** board (one whose
  confident cards are overwhelmingly neutral, with no clear positive signal) in
  the lower half of the "Preocupante" band (score ≈ 4.6 on the 1–10 scale) —
  never as a positive, "good", or "Regular"/middling mood — so the absence of
  positive signal nudges facilitator attention. (Score exactly 4.0 would render
  as "Malo" under the existing label bands; the neutral weighting places an
  all-neutral board at ≈ 4.6 so it keeps the intended "Preocupante" label.)
- **FR-008**: The system MUST recompute the mood score, distribution, and
  insights whenever their inputs change, including changes to column roles or
  titles, so the report never lags behind the data.
- **FR-009**: The system MUST use the same minimum-confidence basis for the
  team-mood aggregation as for per-card display, so a card visible on the board
  and the same card in the report are counted consistently (satisfies FR-003 at
  the report level).
- **FR-010**: The system MUST clearly indicate when there is insufficient data
  to produce a meaningful team-mood report instead of presenting a misleading
  score.

**Facilitator override**

- **FR-011**: The system MUST preserve a facilitator's manual override of a card
  state across re-analysis, reload, and re-enabling of analysis.
- **FR-012**: The system MUST count a facilitator override's state (not the
  superseded automatic state) in the team-mood report.

**Resilience**

- **FR-013**: The system MUST handle model-load failure and per-card analysis
  failure with an explicit, non-silent state, keeping the board and report
  usable.
- **FR-014**: When analysis is disabled, the system MUST clear card states and
  the report consistently, leaving no stale results.

**Structure, library-first & cleanup**

- **FR-015**: The AI analysis capability MUST be organised as an independent,
  decoupled module with a single clear public interface, following the
  constitution's Library-First principle, and MUST be unit-testable in isolation
  without a live backend or live model download.
- **FR-016**: Model inference MUST be delegated to a proven, actively maintained
  third-party library rather than bespoke inference code. Specifically, the
  capability MUST migrate from `@xenova/transformers` v2 to its maintained
  successor `@huggingface/transformers` (v3), provided that successor still
  satisfies the constitution's dependency-vetting bar (maintenance, bundle-size
  impact, license, no capability duplication); the migration and its
  justification MUST be documented. Inference MUST continue to run locally
  on-device (no card text sent to an external service).
- **FR-017**: The system MUST remove code within the AI-analysis feature that has
  no remaining callers (e.g. the unused persistence method and any unused
  sentiment UI/utility exports identified during investigation), with no
  behavioural regression and all checks still passing.
- **FR-018**: All existing user-visible behaviour and text MUST continue to be
  provided through internationalization (no hardcoded strings) and MUST continue
  to meet WCAG 2.1 AA in both light and dark themes, per the constitution.

### Key Entities *(include if feature involves data)*

- **Card State**: The AI-inferred (or facilitator-overridden) sentiment of a
  single card — its category (positive/negative/neutral), a confidence value,
  whether it is a manual override, a link to the exact card text it was derived
  from, and the identity+version of the model that produced it (so staleness can
  be detected on either a text change or a model/version change).
- **Team-Mood Report**: A per-board summary derived from card states — an overall
  mood score, distribution percentages (overall and per column), and a ranked
  set of facilitator insights/alerts, plus a clear "insufficient data" state.
- **Column Role**: The retrospective purpose of a column (e.g. positive,
  negative/problems, neutral) used to decide whether negativity in that column is
  expected and how it should influence the score, percentages, and alerts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a curated validation set of at least 30 representative cards
  (Spanish + English; positive, negative, neutral; short and long), at least 90%
  of displayed card states match human judgement.
- **SC-002**: For an unchanged board, reloading produces zero changes to card
  states and no visible re-analysis flicker (results are reused, not recomputed).
- **SC-003**: Across a defined suite of benchmark boards, the team-mood score,
  the distribution percentages, and the insight alerts never contradict each
  other (0 inconsistent reports), and an all-neutral board lands at ≈ 4.6/10
  ("Preocupante") — never positive, "good", or "Regular"/middling.
- **SC-004**: 100% of facilitator overrides survive a subsequent re-analysis,
  reload, and re-enable cycle, and are the value counted in the report.
- **SC-005**: Every deviation F1–F7 has at least one automated test that fails
  against the previous behaviour and passes after the change; overall feature
  coverage stays at or above the constitution's 80% floor.
- **SC-006**: The identified dead code is removed with zero remaining references,
  and type-check, lint, unit, and E2E checks all pass.
- **SC-007**: The AI-analysis capability is consumed through a single documented
  module entry point (measured by consumers no longer importing its internal
  hooks/services directly).

## Assumptions

- "Estado de las tarjetas" refers to the existing per-card sentiment
  classification (positive/negative/neutral + confidence), and "estado de ánimo
  del equipo" refers to the facilitator team-mood report — not a new,
  differently-defined status concept.
- Analysis continues to run privately in the user's browser (no card text sent
  to an external AI service), preserving the current privacy posture; the adopted
  successor library (`@huggingface/transformers`) runs locally on-device, same as
  the current one.
- A single multilingual model classifies both Spanish and English cards; per-card
  language detection/routing is explicitly out of scope (see FR-002a).
- The three-category model (positive / negative / neutral) and the existing
  facilitator-override capability are retained; this feature improves their
  accuracy and consistency rather than redefining the taxonomy.
- Reasonable default confidence thresholds and text-length limits will be chosen
  from the model's documented characteristics and validated against the curated
  card set; exact numeric values are an implementation/tuning detail.
- The curated validation card set and the benchmark boards used for SC-001 and
  SC-003 will be assembled as part of this feature and kept with its tests.
- Supported locales remain Spanish and English, matching the current app.
- Scope is limited to the AI card-state and team-mood analysis and the code that
  directly supports it; unrelated board features are out of scope except where
  they consume this module's public interface.
