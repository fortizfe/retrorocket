import type { BoardReadPort } from '../../ports/boards';
import type { CountdownPort, CountdownTimer } from '../../ports/facilitator';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface StartCountdownDeps {
    boardReadPort: BoardReadPort;
    countdownPort: CountdownPort;
}

export interface StartCountdownParams {
    boardId: string;
    requesterUid: string;
}

/** contracts/facilitator-tools-api.md `POST /api/boards/:id/countdown/start` — facilitator only (FR-004). */
export async function startCountdown(deps: StartCountdownDeps, params: StartCountdownParams): Promise<CountdownTimer> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may start the countdown timer');
    }
    const timer = await deps.countdownPort.getTimer(params.boardId);
    if (!timer) throw new NotFoundError('Timer not found');
    return deps.countdownPort.startTimer(params.boardId);
}
