# Quickstart & Validation: Accurate AI Card Sentiment & Team Mood Analysis

**Feature**: 011-ai-sentiment-accuracy | **Date**: 2026-07-23

Runnable validation for each deviation fix. All commands run from
`retro-rocket/`. This is a validation guide — implementation lives in `tasks.md`.

## Prerequisites

```bash
cd retro-rocket
npm install                 # after the dependency swap: @xenova → @huggingface/transformers
npm run type-check          # strict TS must pass (no unjustified any)
npm run lint
```

## A. Automated checks (primary gate)

Each deviation F1–F7 has a unit test that fails against the OLD behavior and
passes after the fix (SC-005). Pure domain logic needs no live model.

```bash
# Full suite with coverage (must stay ≥ 80% — Constitution VI)
npm run test:coverage

# Focused domain specs (fast, no model download)
npm run test:run -- src/test/features/boards/sentiment
```

Expected key assertions:

| Test area | Asserts | Deviation |
|-----------|---------|-----------|
| `domain/moodScore` | all-neutral ⇒ 4.0; all-positive ⇒ 10; all-negative ⇒ 1; balanced ⇒ 5.5 (anchor table) | F5 / FR-007 |
| `domain/moodDistribution` | negatives in a `negative`-role column are reclassified as expected; score, %, and alerts read the same adjusted numbers | F4 / FR-006 |
| `domain/confidence` | one predicate; a card shown as a badge is counted by team mood and vice-versa | F3,F7 / FR-003,FR-009 |
| `domain/textNormalization` | long text capped ≤512 chars on word boundary; URLs stripped; `<3` chars ⇒ null | F2 / FR-002,FR-005 |
| `isFresh` / results load | stored state reused iff text-hash + modelId + modelVersion all match; overrides always fresh | F1 / FR-004,FR-004a |
| `useTeamMood` deps | score/insights recompute when `columnConfigs` role/title changes | F6 / FR-008 |
| override persistence | override survives re-analyze + reload; counted in report | FR-011,FR-012 |

## B. Manual end-to-end validation

```bash
npm run dev                 # http://localhost:3000
```

1. **Trustworthy card states (US1)** — On a board with analysis enabled, add
   cards: clearly negative (ES + EN), clearly positive, neutral, one very long
   (paste several sentences + a URL), one 2-char card.
   - Expect: each badge matches human judgement; the long card gets a
     representative state (not stuck/placeholder); the 2-char card is neutral.
2. **Reuse on reload (SC-002)** — Reload the page.
   - Expect: badges reappear immediately with **no** re-analysis flicker;
     DevTools shows no new model inference for unchanged cards.
3. **Edit re-analyses (US1.4)** — Edit a card's text.
   - Expect: that card (only) re-analyses and updates.
4. **Consistent team mood (US2)** — Open the facilitator Team-Mood panel on:
   - an all-neutral board → score ≈ **4.0 "Preocupante"** (never positive);
   - a board with heavy negativity in a "what hindered" (negative-role) column →
     the critical-negativity alert does **not** fire for that expected negativity,
     and the score is not depressed by it;
   - confirm score, percentages, and alerts tell one consistent story.
5. **Column role change (FR-008)** — Change a column's role/title.
   - Expect: mood score and insights recompute immediately.
6. **Override durability (US3)** — Override a card's sentiment, then reload and
   edit a different card.
   - Expect: the override sticks and is reflected in the report.
7. **Resilience (FR-013/FR-014)** — Simulate model-load failure (offline first
   load) and toggle analysis off.
   - Expect: explicit non-silent state; disabling clears states/report cleanly.

## C. Accessibility & i18n gates (Constitution VIII / i18n)

```bash
npm run e2e                 # includes @axe-core/playwright checks
```

- Sentiment badges convey state via icon + accessible text/aria, **not color
  alone**; contrast ≥ 4.5:1 (text) / 3:1 (non-text) in **both** light and dark
  themes.
- No hardcoded strings — all new/changed user-visible text via i18next keys in
  every supported locale (ES + EN).

## D. Bundle / migration sanity (R1)

```bash
npm run build
```

- Build succeeds; the `transformers` manual chunk now resolves
  `@huggingface/transformers`; no `@xenova/transformers` references remain
  (`grep -r "@xenova/transformers" src vite.config.ts` ⇒ empty).
- Bundle size for the transformers chunk does not regress materially vs. the v2
  baseline (it stays lazily loaded behind the worker / facilitator surface).

## Done (feature-level)

- [ ] A + C + D all green in CI; coverage ≥ 80%.
- [ ] Manual B scenarios 1–7 pass.
- [ ] `grep -r "@xenova/transformers"` and references to removed dead code
      (`SentimentResultsService.saveResult`, unused `getProgress`,
      `SentimentControls` if dead) return empty. (FR-017)
- [ ] All external consumers import from `@/features/boards/sentiment` barrel
      only. (SC-007)
