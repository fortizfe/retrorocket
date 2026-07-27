import type { BoardReadPort } from '../../ports/boards';
import type { SentimentPort, SentimentResult, SentimentType } from '../../ports/facilitator';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface OverrideSentimentResultDeps {
    boardReadPort: BoardReadPort;
    sentimentPort: SentimentPort;
}

export interface OverrideSentimentResultParams {
    boardId: string;
    cardId: string;
    requesterUid: string;
    sentiment: SentimentType;
}

/** contracts/facilitator-tools-api.md `PUT /api/boards/:id/cards/:cardId/sentiment/override` — facilitator only. */
export async function overrideSentimentResult(deps: OverrideSentimentResultDeps, params: OverrideSentimentResultParams): Promise<SentimentResult> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may override a sentiment result');
    }
    return deps.sentimentPort.saveOverride(params.boardId, params.cardId, params.sentiment, params.requesterUid);
}
