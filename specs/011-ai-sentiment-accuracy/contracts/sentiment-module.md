# Contract: Sentiment Analysis Module — Public Interface

**Feature**: 011-ai-sentiment-accuracy | **Type**: Frontend feature-module (UI + hooks)

This is the single public surface of the sentiment/team-mood capability
(Library-First, SC-007). External consumers MUST import only from the barrel
`@/features/boards/sentiment`; everything else under the folder is internal.
Deep imports from consumers are removed as part of this feature.

## Barrel: `@/features/boards/sentiment` (`index.ts`)

### Providers & context (unchanged behavior)

- `SentimentStoreProvider: React.FC<{ children }>` — wraps board + header.
- `useSentimentContext(): SentimentContextValue` — read active state; returns the
  disabled default outside a provider.
- `useSentimentSetter(): (value: SentimentContextValue | null) => void` — board
  pushes its live value.

### Orchestration hooks

- `useSentiment(cards: Card[], retrospectiveId: string): SentimentContextValue`
  — public shape unchanged (enabled/ready/loading/error, config, results,
  getSentiment, getSentimentCounts, shouldShowBadge, setEnabled, updateConfig,
  analyzeCard, analyzeBatch, filterCardsBySentiment, isProcessing,
  overrideSentiment, shouldAnalyze).
- `useTeamMood({ cards, sentimentResults, columnConfigs, config? }):
  { report, isAnalyzing, hasEnoughData, refreshReport }` — public shape
  unchanged; internals now use the adjusted distribution + new score.

### Components

- `SentimentBadge`, `SentimentFilter`, `SentimentProgressBar`,
  `TeamMoodDashboard` (+ facilitator `SentimentTab`, `TeamMoodTab` remain their
  own module but consume the barrel).
- `SentimentControls` — **removed if confirmed unreferenced** (F9/FR-017).

### Types & config

- `SentimentType`, `SentimentResult`, `SentimentConfiguration`,
  `DEFAULT_SENTIMENT_CONFIG`, `SENTIMENT_MODELS`, `SENTIMENT_COLORS`,
  `TeamMoodReport`, `TeamMoodMetrics`, `TeamMoodInsight`, `ColumnMoodMetrics`.

### Pure domain functions (`domain/*`) — newly exported, individually testable

| Function | Signature | Guarantee |
|----------|-----------|-----------|
| `isConfident` | `(result: SentimentResult, config: SentimentConfiguration) => boolean` | The **single** confidence rule used by badges, counts, filter, and team mood (FR-003/FR-009). |
| `normalizeForInference` | `(content: string) => string \| null` | Trim, collapse whitespace, strip bare URLs, cap ≤512 chars on a word boundary; `null` if `<3` non-ws chars (FR-002/FR-005). |
| `computeMoodDistribution` | `(cards, results, columnConfigs, config) => AdjustedDistribution` | One role-adjusted distribution feeding score + % + insights (FR-006). |
| `calculateMoodScore` | `(dist: AdjustedDistribution) => number` | `clamp(1,10, 1 + 9·(p + 0.4·u))`, 1-dp; all-neutral ⇒ ≈4.6 "Preocupante" (FR-007). |
| `isFresh` | `(stored: SentimentResult, text: string, modelId: string, modelVersion: string) => boolean` | True iff content hash AND model id AND version all match; overrides always fresh (FR-004/FR-004a). |

## Behavioral contract (consumer-visible invariants)

1. **Reuse on reload**: given unchanged card text and the same active model, a
   reload triggers **zero** re-inference; badges appear from persisted state
   without a flicker. (SC-002)
2. **Consistent counting**: a card for which `shouldShowBadge` is true is counted
   by `getSentimentCounts` and by `useTeamMood` on the same basis, and vice
   versa. (FR-009)
3. **Override durability**: after `overrideSentiment(cardId, s)`, the card's
   state stays `s` across analyze/reload/model-change and is the value counted in
   the report. (FR-011/FR-012)
4. **Report self-consistency**: for any board, `report.moodScore`,
   `report.metrics.*Percentage`, and `report.insights` are all derived from the
   same adjusted distribution — no combination yields "good score + critical
   negativity alarm" for expected negativity. (FR-006)
5. **Neutral floor**: an all-neutral board yields `moodScore ≈ 4.6`
   ("Preocupante"), never a positive/"good"/"Regular" label. (FR-007)
6. **Graceful degradation**: model-load failure or a single-card analysis failure
   surfaces an explicit error/neutral state, never a silent wrong number; the
   board and report stay usable. (FR-013)
7. **Disable clears**: disabling analysis clears card states and the report
   consistently with no lingering results. (FR-014)
