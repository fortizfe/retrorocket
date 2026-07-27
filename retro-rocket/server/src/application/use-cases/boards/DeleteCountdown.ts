import type { BoardReadPort } from '../../ports/boards';
import type { CountdownPort } from '../../ports/facilitator';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface DeleteCountdownDeps {
    boardReadPort: BoardReadPort;
    countdownPort: CountdownPort;
}

export interface DeleteCountdownParams {
    boardId: string;
    requesterUid: string;
}

/** contracts/facilitator-tools-api.md `DELETE /api/boards/:id/countdown` — facilitator only (FR-004). */
export async function deleteCountdown(deps: DeleteCountdownDeps, params: DeleteCountdownParams): Promise<void> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may delete the countdown timer');
    }
    await deps.countdownPort.deleteTimer(params.boardId);
}
