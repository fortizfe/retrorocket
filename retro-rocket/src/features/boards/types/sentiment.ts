// Sentiment analysis types for RetroRocket

import { isConfident } from '@/features/boards/sentiment/domain/confidence';

export type SentimentType = 'positive' | 'negative' | 'neutral';

/**
 * Invalidation token for the active inference stack. Bumped whenever a change
 * (library migration, model swap) could alter outputs, so persisted results
 * produced by an older stack are treated as stale and re-analysed (FR-004/FR-004a).
 */
export const MODEL_VERSION = 'hf-transformers-3-lang-routing';

export interface SentimentResult {
    sentiment: SentimentType;
    confidence: number;
    cardId: string;
    timestamp: Date;
    modelId?: string;
    /** Inference-stack version that produced this result (empty for overrides). */
    modelVersion?: string;
    /** Hash of the card text this result was produced from (F1 staleness). */
    contentHash?: string;
    isOverride?: boolean;
}

export interface SentimentAnalysisState {
    enabled: boolean;
    loading: boolean;
    ready: boolean;
    results: Map<string, SentimentResult>;
    error?: string;
}

export interface SentimentConfiguration {
    enabled: boolean;
    modelId: string; // Legacy single-model id / routing fallback identity
    /**
     * The model SET loaded for analysis. When it contains language-specific models
     * the worker routes each card by its detected language (FR-008); when absent or
     * single, behaviour is the classic single-model path. Adopted config: the
     * benchmark-validated ES/EN routing pair (see evaluation/results.md).
     */
    modelIds?: string[];
    threshold: number; // Confidence threshold for showing results
    batchSize: number; // Number of cards to process at once
    // New granular thresholds
    thresholds?: {
        positive: number; // Minimum confidence to show positive badges
        negative: number; // Minimum confidence to show negative badges  
        neutral: number;  // Minimum confidence to show neutral badges
    };
}

export interface SentimentBadgeProps {
    sentiment: SentimentType;
    confidence: number;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
    isOverride?: boolean;
    canOverride?: boolean;
    onOverride?: (next: SentimentType) => void;
}

export interface SentimentFilterProps {
    currentFilter: SentimentType | 'all';
    onFilterChange: (filter: SentimentType | 'all') => void;
    counts: {
        positive: number;
        negative: number;
        neutral: number;
        total: number;
    };
}

// Model configurations
/** Language a model serves; `multilingual` is the default/fallback route (FR-002a/013). */
export type ModelLanguage = 'es' | 'en' | 'multilingual';

export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    /** Route this model serves. Exactly one model MUST be `multilingual` (the default). */
    language: ModelLanguage;
    primary: boolean;
    mapLabels?: (labels: { label?: string; score?: number }[]) => SentimentType;
}

/**
 * Maps CardiffNLP twitter-roberta label schemes to the 3-category taxonomy (FR-004).
 * The `-latest` port emits readable `negative|neutral|positive`; older builds emit
 * `LABEL_0|LABEL_1|LABEL_2` (0=neg, 1=neu, 2=pos). Handle both.
 */
function mapRobertaLabels(labels: { label?: string }[]): SentimentType {
    const raw = labels[0]?.label?.toLowerCase() ?? '';
    if (raw.includes('label_2') || raw.includes('positive') || raw === 'pos') return 'positive';
    if (raw.includes('label_0') || raw.includes('negative') || raw === 'neg') return 'negative';
    return 'neutral';
}

/**
 * Candidate + configured sentiment models. Index 0 is the runtime default. The
 * language-specific entries (RoBERTuito/twitter-roberta) are CANDIDATES evaluated by
 * the gated benchmark (SC-001/FR-006); they are only loaded at runtime once a
 * benchmark-driven configuration selects them, so their mere presence here does not
 * change default behaviour (the default config below loads only index 0).
 */
export const SENTIMENT_MODELS: ModelConfig[] = [
    {
        id: 'Xenova/distilbert-base-multilingual-cased-sentiments-student',
        name: 'DistilBERT Multilingual Sentiment',
        description: 'Default multilingual model for sentiment analysis (ES/EN) and routing fallback',
        language: 'multilingual',
        primary: true
    },
    {
        id: 'Xenova/twitter-roberta-base-sentiment-latest',
        name: 'Twitter-RoBERTa Sentiment (EN)',
        description: 'Candidate English route: CardiffNLP, tweet-trained (informal), 3-class',
        language: 'en',
        primary: false,
        mapLabels: mapRobertaLabels
    },
    {
        id: 'Xenova/robertuito-sentiment-analysis',
        name: 'RoBERTuito Sentiment (ES)',
        description: 'Candidate Spanish route: pysentimiento RoBERTuito, tweet-trained (informal), 3-class POS/NEG/NEU',
        language: 'es',
        primary: false
        // Native POS/NEG/NEU labels are resolved by the default mapper path.
    },
    {
        id: 'Xenova/bert-base-multilingual-uncased-sentiment',
        name: 'BERT Multilingual Sentiment',
        description: 'Emergency fallback model with star rating (1-5 stars)',
        language: 'multilingual',
        primary: false,
        mapLabels: (labels) => {
            // Map 1-2 stars = negative, 3 = neutral, 4-5 = positive
            const rating = labels[0]?.label?.match(/(\d)/)?.[1];
            if (!rating) return 'neutral';
            const stars = Number.parseInt(rating);
            if (stars <= 2) return 'negative';
            if (stars >= 4) return 'positive';
            return 'neutral';
        }
    }
];

// Default configuration.
// ADOPTED (feature 013, evidence-gated): language-aware routing — Spanish cards →
// RoBERTuito, English cards → twitter-roberta. The benchmark scored this 2-model set
// at 90.0% vs 72.5% for the previous single distilbert model (+17.5 pp, SC-001) at
// ~1.7× download footprint (within the ~2× budget, FR-013). `modelId` stays the
// multilingual model as the documented fallback identity. See evaluation/results.md.
export const DEFAULT_SENTIMENT_CONFIG: SentimentConfiguration = {
    enabled: true,
    modelId: SENTIMENT_MODELS[0].id,
    modelIds: [
        SENTIMENT_MODELS.find(m => m.language === 'en')!.id,
        SENTIMENT_MODELS.find(m => m.language === 'es')!.id,
    ],
    threshold: 0.4, // Lowered from 0.6 to 0.4 for more permissive sentiment detection
    batchSize: 5,
    // Granular thresholds for different sentiment types
    thresholds: {
        positive: 0.4,  // Higher confidence required for positive
        negative: 0.4,  // Higher confidence required for negative
        neutral: 0.25   // Lower confidence OK for neutral (more inclusive)
    }
};

// Colors for sentiment display
export const SENTIMENT_COLORS = {
    positive: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-200 dark:border-green-700',
        icon: '😊'
    },
    negative: {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-200 dark:border-red-700',
        icon: '😞'
    },
    neutral: {
        bg: 'bg-slate-100 dark:bg-slate-700/40',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-600',
        icon: '😐'
    }
} as const;

/**
 * Utility function to determine if a sentiment badge should be shown.
 * Delegates to the single confidence predicate (F3/F7) so that a card shown on
 * the board is counted identically by filters and the team-mood report.
 */
export const shouldShowSentimentBadge = (
    result: SentimentResult,
    config: SentimentConfiguration
): boolean => isConfident(result, config);
