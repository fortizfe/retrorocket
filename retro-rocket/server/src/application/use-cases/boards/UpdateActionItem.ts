import type { BoardReadPort } from '../../ports/boards';
import type { ActionItem, ActionItemPort, UpdateActionItemInput } from '../../ports/facilitator';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface UpdateActionItemDeps {
    boardReadPort: BoardReadPort;
    actionItemPort: ActionItemPort;
}

export interface UpdateActionItemParams {
    boardId: string;
    itemId: string;
    requesterUid: string;
    updates: UpdateActionItemInput;
}

/** contracts/facilitator-tools-api.md `PATCH /api/boards/:id/action-items/:itemId` — facilitator only. */
export async function updateActionItem(deps: UpdateActionItemDeps, params: UpdateActionItemParams): Promise<ActionItem> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may edit action items');
    }
    const item = await deps.actionItemPort.getActionItem(params.itemId);
    if (!item || item.retrospectiveId !== params.boardId) throw new NotFoundError('Action item not found');
    return deps.actionItemPort.updateActionItem(params.itemId, params.updates);
}
