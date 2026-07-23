# Phase 1 Data Model: Accurate AI Card Sentiment & Team Mood Analysis

**Feature**: 011-ai-sentiment-accuracy | **Date**: 2026-07-23

Derived from the spec's Key Entities and the Phase 0 decisions. This feature
adds fields to an existing entity and reshapes derived (in-memory) structures;
it introduces **no new Firestore collection**.

---

## 1. Card State (`SentimentResult`)

The AI-inferred (or facilitator-overridden) sentiment of one card.

| Field | Type | Notes | Requirement |
|-------|------|-------|-------------|
| `cardId` | `string` | Card this state belongs to. | — |
| `sentiment` | `'positive' \| 'negative' \| 'neutral'` | The category. | FR-001 |
| `confidence` | `number` (0–1) | Model score, or `1` for overrides / `0` for below-min content. | FR-001, FR-005 |
| `timestamp` | `Date` | When produced. | — |
| `isOverride` | `boolean` | `true` = facilitator manual correction; never auto-invalidated. | FR-011, FR-012 |
| `modelId` | `string` | **NEW/enforced** — model that produced it (empty for overrides). | FR-004a |
| `modelVersion` | `string` | **NEW** — `@huggingface/transformers` version (or bumped constant). | FR-004, FR-004a |
| `contentHash` | `string` | **FIXED** — hash of the **card text** (was hash of `cardId`). | FR-004 |

**Validation / rules**
- A stored state is **fresh** (reusable without re-analysis) iff
  `hash(currentText) === contentHash` AND `currentModelId === modelId` AND
  `currentModelVersion === modelVersion`. Otherwise it is **stale** → re-queued.
  (R3, FR-004)
- `isOverride === true` states are exempt from all staleness checks and are never
  overwritten by an automatic result (existing invariant, preserved). (FR-011)
- Content with `< 3` non-whitespace chars ⇒ `{ sentiment: 'neutral', confidence:
  0 }`, not analysed. (FR-005)
- `action`-column cards are never analysed and hold no state. (existing)

**State transitions**

```
(no state) --analyse--> auto{sentiment,confidence,modelId,modelVersion,contentHash}
auto --text edited (hash changes)--> stale --re-analyse--> auto'
auto --model/version changed--> stale --re-analyse--> auto'
auto | stale --facilitator override--> override{isOverride:true, confidence:1}
override --re-analyse/reload/model change--> override   (unchanged; exempt)
any --analysis disabled--> (cleared)                    (FR-014)
```

---

## 2. Firestore document — `sentimentResults/{retrospectiveId}_{cardId}`

One upsertable doc per card (deterministic id). Existing collection; fields
adjusted.

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `retrospectiveId` | string | — | Partition/query key. |
| `cardId` | string | — | |
| `sentiment` | string | — | |
| `confidence` | number | — | |
| `modelId` | string | keep | Now always populated for auto results. |
| `modelVersion` | string | **ADD** | New; enables model-change invalidation on load. |
| `contentHash` | string | **FIX** | Now the **card-text** hash, written by every save path (`saveResultWithHash`, batch persist). |
| `isOverride` | boolean | — | |
| `overrideBy` | string \| null | — | Facilitator uid when override. |
| `analyzedAt` | serverTimestamp | — | |

**Load behavior (F1 fix)**: `loadResults` returns records with `contentHash` +
`modelId` + `modelVersion`; the results hook marks a loaded record fresh only
when it matches the current card text and active model identity, so a warm
reload performs **zero** re-inference (SC-002).

**Security rules**: unchanged — `sentimentResults` remains readable/writable by
any authenticated non-anonymous participant (`firestore.rules`). No new
collection ⇒ no rule additions. Adding two fields does not weaken existing rules
(Constitution: Real-Time Data Security).

**Dead code removed (F9)**: `SentimentResultsService.saveResult()` (no callers;
`saveResultWithHash` is the sole write path) — see FR-017.

---

## 3. Sentiment Configuration (`SentimentConfiguration`) — consolidated

Single source of truth for the confidence rule (R5).

| Field | Type | Notes |
|-------|------|-------|
| `enabled` | boolean | |
| `modelId` | string | Active model. |
| `batchSize` | number | Dispatch chunk size (default 5). |
| `thresholds` | `{ positive; negative; neutral }` | The **only** confidence gate; used by badges, counts, filter, AND team mood. Defaults: 0.4 / 0.4 / 0.25. |

- `threshold` (flat) is retained only as a fallback inside `isConfident` when
  `thresholds` is absent; team-mood's separate `minConfidenceThreshold` is
  **removed** (R5, FR-009).

---

## 4. Team-Mood Report (`TeamMoodReport`) — derived, in-memory

Recomputed by `useTeamMood`; not persisted. Built from the **single adjusted
distribution** (R7).

| Field | Type | Notes | Requirement |
|-------|------|-------|-------------|
| `metrics` | `TeamMoodMetrics` | Totals + per-column, from adjusted distribution. | FR-006 |
| `insights` | `TeamMoodInsight[]` | Alerts derived from the **same** adjusted distribution. | FR-006 |
| `moodScore` | number (1–10) | New formula `1 + 9·(p + 0.4·u)`; all-neutral ≈ 4.6 ("Preocupante"). | FR-007 |
| `moodTrend` | `'improving' \| 'declining' \| 'stable'` | Stays `'stable'` (future). | — |
| `timestamp` | Date | | — |

**Adjusted distribution (new intermediate, `domain/moodDistribution.ts`)**

| Field | Type | Notes |
|-------|------|-------|
| `positive` / `neutral` / `negative` | number | Counts AFTER reclassifying expected negativity (negative cards in negative-role columns → counted as expected/neutral). |
| `total` | number | Analysed, confident, non-action cards. |
| `positivePct` / `neutralPct` / `negativePct` | number | Derived from adjusted counts (feed score, %, alerts). |
| `perColumn` | `ColumnMoodMetrics[]` | Same adjustment applied per column. |

**Rules**
- Only cards passing the shared `isConfident` predicate are counted (FR-009).
- Alerts (critical/warning negative, low positive, critical column) read adjusted
  percentages, so they never contradict `moodScore` (FR-006, SC-003).
- `hasEnoughData` = ≥ 3 analysable (non-action) cards; otherwise report surfaces
  an explicit "insufficient data" insight instead of a misleading score
  (FR-010).
- `report` recomputes when its inputs change **including `columnConfigs`**
  (F6/FR-008 — dependency-array fix).

---

## 5. Column Role (`ColumnRole`) — existing, reused

`'positive' | 'negative' | 'neutral' | 'action'` from
`getColumnRole(columnId)` (`useRetrospectiveColumns.ts`).

- `negative` → negativity is *expected*; reclassified in the adjusted
  distribution (R7).
- `action` → excluded from analysis and from the report entirely.
- `positive` / `neutral` → negativity counts as negative.

No structural change; consumed as the single input to the role adjustment so the
whole report is role-consistent.
