import type { CardPort } from '../../ports/cards';
import type { RetrospectiveBoardPort } from '../../ports/retrospective';
import type { SentimentResultDTO, SentimentResultPort, SentimentType } from '../../ports/sentiment';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface SaveSentimentResultDeps {
    cardPort: CardPort;
    sentimentResultPort: SentimentResultPort;
}

export interface SaveSentimentResultParams {
    cardId: string;
    sentiment: SentimentType;
    confidence: number;
    modelId?: string;
    modelVersion?: string;
    contentHash: string;
}

/** PUT /api/cards/:id/sentiment — any authenticated participant. `retrospectiveId` is
 * looked up server-side from the card rather than trusted from the request body. */
export async function saveSentimentResult(deps: SaveSentimentResultDeps, params: SaveSentimentResultParams): Promise<SentimentResultDTO> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');

    return deps.sentimentResultPort.saveResult({
        retrospectiveId: card.retrospectiveId,
        cardId: params.cardId,
        sentiment: params.sentiment,
        confidence: params.confidence,
        modelId: params.modelId,
        modelVersion: params.modelVersion,
        contentHash: params.contentHash,
    });
}

export interface SaveSentimentOverrideDeps {
    cardPort: CardPort;
    retrospectiveBoardPort: RetrospectiveBoardPort;
    sentimentResultPort: SentimentResultPort;
}

export interface SaveSentimentOverrideParams {
    cardId: string;
    uid: string;
    sentiment: SentimentType;
}

/** PUT /api/cards/:id/sentiment/override — facilitator-only (data-model.md). */
export async function saveSentimentOverride(deps: SaveSentimentOverrideDeps, params: SaveSentimentOverrideParams): Promise<SentimentResultDTO> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');

    const board = await deps.retrospectiveBoardPort.getRetrospective(card.retrospectiveId);
    if (!board) throw new NotFoundError('El tablero especificado no existe o no está disponible');
    if (board.createdBy !== params.uid) {
        throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
    }

    return deps.sentimentResultPort.saveOverride(card.retrospectiveId, params.cardId, params.uid, params.sentiment);
}
