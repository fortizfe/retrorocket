import type { SaveSentimentInput, SentimentPort, SentimentResult } from '../../ports/facilitator';

export interface SaveSentimentResultDeps {
    sentimentPort: SentimentPort;
}

/**
 * contracts/facilitator-tools-api.md `PUT /api/boards/:id/cards/:cardId/sentiment` — any
 * participant (whoever's client just computed it on-device, FR-007). Board-scoped access
 * (participant-or-creator) is enforced by the caller via assertBoardAccess before this
 * runs; upsert-if-content-changed is handled by the port (matches saveResultWithHash).
 */
export async function saveSentimentResult(deps: SaveSentimentResultDeps, input: SaveSentimentInput): Promise<SentimentResult> {
    return deps.sentimentPort.saveResult(input);
}
