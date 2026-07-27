import type { BoardReadPort } from '../../ports/boards';
import type { CountdownPort, CountdownTimer } from '../../ports/facilitator';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface CreateOrUpdateCountdownDeps {
    boardReadPort: BoardReadPort;
    countdownPort: CountdownPort;
}

export interface CreateOrUpdateCountdownParams {
    boardId: string;
    requesterUid: string;
    duration: number;
}

/** contracts/facilitator-tools-api.md `POST /api/boards/:id/countdown` — facilitator only (FR-004). */
export async function createOrUpdateCountdown(deps: CreateOrUpdateCountdownDeps, params: CreateOrUpdateCountdownParams): Promise<CountdownTimer> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may configure the countdown timer');
    }
    return deps.countdownPort.createOrUpdateTimer(params.boardId, params.duration, params.requesterUid);
}
