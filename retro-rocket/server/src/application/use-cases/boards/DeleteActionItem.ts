import type { BoardReadPort } from '../../ports/boards';
import type { ActionItemPort } from '../../ports/facilitator';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface DeleteActionItemDeps {
    boardReadPort: BoardReadPort;
    actionItemPort: ActionItemPort;
}

export interface DeleteActionItemParams {
    boardId: string;
    itemId: string;
    requesterUid: string;
}

/** contracts/facilitator-tools-api.md `DELETE /api/boards/:id/action-items/:itemId` — facilitator only. */
export async function deleteActionItem(deps: DeleteActionItemDeps, params: DeleteActionItemParams): Promise<void> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may delete action items');
    }
    const item = await deps.actionItemPort.getActionItem(params.itemId);
    if (!item || item.retrospectiveId !== params.boardId) throw new NotFoundError('Action item not found');
    await deps.actionItemPort.deleteActionItem(params.itemId);
}
