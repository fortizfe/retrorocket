import type { SentimentResult } from '@/features/boards/types/sentiment';
import { hashContent } from '@/features/boards/sentiment/domain/contentHash';

/**
 * A stored sentiment state is *fresh* (reusable without re-analysis) only when the
 * card text, the model id, AND the inference-stack version all still match (F1,
 * FR-004/FR-004a). Facilitator overrides are always fresh — they are authoritative
 * and never invalidated by a text or model change (FR-011).
 */
export function isFresh(
    stored: SentimentResult | undefined,
    text: string,
    modelId: string,
    modelVersion: string
): boolean {
    if (!stored) return false;
    if (stored.isOverride) return true;
    return (
        stored.contentHash === hashContent(text) &&
        stored.modelId === modelId &&
        stored.modelVersion === modelVersion
    );
}
