// Sentiment analysis types for RetroRocket

export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
    sentiment: SentimentType;
    confidence: number;
    cardId: string;
    timestamp: Date;
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
    modelId: string;
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
export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    primary: boolean;
    mapLabels?: (labels: any[]) => SentimentType;
}

export const SENTIMENT_MODELS: ModelConfig[] = [
    {
        id: 'Xenova/distilbert-base-multilingual-cased-sentiments-student',
        name: 'DistilBERT Multilingual Sentiment',
        description: 'Primary multilingual model for sentiment analysis (ES/EN)',
        primary: true
    },
    {
        id: 'Xenova/bert-base-multilingual-uncased-sentiment',
        name: 'BERT Multilingual Sentiment',
        description: 'Fallback model with star rating (1-5 stars)',
        primary: false,
        mapLabels: (labels) => {
            // Map 1-2 stars = negative, 3 = neutral, 4-5 = positive
            const rating = labels[0]?.label?.match(/(\d)/)?.[1];
            if (!rating) return 'neutral';
            const stars = parseInt(rating);
            if (stars <= 2) return 'negative';
            if (stars >= 4) return 'positive';
            return 'neutral';
        }
    }
];

// Default configuration
export const DEFAULT_SENTIMENT_CONFIG: SentimentConfiguration = {
    enabled: true,
    modelId: SENTIMENT_MODELS[0].id,
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

// Utility function to determine if a sentiment badge should be shown
export const shouldShowSentimentBadge = (
    result: SentimentResult,
    config: SentimentConfiguration
): boolean => {
    if (!result || !config.thresholds) {
        // Fallback to general threshold
        return result.confidence >= config.threshold;
    }

    const thresholds = config.thresholds;

    switch (result.sentiment) {
        case 'positive':
            return result.confidence >= thresholds.positive;
        case 'negative':
            return result.confidence >= thresholds.negative;
        case 'neutral':
            return result.confidence >= thresholds.neutral;
        default:
            return false;
    }
};
