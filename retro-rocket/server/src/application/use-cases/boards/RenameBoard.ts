import type { BoardReadPort, BoardWithColumns, BoardWritePort, UpdateBoardInput } from '../../ports/boards';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface RenameBoardDeps {
    boardReadPort: BoardReadPort;
    boardWritePort: BoardWritePort;
}

export interface RenameBoardParams {
    boardId: string;
    requesterUid: string;
    updates: UpdateBoardInput;
}

/** contracts/boards-api.md `PATCH /api/boards/:id` — owner-only (FR-004). */
export async function renameBoard(deps: RenameBoardDeps, params: RenameBoardParams): Promise<BoardWithColumns> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (board.createdBy !== params.requesterUid) {
        throw new ForbiddenError('Only the board creator may rename it');
    }
    return deps.boardWritePort.renameBoard(params.boardId, params.updates);
}
