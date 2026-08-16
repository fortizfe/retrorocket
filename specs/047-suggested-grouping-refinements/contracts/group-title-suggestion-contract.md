# Phase 1 Contract: Suggested-Group Title (generation, inline edit, accept)

Per Constitution Principle II (Library-First), title *generation* is a decoupled, pure module (`groupTitleService.ts`) independent of the UI that displays/edits it. This contract covers three things: how a title is generated, how it is edited inline, and how the edited-or-not value reaches group creation.

## Contract — `suggestGroupTitle(cards, maxLength = 35)`

- **Given** two or more cards with meaningful shared vocabulary, **when** called, **then** it MUST return a non-empty string of at most `maxLength` characters that reflects terms shared across multiple member cards, not just terms repeated within a single card (spec.md FR-001; `research.md` §1 step 3).
- **Given** the derived phrase would exceed `maxLength`, **when** called, **then** the result MUST be trimmed at a whole-word boundary — it MUST NOT cut a word in half and MUST NOT append an ellipsis or other indicator (spec.md Assumptions: the limit applies to the title text itself).
- **Given** member cards share no meaningful non-stopword vocabulary (e.g., very short or entirely-stopword content), **when** called, **then** it MUST still return a non-empty, ≤`maxLength` string (the medoid-card-snippet fallback, `research.md` §1 step 6) — it MUST NOT return an empty string or throw.
- **Given** the same input cards, **when** called multiple times, **then** it MUST return the same result (deterministic — no randomness, no network/model call).

## Contract — Inline title edit (`GroupSuggestionModal.tsx`)

- **Given** a proposed group is rendered, **when** the panel displays it, **then** its title MUST be shown in an editable text input pre-filled with `suggestion.suggestedTitle`, not static text (spec.md FR-002, Acceptance Scenario 2).
- **Given** the title input, **when** rendered, **then** it MUST carry a native `maxLength={35}` constraint — typing or pasting past 35 characters MUST NOT be possible (spec.md FR-003; Clarifications Q1; `research.md` §2).
- **Given** a suggestion's title has been edited, **when** the user edits a *different* suggestion's title in the same panel, **then** the first suggestion's edited value MUST be unaffected — edits are keyed per-`suggestion.id`, never shared/global state (spec.md FR-006, Acceptance Scenario 5).
- **Given** a suggestion is rejected, **when** the rejection is processed, **then** any in-progress edit to that suggestion's title MUST be discarded along with the suggestion itself, with no residual state leaking to a title later shown for a different suggestion (spec.md FR-007, Acceptance Scenario 6).

## Contract — Accept flow (`GroupableColumn.handleAcceptSuggestion` → `useCardGroups.acceptSuggestion` → `createGroup`)

- **Given** a proposed group whose title was NOT edited, **when** accepted, **then** the created `CardGroup.title` MUST equal the original `suggestedTitle` (spec.md FR-004, Acceptance Scenario 4).
- **Given** a proposed group whose title WAS edited to non-empty, non-whitespace text, **when** accepted, **then** the created `CardGroup.title` MUST equal the edited text, not `suggestedTitle` (spec.md FR-004, Acceptance Scenario 3).
- **Given** a proposed group whose title was edited down to empty or whitespace-only text, **when** accepted, **then** the created `CardGroup.title` MUST be the computed `"{groupSuggestion.group} {N}"` fallback, where N is one more than the column's current accepted-group count at accept time (spec.md FR-005; `research.md` §5) — it MUST NOT create a group with a blank/whitespace title.

## Explicitly not covered by this contract

- The clustering algorithm itself (which cards end up in a group) — unchanged, covered by `specs/044-ai-card-grouping/contracts/ai-grouping-service-contract.md`.
- The suggestions panel's positioning/anchoring — unchanged, covered by `specs/044-ai-card-grouping/contracts/anchored-suggestions-panel-contract.md`.
- What happens to a title after its group has been created (post-acceptance rename) — out of scope; no such capability exists today and this feature does not add one (spec.md scope is limited to the suggestion-review moment).

**Verification**: unit tests for `suggestGroupTitle` (deterministic phrase extraction, word-boundary truncation, no-candidate-tokens fallback, never-empty guarantee) with no worker/model mocking required (pure function); component tests for `GroupSuggestionModal` asserting the input's `maxLength` attribute, per-suggestion edit isolation, and edit-discarded-on-reject; a `useCardGroups`/`GroupableColumn` level test asserting the three accept-flow branches above (unedited / edited / cleared-to-empty) each produce the right `CardGroup.title`.
