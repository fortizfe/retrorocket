import type { SentimentPort } from '../../ports/facilitator';

export interface DeleteSentimentResultDeps {
    sentimentPort: SentimentPort;
}

export interface DeleteSentimentResultParams {
    boardId: string;
    cardId: string;
}

/**
 * contracts/facilitator-tools-api.md `DELETE /api/boards/:id/cards/:cardId/sentiment` —
 * any participant; board-scoped access is enforced by the caller via assertBoardAccess.
 */
export async function deleteSentimentResult(deps: DeleteSentimentResultDeps, params: DeleteSentimentResultParams): Promise<void> {
    await deps.sentimentPort.deleteResult(params.boardId, params.cardId);
}
