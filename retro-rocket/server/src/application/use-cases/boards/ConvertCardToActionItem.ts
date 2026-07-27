import type { BoardReadPort } from '../../ports/boards';
import type { ActionItem, ActionItemPort } from '../../ports/facilitator';
import { AppError, ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface ConvertCardToActionItemDeps {
    boardReadPort: BoardReadPort;
    actionItemPort: ActionItemPort;
}

export interface ConvertCardToActionItemParams {
    boardId: string;
    requesterUid: string;
    cardContent: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/**
 * contracts/facilitator-tools-api.md `POST /api/boards/:id/action-items/from-card` —
 * facilitator only. Convenience endpoint replacing convertCardToActionItem; the source
 * card itself is left untouched (this only creates a new, independent ActionItem).
 */
export async function convertCardToActionItem(deps: ConvertCardToActionItemDeps, params: ConvertCardToActionItemParams): Promise<ActionItem> {
    if (params.cardContent.trim() === '') {
        throw new AppError('invalid_request', 'cardContent is required', 400);
    }
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may convert cards to action items');
    }
    return deps.actionItemPort.createActionItem({
        retrospectiveId: params.boardId,
        content: params.cardContent,
        createdBy: params.requesterUid,
        assignedTo: params.assignedTo ?? null,
        assignedToName: params.assignedToName ?? null,
        dueDate: params.dueDate ?? null,
    });
}
