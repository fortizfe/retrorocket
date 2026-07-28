import type { BoardsPort, BoardSummary } from '../../ports/boards';

export interface JoinBoardParams {
    boardId: string;
    uid: string;
    userName: string;
}

/**
 * POST /api/boards/:id/join (session-cookie-authenticated). Idempotent: already being a
 * participant (or the owner) simply returns the current board, no duplicate membership.
 * Not-found/inactive-board rejection is enforced by the adapter (NotFoundError).
 */
export async function joinBoard(deps: { boardsPort: BoardsPort }, params: JoinBoardParams): Promise<BoardSummary> {
    return deps.boardsPort.joinBoard(params.boardId, params.uid, params.userName);
}
