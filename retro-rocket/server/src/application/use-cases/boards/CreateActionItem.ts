import type { BoardReadPort } from '../../ports/boards';
import type { ActionItem, ActionItemPort } from '../../ports/facilitator';
import { AppError, ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface CreateActionItemDeps {
    boardReadPort: BoardReadPort;
    actionItemPort: ActionItemPort;
}

export interface CreateActionItemParams {
    boardId: string;
    requesterUid: string;
    content: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/** contracts/facilitator-tools-api.md `POST /api/boards/:id/action-items` — facilitator only (FR-004). */
export async function createActionItem(deps: CreateActionItemDeps, params: CreateActionItemParams): Promise<ActionItem> {
    if (params.content.trim() === '') {
        throw new AppError('invalid_request', 'content is required', 400);
    }
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may create action items');
    }
    return deps.actionItemPort.createActionItem({
        retrospectiveId: params.boardId,
        content: params.content,
        createdBy: params.requesterUid,
        assignedTo: params.assignedTo ?? null,
        assignedToName: params.assignedToName ?? null,
        dueDate: params.dueDate ?? null,
    });
}
