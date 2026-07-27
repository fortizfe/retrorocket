import type { BoardReadPort, BoardWritePort } from '../../ports/boards';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface DeleteBoardCascadeDeps {
    boardReadPort: BoardReadPort;
    boardWritePort: BoardWritePort;
}

export interface DeleteBoardCascadeParams {
    boardId: string;
    requesterUid: string;
}

/**
 * contracts/boards-api.md `DELETE /api/boards/:id` — owner-only (FR-004) full cascade
 * delete (research.md §3 completeness fix over every current implementation).
 */
export async function deleteBoardCascade(deps: DeleteBoardCascadeDeps, params: DeleteBoardCascadeParams): Promise<void> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (board.createdBy !== params.requesterUid) {
        throw new ForbiddenError('Only the board creator may delete it');
    }
    await deps.boardWritePort.deleteBoardCascade(params.boardId);
}
