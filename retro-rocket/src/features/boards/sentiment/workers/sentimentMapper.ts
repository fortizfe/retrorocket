import { SentimentType, SENTIMENT_MODELS } from '@/features/boards/types/sentiment';

export interface MappedSentiment {
    sentiment: SentimentType;
    confidence: number;
}

export function mapSentiment(output: { label?: string; score?: number }[], modelId: string): MappedSentiment {
    if (!output || output.length === 0) return { sentiment: 'neutral', confidence: 0 };

    const result = output[0];
    const modelConfig = SENTIMENT_MODELS.find(m => m.id === modelId);

    if (modelConfig?.mapLabels) {
        return { sentiment: modelConfig.mapLabels(output), confidence: result.score ?? 0 };
    }

    const label = result.label?.toLowerCase() ?? '';
    if (label.includes('positive') || label.includes('pos')) {
        return { sentiment: 'positive', confidence: result.score ?? 0 };
    }
    if (label.includes('negative') || label.includes('neg')) {
        return { sentiment: 'negative', confidence: result.score ?? 0 };
    }
    return { sentiment: 'neutral', confidence: result.score ?? 0 };
}

/** Returns cleaned content ready for inference, or null if content is too short. */
export function prepareContent(content: string): string | null {
    const cleaned = content.trim().replace(/\s+/g, ' ');
    return cleaned.length >= 3 ? cleaned : null;
}
