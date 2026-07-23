# Phase 0 Research: Accurate AI Card Sentiment & Team Mood Analysis

**Feature**: 011-ai-sentiment-accuracy | **Date**: 2026-07-23

This document resolves the technical unknowns behind the plan. Each section is a
Decision / Rationale / Alternatives record.

---

## R1. Inference library migration (F8, FR-015, FR-016)

**Decision**: Replace `@xenova/transformers@^2.17.2` with
`@huggingface/transformers` at its current maintained major
(`^4.x`, latest verified `4.2.0`). Keep the identical usage shape:
`import { pipeline, env } from '@huggingface/transformers'`, a `text-classification`
pipeline created once in the Web Worker, `env.allowLocalModels = false` /
`allowRemoteModels = true`. Inference stays 100% on-device.

**Rationale**:
- `@xenova/transformers` is the pre-rename package; the project is the same
  Transformers.js library now published by Hugging Face as
  `@huggingface/transformers` and actively maintained (satisfies Principle III
  — "prefer maintained libraries").
- API family is unchanged (same `pipeline`/`env`), so the migration is a package
  swap plus verification, not a rewrite.
- The clarification chose the "maintained successor"; at spec-authoring time that
  was described as v3, but the maintained major has since advanced to v4. We
  target the **current** maintained major to honor the intent (maintained,
  on-device) rather than pinning to a now-superseded v3.
- License Apache-2.0 (compatible). Model weights are fetched at runtime from the
  HF hub and cached by the library — they are **not** added to the JS bundle.

**Migration specifics / risks**:
- v2→v3 introduced breaking changes (community reports of code that "worked in v2
  breaking in v3"). Treat the swap as a guarded change: verify the worker loads,
  produces `[{label, score}]` output for `text-classification`, and that the
  fallback model path still works, before removing the old dependency.
- Browser runtime is `onnxruntime-web`; module Web Worker instantiation
  (`new Worker(new URL('../workers/sentimentWorker.ts', import.meta.url), {type:'module'})`)
  is unchanged and supported.
- `vite.config.ts` `manualChunks.transformers` must point at
  `@huggingface/transformers`; keep it in its own chunk (lazy, facilitator-only
  surface). Watch the bundle warning limit (currently 1000 kB) — the library
  code chunk is comparable to v2; if it regresses, keep it split and lazily
  loaded (it already is, via the worker + facilitator gating).
- v3+ supports optional WebGPU and `dtype` quantization. **Out of scope** for
  this feature (YAGNI) — stay on the default WASM backend to minimize risk;
  note it as a possible future performance lever.

**Alternatives considered**:
- *Keep `@xenova/transformers` v2*: rejected — frozen package, violates the
  clarified decision and Principle III.
- *Decide in plan via bundle/accuracy A/B*: the clarification explicitly chose to
  migrate; a full A/B is unnecessary ceremony (KISS). We still verify bundle
  size doesn't regress as an acceptance gate.

---

## R2. Sentiment model & label mapping (FR-001, FR-002a)

**Decision**: Keep the current primary model
`Xenova/distilbert-base-multilingual-cased-sentiments-student` (works under
`@huggingface/transformers`; ONNX weights present) as the single multilingual
model for ES + EN. Keep the star-rating fallback
`Xenova/bert-base-multilingual-uncased-sentiment` and its 1–5★ → pos/neu/neg
mapping. No per-card language detection or routing (FR-002a).

**Rationale**:
- The primary model natively emits `positive` / `neutral` / `negative` with a
  confidence score — a direct fit for the three-category taxonomy, no bespoke
  mapping needed for the primary path.
- It is multilingual (distilled from mDeBERTa XNLI), covering ES and EN in one
  model — satisfies the KISS clarification and avoids a language-detection
  dependency + extra test surface.
- Retaining the existing fallback preserves resilience (FR-013) if the primary
  model fails to load.

**Alternatives considered**:
- *Per-card language detection + per-language models*: rejected by clarification
  (KISS) — more dependencies, more failure modes, marginal accuracy upside.
- *Swap to a larger/newer model for accuracy*: deferred — accuracy is first
  pursued via correct text normalization (R4) and unified confidence (R5); model
  swap is a bigger, separately-validated change and not required to hit SC-001.

---

## R3. Result staleness & model-change invalidation (F1, FR-004, FR-004a)

**Decision**: Persist and compare a **content hash of the card text** (not the
card id) plus the **model id and model/library version** on every stored result.
A stored state is reused only when `hash(currentText) === storedContentHash`
**AND** `currentModelId === storedModelId` **AND** `currentModelVersion ===
storedModelVersion`; otherwise the card is re-analysed. On load, results whose
model id/version differs from the active model are treated as stale (not
displayed as authoritative, re-queued for analysis). Facilitator overrides
(`isOverride: true`) are exempt — never invalidated by text or model change.

**Rationale**:
- Fixes the root bug: today `contentHash` is set to `hashContent(cardId)`
  (`sentimentResultsService.ts:34`, `useSentimentResults.ts:39`), so it can never
  match card text → every card is re-analysed on every reload (F1). Storing the
  real content hash makes SC-002 (zero re-inference on unchanged reload)
  achievable.
- Adding model id + version to the record lets a model/library upgrade
  transparently invalidate stale cross-model results (the Q2 clarification)
  without a manual purge.
- `modelVersion` = the installed `@huggingface/transformers` package version (or
  a bumped constant) so a library upgrade that could change outputs invalidates
  cleanly.

**Implementation notes**:
- `hashContent` already exists (`useSentimentCache.ts`) — reuse it as the single
  hashing function for both the in-memory cache and persistence.
- `useSentiment`'s unanalyzed filter and `useSentimentResults` load-merge must
  key "already analysed" off the persisted content hash + model identity, so a
  reload with a warm cache short-circuits inference.

**Alternatives considered**:
- *Invalidate only on model id change (tolerate version bumps)*: rejected by
  clarification (recompute on model **or** version change).
- *Never auto-invalidate on model change*: rejected by clarification.

---

## R4. Card text normalization & length handling (F2, FR-002, FR-005)

**Decision**: Introduce `domain/textNormalization.ts` with a single
`normalizeForInference(content)` that: trims, collapses internal whitespace,
strips bare URLs (they carry no sentiment and waste tokens), and caps length to a
safe budget (≤ 512 characters, cut on a word boundary) that stays well within the
model's 512-token limit. Returns `null` for content below the minimum (< 3
non-whitespace chars) → deterministic `neutral`/confidence 0 outcome (FR-005).
Also pass `{ truncation: true }` to the pipeline as a defensive backstop.

**Rationale**:
- Today `prepareContent` only trims + collapses whitespace; long cards (pasted
  notes, links) reach the tokenizer unbounded and can be silently truncated by
  the model at an arbitrary point or degrade — a likely source of the
  "unsatisfactory" results (F2).
- A character cap on a word boundary keeps a representative prefix of the card
  and is cheap and deterministic (easy to unit-test). Retro cards are short, so
  capping rarely triggers; when it does, it degrades gracefully.
- Stripping URLs removes tokens that only dilute the signal.

**Alternatives considered**:
- *Chunk long text + aggregate per-chunk sentiment*: rejected (YAGNI) — retro
  cards rarely exceed the cap; added complexity isn't justified now.
- *Rely solely on tokenizer truncation*: insufficient — arbitrary token-level
  cut is exactly the current problem; explicit normalization is testable and
  predictable.

---

## R5. Single confidence rule (F3, F7, FR-003, FR-009)

**Decision**: Extract one predicate `domain/confidence.ts →
isConfident(result, config)` (the corrected form of the existing
`shouldShowSentimentBadge`) and use it **everywhere** a state is shown or
counted: card badges, `getSentimentCounts`, `filterCardsBySentiment`, and the
team-mood aggregation. Remove `TeamMoodConfig.minConfidenceThreshold` as a
separate gate; the team-mood report uses the same `isConfident` predicate. Keep
the sensible per-sentiment thresholds already tuned (positive 0.4, negative 0.4,
neutral 0.25) as the single source of truth in `DEFAULT_SENTIMENT_CONFIG`.

**Rationale**:
- Today badges use granular thresholds while team mood uses a flat `0.4`
  (`teamMood.ts` DEFAULT), so a neutral card visible on the board (conf 0.3) is
  excluded from the report — the board and report disagree (F3/F7). One predicate
  guarantees "visible on board ⇔ counted in report" (FR-009).
- Per-sentiment thresholds are legitimate (neutral is inherently lower-confidence
  from these models); keeping them but unifying the *function* preserves nuance
  without inconsistency (KISS over dropping them arbitrarily).

**Alternatives considered**:
- *Collapse to one flat global threshold*: simpler but regresses neutral
  detection (the granular neutral 0.25 was a deliberate prior fix); rejected.

---

## R6. Team-mood scoring redesign (F5, F6, FR-007, FR-008)

**Decision**: Replace `moodFormula` with a neutral-aware, positivity-weighted
score. With adjusted fractions `p, u, n` (positive/neutral/negative, summing to
1) derived from the single adjusted distribution (R7):

```
f     = p * 1.0  +  u * 0.4  +  n * 0.0           // "mood fraction" in [0,1]
score = clamp(1, 10, 1 + 9 * f)                   // rounded to 1 decimal
```

Anchors this produces:

| Board composition (p / u / n) | f | Score | Label |
|-------------------------------|-----|-------|-------|
| All positive (1 / 0 / 0)      | 1.00 | 10.0 | Excelente |
| All neutral (0 / 1 / 0)       | 0.40 | **4.6** | **Preocupante** |
| All negative (0 / 0 / 1)      | 0.00 | 1.0 | Crítico |
| Balanced (0.5 / 0 / 0.5)      | 0.50 | 5.5 | Regular |
| Mixed (0.33 / 0.34 / 0.33)    | 0.47 | 5.2 | Regular |

Neutral weight is **0.4** (not `1/3`): `getMoodScoreLabel` returns "Preocupante"
only for score ≥ 4.5, so an all-neutral board must land at ≥ 4.5 to read as
"Preocupante". Weight 0.4 places it at **4.6** (inside that band) without touching
the shared label table; a weight of `1/3` would score exactly 4.0, which the
existing bands read as "Malo". Balanced/positive/negative anchors are unaffected
(balanced has zero neutral fraction).

Also **fix F6**: include `columnConfigs` in the `report` `useMemo` dependency
array in `useTeamMood.ts` (currently omitted at line ~332) so the score/insights
recompute when column roles/titles change.

**Rationale**:
- The current formula `(p*2 + u − n*1.5)/100 → (x+1.5)*3.33` maps an all-neutral
  board to ~8.3 ("Muy Bueno") — the exact F5 defect. The new formula makes
  neutral a low baseline (weight `0.4`) so "no positive signal" lands at ≈ 4.6
  ("Preocupante"), matching the Q1 clarification's intent, while positivity
  drives the score up and negativity drives it to the floor.
- Linear, monotonic, and trivially unit-testable against the anchor table above
  (feeds SC-003 and SC-005).
- `getMoodScoreLabel` bands are unchanged: ≥ 4.5 → "Preocupante", ≥ 5.5 →
  "Regular"; the 0.4 neutral weight keeps an all-neutral board (4.6) inside
  "Preocupante" with no label-table churn.

**Alternatives considered**:
- *Keep formula, clamp neutral*: rejected — special-casing is less predictable
  and harder to test than a clean monotonic mapping.
- *Neutral weight 0*: would push all-neutral to score 1 (= all-negative), which
  overstates concern. *Neutral weight `1/3`*: scores 4.0, which the existing
  label bands read as "Malo"; `0.4` yields the intended "mild concern" at 4.6,
  keeping the "Preocupante" label.

---

## R7. One column-role-adjusted distribution (F4, FR-006)

**Decision**: Compute a single adjusted distribution in
`domain/moodDistribution.ts` that reclassifies **negative** cards sitting in a
**negative-role** column (e.g. "what hindered", role `negative`) as *expected*
(counted toward neutral/expected, not negative) **once**, then derive the mood
score, the distribution percentages, AND the insight/alert thresholds from that
same adjusted distribution. Column role comes from the existing
`getColumnRole(columnId)` → `'positive' | 'negative' | 'neutral' | 'action'`
(`useRetrospectiveColumns.ts`); `action` columns remain excluded from analysis.

**Rationale**:
- Today the role adjustment is applied only inside `calculateMoodScore`, while
  `teamMetrics.negativePercentage` (which drives the critical/warning alerts) and
  the overall percentages count that same expected negativity — so the score says
  "fine" while the alert screams "critical" (F4). Deriving everything from one
  adjusted distribution makes the score, percentages, and alerts mutually
  consistent by construction (FR-006, SC-003).
- The `mostNegativeColumn` insight already skips `role === 'negative'` columns;
  centralizing the adjustment removes that special-case duplication.

**Alternatives considered**:
- *Apply the adjustment separately in each consumer*: rejected — that is exactly
  the current drift; a single source of truth is the fix.

---

## R8. Performance & scale target (deferred item from clarify)

**Decision**: Target smooth incremental analysis for boards up to ~200 analysable
cards. Keep the existing worker-only, batched, staggered dispatch (batch size 5,
~100 ms stagger). Success = no perceptible board jank during analysis and zero
re-inference on unchanged reloads (SC-002). No hard latency SLA beyond "first
results within a few seconds of the one-time model load."

**Rationale**: Inference already runs off the main thread in a Web Worker;
batching + staggering yields cooperatively. Retro boards are typically far below
200 cards, so this is comfortably sufficient (KISS — no premature optimization,
per the constitution's Performance clause). WebGPU/quantization remain future
levers if ever needed.

**Alternatives considered**:
- *Hard p95 latency SLA*: rejected as premature; the perceptible-jank +
  reuse-on-reload criteria are the user-meaningful measures.

---

## Summary of resolved unknowns

| # | Unknown | Resolution |
|---|---------|-----------|
| R1 | Inference library | Migrate to `@huggingface/transformers` current major, on-device, guarded swap |
| R2 | Model & labels | Keep DistilBERT multilingual student (primary) + star fallback; single model |
| R3 | Staleness/invalidation | Persist real content hash + model id/version; reuse only if all match; overrides exempt |
| R4 | Text normalization | Normalize + strip URLs + cap ≤512 chars on word boundary; <3 chars → neutral/0 |
| R5 | Confidence rule | One `isConfident` predicate everywhere; drop separate team-mood threshold |
| R6 | Mood formula | `score = 1 + 9·(p + 0.4·u)`; all-neutral ≈ 4.6 ("Preocupante"); fix `useMemo` deps |
| R7 | Role adjustment | One adjusted distribution feeds score + percentages + alerts |
| R8 | Performance | Worker-only batched dispatch; ~200-card smooth target; no re-inference on reload |

No remaining NEEDS CLARIFICATION.

## Sources

- [Transformers.js v3: WebGPU Support, New Models & Tasks](https://huggingface.co/blog/transformersjs-v3)
- [@xenova/transformers vs @huggingface/transformers (issue #1291)](https://github.com/huggingface/transformers.js/issues/1291)
- [Xenova/distilbert-base-multilingual-cased-sentiments-student](https://huggingface.co/Xenova/distilbert-base-multilingual-cased-sentiments-student)
- [huggingface/transformers.js](https://github.com/huggingface/transformers.js/)
