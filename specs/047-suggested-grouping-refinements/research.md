# Phase 0 Research: Suggested Grouping Refinements

## §1. How should the suggested group title be generated on-device, without a new model?

**Decision**: Add a small, pure, synchronous heuristic — `suggestGroupTitle(cards: Card[], maxLength = 35): string` in a new `groupTitleService.ts` — that derives a title from the group's own member-card text via stopword-filtered term-frequency extraction, called by `findSemanticCardGroups` (`semanticGroupingService.ts`) once per cluster before it is returned as a `GroupSuggestion`.

Algorithm:
1. Concatenate member cards' `content`, lowercase, tokenize on non-word boundaries.
2. Drop tokens shorter than 3 characters and tokens in a small built-in ES+EN stopword list (~80 common words — no dependency, a local constant array).
3. Score each remaining distinct token by the number of *distinct member cards* it appears in (document frequency within the group), not raw occurrence count — this rewards terms shared across cards (the actual "topic") over a word one card happens to repeat.
4. Take the top 2–4 tokens by score (ties broken by first-appearance order for determinism), join with a space, capitalize the first letter.
5. If the joined phrase exceeds 35 characters, trim at the last whole-word boundary ≤ 35 chars (never mid-word, never adds an ellipsis — the 35-char budget is for the title text itself per spec.md Assumptions).
6. If step 3 leaves no candidate tokens at all (e.g., every member card is very short or entirely stopwords), fall back to the group's medoid card (the member with the highest average pairwise similarity to the others, already computed as part of clustering) truncated to 35 chars at a word boundary — guarantees FR-001's "MUST include" holds unconditionally; a title is never blank.

**Rationale**:
- Fits FR-001a / SC-001's requirement that titles are ready *together with* the proposed groups, within the same few-seconds/25-card budget already required for grouping itself (spec 044 SC-004) — pure string processing adds negligible time, unlike a second model load/inference round-trip.
- No new dependency (Constitution III): `@huggingface/transformers` already ships a `summarization`/`text2text-generation` pipeline, but those models are materially heavier than the existing 118MB embedding model, would need their own download/warm-up, and multilingual (ES/EN) short-text summarization models suitable for card-length input are not a good fit for a hard few-seconds budget across up to 25 cards' worth of groups in one request.
- Reuses data already available on-device (card text, and the pairwise similarities already computed for clustering) — adds zero new privacy surface (SC-003 of spec 044 — no content leaves the device — remains trivially true).
- Testable in isolation as a pure function (Constitution I/VI — unit tests without mocking a worker or model).

**Alternatives considered**:
- *Small generative/summarization model via `@huggingface/transformers`*: rejected — heavier download, slower inference, and no clear multilingual (ES/EN) small model that reliably produces a ≤35-char topic phrase; would jeopardize the same-budget latency requirement (Clarifications, Q2) for uncertain quality gain.
- *Use the head card's raw content, truncated*: rejected as the sole approach — simpler, but not "a title that identifies the shared topic" when the head card is only one of several members; kept as the deterministic fallback for the rare no-candidate-tokens case (step 6), not the primary path.
- *LLM call (server-side)*: rejected outright — violates the feature's established on-device-only, no-external-transmission posture (spec 044 FR-011/SC-003), which this refinement does not reopen.

## §2. How should the 35-character hard cap be enforced in the inline-edit field?

**Decision**: A native HTML `maxLength={35}` attribute on the per-suggestion title `<input>`. Browsers natively refuse both typed keystrokes and pasted text past `maxLength` on an `<input>` — no extra JS truncation logic is needed to satisfy Clarifications Q1 ("hard cap while typing"). The AI-suggested title populating the field is pre-truncated to ≤35 chars by `suggestGroupTitle` itself (§1, step 5), so the field's initial value already respects the cap.

**Rationale**: Zero new code beyond the attribute; matches the browser-native behavior the user selected in clarification, and needs no dedicated unit test beyond a DOM assertion that the attribute is present (standard browser behavior is out of scope to re-test).

**Alternatives considered**: A controlled `onChange` handler that slices the string to 35 chars — rejected as redundant with native `maxLength` and marginally more complex (Constitution V, Simplicity) for identical observable behavior.

## §3. Where does "switching away from suggestions disbands groups" belong?

**Decision**: Inside `GroupableColumn.tsx`'s existing `onGroupingChange` callback (currently passed to `ColumnHeaderMenu`), which already has access to everything needed: `columnState.criteria` (the *previous* criteria, read before `setGroupingCriteria` is called), `columnGroups` (this column's currently-accepted groups, already filtered from the `groups` prop), and `onGroupDisband` (already a prop, already wired end-to-end through `RetrospectiveBoard.tsx` → `useCardGroups.disbandGroup` → `backendRetrospectiveClient.disbandCardGroup` → the server → realtime sync to every participant).

```
onGroupingChange={(criteria) => {
  const previousCriteria = columnState.criteria;
  setGroupingCriteria(column.id, criteria);
  if (criteria === 'suggestions') {
    handleGenerateSuggestions();
  } else if (previousCriteria === 'suggestions') {
    // FR-008/009/011
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestionsError(null);
    void disbandAllColumnGroups(); // Promise.all over columnGroups, per §4
  }
}}
```

**Rationale**: No new props, no new plumbing across component boundaries — every piece this needs is already local to `GroupableColumn.tsx` (Constitution V, Simplicity/YAGNI: the simplest change that satisfies FR-008/009/011). Re-sorting (FR-009) requires no explicit code: once `disbandCardGroup` clears each card's `groupId` server-side and realtime sync propagates it back, `GroupableColumn`'s existing `ungroupedCards = columnCards.filter(card => !card.groupId)` and `processCards(ungroupedCards, column.id, ...)` (already re-run on every render via `useMemo`) automatically re-sort those cards per whatever `columnState.criteria` was just set to — this is the same mechanism already used for every other criteria change today.

**Alternatives considered**: Moving group-disband/mode-switch orchestration into `useColumnGrouping.ts` — rejected; that hook has no access to `groups`/`onGroupDisband` (a deliberate separation already in place between "grouping *mode*" state, owned by `useColumnGrouping`, and "grouping *groups*" persistence, owned by `useCardGroups`/`RetrospectiveBoard.tsx`), and threading those through would be a larger, unjustified refactor for what FR-008 needs.

## §4. How are multiple groups disbanded, and how are partial failures handled?

**Decision**: `Promise.allSettled` over `columnGroups.map(g => onGroupDisband(g.id))`. If any settle as rejected, log the error(s) and show one `toast.error` (new i18n key, mirroring the existing `groupSuggestion.acceptError` pattern) listing that some groups could not be dissolved; groups that succeeded stay dissolved (no rollback), and the mode-switch itself is not reverted (the grouping-criteria preference the user picked is already saved via `setGroupingCriteria`).

**Rationale**: Matches the app's existing resilience posture (Constitution: "Error Handling & Resilience... no silent failures") and the precedent already set by `handleAcceptSuggestion`'s own try/catch + toast. `allSettled` (not `all`) ensures one failing disband doesn't block the others from completing — each group's dissolution is independent.

## §5. How is the "cleared title → Group N" fallback computed?

**Decision**: At accept time (`GroupableColumn.handleAcceptSuggestion`), if the trimmed title is empty, compute the label as `` `${t('groupSuggestion.group')} ${columnGroups.length + 1}` `` — reusing the existing `groupSuggestion.group` i18n key ("Group"/"Grupo", already shown as "Group 1", "Group 2", ... inside the suggestions panel itself today) and the column's *current* accepted-group count as the position, then pass that string as `customTitle` to `createGroup`/`acceptSuggestion`.

**Rationale**: Directly reuses existing i18n copy and an existing numbering convention already visible to the user in the very same panel (`GroupSuggestionModal.tsx`'s "Group 1"/"Group 2" suggestion headers) rather than inventing new copy — matches Clarifications Q3 exactly and needs no new locale keys for the label text itself (only for the new disband-error toast, §4).

**Alternatives considered**: Leaving `customTitle` `undefined` and letting `GroupCard.tsx`'s existing `hasCustomTitle` fallback render `"Group of N cards"` — rejected; this was considered but explicitly not the option the user picked in Clarifications Q3 (that fallback is card-count-based, not position-based, and only exists at *render* time rather than being stored on the group).

## §6. Any change needed to `CardGroup`/`GroupSuggestion` persistence shape?

**Decision**: `CardGroup.title` (already `title?: string`) is unchanged — this feature only changes *what value* is passed as `customTitle` when a suggestion is accepted (always non-empty now: AI-suggested, user-edited, or the computed "Group N" fallback). `GroupSuggestion` (client-only, never persisted) gains one new field: `suggestedTitle: string`.

**Rationale**: No backend/Firestore schema change, no migration — confirmed by reading `backendRetrospectiveClient.ts`'s `CardGroup`/`CardGroupDTO` and `createCardGroup`/`CreateCardGroupParams`, which already accept an optional `title` string end-to-end.
