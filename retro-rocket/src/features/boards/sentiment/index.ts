/**
 * Public surface of the sentiment / team-mood capability (Library-First, SC-007).
 * External consumers MUST import only from `@/features/boards/sentiment`; everything
 * else under this folder is internal.
 */

// ── Providers & context ──────────────────────────────────────────────────────
export {
    SentimentStoreProvider,
    useSentimentContext,
    useSentimentSetter,
    SentimentContext,
    type SentimentContextValue,
} from '@/features/boards/sentiment/contexts/SentimentContext';

// ── Orchestration hooks ──────────────────────────────────────────────────────
export { useSentiment } from '@/features/boards/sentiment/hooks/useSentiment';
export { useTeamMood } from '@/features/boards/sentiment/hooks/useTeamMood';
export { isAnalyzableCard, type SentimentCounts } from '@/features/boards/sentiment/hooks/useSentimentResults';

// ── Components ────────────────────────────────────────────────────────────────
export {
    SentimentBadge,
    SentimentFilter,
    SentimentProgressBar,
    TeamMoodDashboard,
} from '@/features/boards/sentiment/components';

// ── Types & config ───────────────────────────────────────────────────────────
export {
    type SentimentType,
    type SentimentResult,
    type SentimentConfiguration,
    type SentimentBadgeProps,
    type SentimentFilterProps,
    type ModelConfig,
    DEFAULT_SENTIMENT_CONFIG,
    SENTIMENT_MODELS,
    SENTIMENT_COLORS,
    MODEL_VERSION,
    shouldShowSentimentBadge,
} from '@/features/boards/types/sentiment';

export {
    type TeamMoodReport,
    type TeamMoodMetrics,
    type TeamMoodInsight,
    type ColumnMoodMetrics,
    type TeamMoodConfig,
    DEFAULT_TEAM_MOOD_CONFIG,
    getMoodScoreColor,
    getMoodScoreBgColor,
} from '@/features/boards/types/teamMood';

// ── Pure domain functions (individually testable) ────────────────────────────
export { isConfident } from '@/features/boards/sentiment/domain/confidence';
export { isFresh } from '@/features/boards/sentiment/domain/staleness';
export { hashContent } from '@/features/boards/sentiment/domain/contentHash';
export { normalizeForInference } from '@/features/boards/sentiment/domain/textNormalization';
export { calculateMoodScore } from '@/features/boards/sentiment/domain/moodScore';
export {
    computeMoodDistribution,
    type AdjustedDistribution,
} from '@/features/boards/sentiment/domain/moodDistribution';
