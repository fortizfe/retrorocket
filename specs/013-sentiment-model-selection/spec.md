# Feature Specification: Better-Fitting Sentiment Models & Language-Aware Model Selection

**Feature Branch**: `013-sentiment-model-selection`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Continuando con la mejora sobr el sentimiento del equipo, los dos modelos actuales no obtienen buenos resultados ni en el análisis de la tarjeta ni en el análisis del equipo. Ahora que hemos cambiado a huggin face, investiga si hay modelos de IA que encajen mejor para nosotros. Valora también unsar un modelo distinto en función del idioma de la tarjeta, de cara a obtener resultados más óptimos."

## Overview

RetroRocket infers a sentiment state (positive / negative / neutral + confidence)
for each retrospective card and aggregates those states into a facilitator
team-mood report. Feature 011 corrected the *aggregation and consistency*
deviations and migrated inference to the maintained `@huggingface/transformers`
library, but deliberately kept a single multilingual model and explicitly ruled
out per-language routing (011 FR-002a) as a KISS decision.

The user now reports that the two currently-configured models still produce
poor results — **on both the per-card sentiment and the team-mood report** — and
asks, now that the maintained library is in place, to (a) investigate whether
other AI models fit RetroRocket's needs better, and (b) evaluate using a
*different model depending on the card's language* to get more optimal results.

This feature is therefore an **evidence-based model-selection change**: identify,
evaluate against a curated benchmark, and adopt the model(s) that measurably
improve card-level and team-level accuracy — including, where it demonstrably
wins, a language-aware selection that revisits and may supersede 011's
single-multilingual-model decision. It does not redefine the sentiment taxonomy,
the team-mood scoring rules, or the privacy posture established by 011; it
changes *which model(s) classify the text* and *how the right model is chosen*.

## Clarifications

### Session 2026-07-23

- Q: If no on-device candidate beats the two currently-configured models by the target margin, what is the correct outcome? → A: Keep the current models as-is and document in the evaluation record that they remained best — changing the models is conditional on evidence, and "no change" is a valid, successful result of the investigation (not a failure).
- Q: What total model-download budget should gate which models qualify (inference runs in-browser)? → A: Total on-device model download may grow up to ~2× today's footprint when the accuracy gain clearly justifies it; the footprint of the selected configuration is recorded.
- Q: What minimum card-accuracy improvement triggers adopting language-aware routing over the single-multilingual baseline (FR-007)? → A: At least 5 percentage points of benchmark card-accuracy improvement.

## Context & Motivation *(background — motivates the requirements below)*

Recorded here as rationale; the requirements themselves stay outcome-focused.

- **Currently-configured models.** The primary model is a distilled multilingual
  sentiment model and the fallback is a multilingual 1–5 star model whose stars
  are bucketed into positive/neutral/negative. Both are general-purpose and were
  chosen for language coverage, not for accuracy on short, informal, mixed
  ES/EN retro-card text.
- **The complaint spans both levels.** Because the team-mood report is derived
  from per-card states, systematically wrong or mis-calibrated card states
  propagate upward: a model that is over-eager toward "neutral" or mis-scores
  short Spanish phrases will drag the team-mood report off even though the 011
  aggregation logic is correct.
- **Confidence calibration matters as much as the label.** The pipeline gates
  both display and aggregation on confidence thresholds. A replacement model
  whose confidence scores are calibrated differently can change how many cards
  are counted, so model selection MUST be evaluated together with the confidence
  thresholds it feeds, not in isolation.
- **The language question is explicitly reopened.** 011 chose one multilingual
  model for simplicity. The user now asks to *evaluate* (`valora`) a per-language
  choice. This feature treats that as a measured decision: adopt language-aware
  selection only if it beats a strong single-multilingual baseline by a
  meaningful margin; otherwise keep a single model and record why.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - More accurate per-card sentiment (Priority: P1)

As a retrospective participant, the sentiment shown on each card matches what I
actually wrote — for short, informal Spanish and English phrases alike — so the
board's signals are trustworthy rather than frequently wrong.

**Why this priority**: This is the primary complaint ("los dos modelos actuales
no obtienen buenos resultados … en el análisis de la tarjeta") and the
foundation the team-mood report is built on.

**Independent Test**: Run the newly selected model(s) against the curated
validation card set (Spanish + English; positive, negative, neutral; short and
long; informal phrasing) and confirm the share of card states matching human
judgement rises meaningfully above the current models' score on the same set.

**Acceptance Scenarios**:

1. **Given** a set of clearly positive and clearly negative cards in Spanish and
   in English, **When** they are analysed by the selected model(s), **Then** each
   is classified with the correct polarity and a confidence above the display
   threshold.
2. **Given** short, informal cards (e.g. "faltó tiempo", "great teamwork",
   "meetings too long"), **When** analysed, **Then** their states match human
   judgement rather than defaulting to low-confidence neutral.
3. **Given** the current models and the newly selected model(s) evaluated on the
   same curated set, **When** their accuracy is compared, **Then** the selected
   configuration scores measurably higher and the comparison is recorded.

### User Story 2 - A team-mood report that reflects the real room (Priority: P1)

As a facilitator, the team-mood report reflects the retrospective's actual tone,
because the per-card states feeding it are accurate and their confidence is
calibrated to how the report counts them.

**Why this priority**: The user explicitly reports the team analysis is also
poor ("ni en el análisis del equipo"). Even with correct aggregation logic
(from 011), a better-calibrated model is required for the report to be right.

**Independent Test**: On benchmark boards with a known intended tone
(clearly-positive room, clearly-negative room, mixed, neutral-dominant), confirm
the team-mood score, distribution, and insights produced with the selected
model(s) match the intended reading and improve on the current models' output.
(This test presupposes a model configuration has been selected in US1 — US2
validates the *report* built on those card states, so it runs after US1's
adoption but is otherwise independently verifiable against the benchmark boards.)

**Acceptance Scenarios**:

1. **Given** a benchmark board whose intended tone is clearly positive, **When**
   the report is generated with the selected model(s), **Then** the headline mood
   lands in the corresponding band, not dragged toward neutral/negative by
   mis-classified cards.
2. **Given** the same benchmark boards analysed by the current models and by the
   selected model(s), **When** the reports are compared, **Then** the selected
   configuration's reports agree with the intended tone on more boards.
3. **Given** the selected model's confidence calibration, **When** the display
   and aggregation confidence thresholds are set, **Then** they are re-validated
   together so a card visible on the board and the same card in the report are
   still counted on one consistent basis (preserves 011 FR-003/FR-009).

### User Story 3 - Language-appropriate model selection (Priority: P2)

As a product owner, cards are analysed by the model that performs best for their
language, so a Spanish card and an English card each get the most accurate
result available — provided this measurably beats a single multilingual model.

**Why this priority**: Directly requested ("valora también usar un modelo
distinto en función del idioma de la tarjeta"). It is P2 because it is a
conditional optimization on top of the P1 accuracy gain: valuable, but only
adopted if the evaluation shows it wins, and the app must still work with a
single model if it does not.

**Independent Test**: Detect each validation card's language, route it to the
candidate per-language model, and compare accuracy against the best
single-multilingual baseline on the same set; confirm the routing is adopted
only when it wins by the defined margin, and that mixed ES/EN boards are handled
without cross-contamination.

**Acceptance Scenarios**:

1. **Given** a card whose language is detected as Spanish and one detected as
   English, **When** language-aware selection is active, **Then** each card is
   analysed by the model chosen for its language and receives an accurate state.
2. **Given** a board mixing Spanish and English cards, **When** it is analysed,
   **Then** each card is judged on its own text and language with no
   cross-contamination between cards.
3. **Given** a card whose language cannot be confidently detected, **When** it is
   analysed, **Then** it falls back to a defined default (the multilingual model)
   and still produces a valid state rather than an error.
4. **Given** the language-aware configuration and the single-multilingual
   baseline evaluated on the same set, **When** the results are compared, **Then**
   language-aware selection is adopted only if it improves accuracy by at least
   the pre-agreed margin; otherwise the single model is kept and the reason
   recorded.

### User Story 4 - Evidence-based, documented, swappable selection (Priority: P3)

As a developer, the chosen model(s) are the result of a documented evaluation
against a curated benchmark, are swappable behind the existing sentiment module
boundary, and carry their identity/version so results recompute when the model
changes — so the choice is justified, reproducible, and safe to revisit.

**Why this priority**: Required by the constitution (Library-First, evidence over
guesswork) and makes the model choice auditable and future-proof, but it is an
enabling/quality outcome rather than a user-visible one.

**Independent Test**: Inspect the feature's model configuration and evaluation
record; confirm each shortlisted model's benchmark score is documented, that
swapping the configured model requires no change outside the sentiment module,
and that changing the configured model marks prior stored states stale so they
recompute.

**Acceptance Scenarios**:

1. **Given** the model shortlist, **When** the evaluation record is reviewed,
   **Then** each candidate's card-level and team-level accuracy on the curated
   benchmark is documented, along with the rationale for the final choice.
2. **Given** the selected configuration, **When** the configured model (or its
   version) changes, **Then** previously stored card states produced by the old
   model are treated as stale and recomputed (preserves 011 FR-004/FR-004a).
3. **Given** the sentiment module, **When** the model configuration is changed,
   **Then** no consumer outside the module’s public interface needs to change.

### Edge Cases

- A card that is only emojis, punctuation, URLs, or whitespace: handled as a
  defined neutral/low-confidence outcome, never an error, regardless of which
  model or language route applies.
- A candidate model fails to download or is unavailable at runtime: the system
  falls back to a defined working model and the board/report stay usable (no
  silent wrong result).
- Language detection is wrong or low-confidence: the card still receives a valid
  state via the multilingual default, and a mis-detected language never crashes
  analysis.
- A model that natively outputs only two classes (positive/negative) or a star
  scale: the neutral category is still represented via a defined, validated
  mapping, so the three-category taxonomy is preserved.
- Very large board (many cards) with language-aware routing: analysis completes
  without freezing board interaction and without loading models the board does
  not need.
- A board entirely in one language: only the model(s) required for that language
  are loaded.

## Requirements *(mandatory)*

### Functional Requirements

**Model evaluation & selection**

- **FR-001**: The system's card sentiment MUST be produced by model(s) selected
  through a documented evaluation against a curated, human-labelled benchmark of
  representative retro cards (Spanish + English; positive/negative/neutral;
  short and long; informal phrasing). The **target margin** for replacing the
  currently-configured models is **at least 10 percentage points** of benchmark
  card-accuracy (identical to SC-001): a candidate configuration MUST replace the
  current models only if it clears that margin; if no on-device candidate beats
  the current models by ≥10 pp, the current models MUST be kept and the evaluation
  record MUST document that they remained best. Keeping the current models is
  therefore a valid, successful terminal outcome of this feature, not a failure.
- **FR-002**: The evaluation MUST compare candidate models on **both** per-card
  classification accuracy **and** the resulting team-mood report's agreement with
  each benchmark board's intended tone, so a model is not chosen on card accuracy
  alone.
- **FR-003**: Model selection MUST be evaluated together with the confidence
  thresholds it feeds; the display and aggregation confidence thresholds MUST be
  re-validated for the selected model so per-card display and team-mood
  aggregation remain counted on one consistent basis (preserves 011 FR-003 /
  FR-009).
- **FR-004**: The selected model(s) MUST natively support, or be given a defined
  and validated mapping to, the three-category taxonomy (positive / negative /
  neutral); a two-class or star-scale model MUST NOT be adopted without such a
  mapping validated on the benchmark.
- **FR-005**: The final model choice, each shortlisted candidate's benchmark
  scores, and the rationale (including the language-aware decision in FR-007)
  MUST be documented and kept with the feature.

**Language-aware selection**

- **FR-006**: The system MUST evaluate a language-aware configuration — a model
  chosen per the card's language (at minimum Spanish and English) — against the
  best single-multilingual baseline on the same benchmark.
- **FR-007**: Language-aware model selection MUST be adopted only if it improves
  benchmark card-accuracy over the single-multilingual baseline by at least 5
  percentage points; if it does not, a single model MUST be kept and the reason
  recorded. This decision explicitly supersedes 011 FR-002a when the margin is
  met.
- **FR-008**: If language-aware selection is adopted, the system MUST determine
  each card's language automatically from the card's own text and route that card
  to the model chosen for its language; language determination MUST NOT require
  the participant to tag or declare a card's language.
- **FR-009**: If language-aware selection is adopted, a card whose language
  cannot be confidently determined MUST fall back to a defined default model (the
  multilingual model) and still produce a valid state, never an error.
- **FR-010**: On a board mixing Spanish and English cards, each card MUST be
  analysed on its own text and language with no cross-contamination between cards.

**Continuity with existing behaviour (preserved from 011)**

- **FR-011**: The system MUST continue to record each stored card state with the
  identity and version of the model that produced it, and MUST recompute a stored
  state when the configured model or its version changes (preserves 011 FR-004 /
  FR-004a), so switching models never leaves stale states on the board or in the
  report.
- **FR-012**: Model inference MUST continue to run locally on-device via the
  maintained `@huggingface/transformers` library; no card text may be sent to an
  external service, and any newly adopted model MUST be available to run in that
  same on-device manner.
- **FR-013**: Any newly adopted model or added dependency MUST satisfy the
  constitution's dependency-vetting bar (active maintenance, license
  compatibility, and acceptable bundle-size / model-download impact). The
  total on-device model-download footprint of the selected configuration MUST NOT
  exceed ~2× the current configuration's footprint, and any increase toward that
  ceiling MUST be justified by a clear benchmark accuracy gain; each candidate's
  download impact MUST be considered in the selection.
- **FR-014**: The sentiment capability MUST keep its single public module
  boundary: changing the configured model(s) or adding language routing MUST NOT
  require changes outside the sentiment feature's public interface, and the
  selection/routing logic MUST be unit-testable in isolation without a live model
  download.
- **FR-015**: The system MUST continue to handle model-load failure and per-card
  analysis failure with an explicit, non-silent fallback state, keeping the board
  and report usable (preserves 011 FR-013).
- **FR-016**: All user-visible behaviour and text MUST continue to be provided
  through internationalization (no hardcoded strings) and MUST continue to meet
  WCAG 2.1 AA in both light and dark themes, per the constitution.
- **FR-017**: Any model configuration, label-mapping, or fallback code that the
  adopted configuration renders unused (e.g. a no-longer-configured star-rating
  fallback model and its bucketing map) MUST be removed, with no remaining
  references and no behavioural regression. If the current models are retained
  (FR-001), this obligation applies only to code this feature itself introduced
  and left unused.

### Key Entities *(include if feature involves data)*

- **Sentiment Model (candidate/selected)**: A text-classification model
  considered or chosen for card analysis — its identity and version, the language
  scope it serves (a single language or multilingual), its native output form
  (three-class, two-class, or star scale) and the mapping to the
  positive/negative/neutral taxonomy, and its download/bundle-size cost.
- **Model Evaluation Record**: The documented benchmark outcome — per-candidate
  card-level accuracy, team-mood agreement across benchmark boards, the confidence
  thresholds used, the single-multilingual-vs-language-aware comparison, and the
  final decision with its rationale.
- **Language Route**: The mapping from a card's determined language to the model
  that analyses it, including the default/fallback model used when language is
  uncertain (present only if language-aware selection is adopted).
- **Card State**: Unchanged from 011 — the inferred (or overridden) sentiment of
  a card with confidence, override flag, the exact card text it derives from, and
  the identity+version of the model that produced it (so a model change marks it
  stale).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the curated validation card set, whichever configuration is
  shipped is the highest-scoring on-device configuration evaluated: if a candidate
  beats the current models by at least 10 percentage points it is adopted and its
  score is at least 90%; if no candidate clears the target margin, the current
  models are retained and the evaluation record documents their score alongside
  every rejected candidate's. In both cases the before/after comparison on the
  common set is recorded.
- **SC-002**: Across the suite of benchmark boards, the team-mood report produced
  by the selected configuration agrees with each board's intended tone on at
  least 90% of boards, and on more boards than the current models do.
- **SC-003**: The language-aware-vs-single-multilingual comparison is completed
  and its outcome recorded; whichever configuration is adopted is the one that
  scored higher on the benchmark (or, if kept single for a tie/near-tie, the
  simpler single model with the reason documented).
- **SC-004**: For a card whose language cannot be confidently determined (when
  language-aware selection is active), 100% of such cards still receive a valid
  state via the default model and none produce an error.
- **SC-005**: Switching the configured model(s) marks 100% of prior stored states
  from the old model stale so they recompute; no card retains a state from a
  no-longer-configured model.
- **SC-006**: Card text is never sent off-device — 0 external inference calls —
  and the selected configuration's total model-download footprint is recorded and
  is no more than ~2× the current configuration's footprint.
- **SC-007**: The model choice and its evaluation are documented, and changing
  the configured model(s) requires no code change outside the sentiment module's
  public interface (verified by inspection); feature coverage stays at or above
  the constitution's 80% floor.

## Assumptions

- This feature continues 011: the sentiment taxonomy (positive / negative /
  neutral + confidence), the team-mood scoring/consistency rules, the facilitator
  override behaviour, and the on-device privacy posture are all retained. This
  work changes *which model(s) classify text and how the model is chosen*, not
  those rules.
- "Los dos modelos actuales" refers to the two entries currently configured
  (a distilled multilingual sentiment model as primary and a multilingual star
  model as fallback); "encajen mejor" means measurably higher accuracy on
  RetroRocket's own short, informal ES/EN card text.
- The curated validation card set and benchmark boards from 011 are reused and,
  where needed, extended with more informal/short ES/EN examples so the
  before/after comparison is on a common, human-labelled baseline.
- Supported card languages remain Spanish and English; language-aware selection,
  if adopted, covers those two, with the multilingual model as the default for
  anything else or for uncertain detection.
- The margin for adopting language-aware selection is fixed at ≥5 percentage
  points of benchmark card-accuracy (FR-007), and the model-download ceiling is
  ~2× the current footprint (FR-013). The concrete confidence thresholds (FR-003)
  remain tuning values chosen from the benchmark during implementation; the spec
  fixes that decision rule, not the exact threshold numbers.
- Language detection, if needed for routing, is derived automatically from card
  text (no participant action); its mechanism (heuristic or a small library) is
  an implementation choice subject to the same dependency-vetting bar.
- Inference continues to run in the user's browser via
  `@huggingface/transformers`; any candidate model must be runnable in that
  on-device setting (WASM/quantized as applicable) — server-side or paid-API
  models are out of scope.
- Scope is limited to sentiment model selection/routing, its confidence
  thresholds, and the evaluation that justifies them; the 011 aggregation logic
  and unrelated board features are out of scope except as consumers of this
  module's public interface.
