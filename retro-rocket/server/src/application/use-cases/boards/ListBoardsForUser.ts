import type { BoardsPort, BoardSummary } from '../../ports/boards';

/** GET /api/boards (session-cookie-authenticated). */
export async function listBoardsForUser(deps: { boardsPort: BoardsPort }, uid: string): Promise<BoardSummary[]> {
    return deps.boardsPort.listBoardsForUser(uid);
}
