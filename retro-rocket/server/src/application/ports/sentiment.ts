// ---------------------------------------------------------------------------
// SentimentResultPort — read/write Firestore access for card sentiment results
// (feature 019). Deterministic doc id `{retroId}_{cardId}` preserved exactly
// (data-model.md); AI inference itself stays client-side, unaffected.
// ---------------------------------------------------------------------------

export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface SentimentResultDTO {
    retrospectiveId: string;
    cardId: string;
    sentiment: SentimentType;
    confidence: number;
    modelId?: string;
    modelVersion?: string;
    contentHash: string;
    isOverride: boolean;
    overrideBy: string | null;
    analyzedAt: Date;
}

export interface SaveSentimentResultInput {
    retrospectiveId: string;
    cardId: string;
    sentiment: SentimentType;
    confidence: number;
    modelId?: string;
    modelVersion?: string;
    contentHash: string;
}

export interface SentimentResultPort {
    listResults(retrospectiveId: string): Promise<SentimentResultDTO[]>;
    getResult(retrospectiveId: string, cardId: string): Promise<SentimentResultDTO | null>;
    /** Computed-result save — any participant, isOverride left false unless already overridden. */
    saveResult(input: SaveSentimentResultInput): Promise<SentimentResultDTO>;
    /** Facilitator-only manual override — sets isOverride:true, overrideBy:uid. */
    saveOverride(retrospectiveId: string, cardId: string, uid: string, sentiment: SentimentType): Promise<SentimentResultDTO>;
}
