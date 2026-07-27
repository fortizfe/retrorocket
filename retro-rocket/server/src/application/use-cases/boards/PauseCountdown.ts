import type { BoardReadPort } from '../../ports/boards';
import type { CountdownPort, CountdownTimer } from '../../ports/facilitator';
import { AppError, ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface PauseCountdownDeps {
    boardReadPort: BoardReadPort;
    countdownPort: CountdownPort;
}

export interface PauseCountdownParams {
    boardId: string;
    requesterUid: string;
}

/** contracts/facilitator-tools-api.md `POST /api/boards/:id/countdown/pause` — facilitator only (FR-004). */
export async function pauseCountdown(deps: PauseCountdownDeps, params: PauseCountdownParams): Promise<CountdownTimer> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may pause the countdown timer');
    }
    const timer = await deps.countdownPort.getTimer(params.boardId);
    if (!timer) throw new NotFoundError('Timer not found');
    if (!timer.isRunning || !timer.startTime) {
        throw new AppError('invalid_request', 'Timer is not running', 400);
    }
    return deps.countdownPort.pauseTimer(params.boardId);
}
