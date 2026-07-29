import type { ActionItemDTO, ActionItemPort, EditActionItemInput } from '../../ports/actionItems';
import { AppError } from '../../../domain/errors';

export interface CreateActionItemParams {
    retrospectiveId: string;
    content: string;
    createdBy: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/** POST /api/retrospectives/:id/action-items — any authenticated participant (FR-015,
 * independent of card conversion). */
export async function createActionItem(deps: { actionItemPort: ActionItemPort }, params: CreateActionItemParams): Promise<ActionItemDTO> {
    const content = params.content.trim();
    if (!content) {
        throw new AppError('invalid_request', 'content is required', 400);
    }
    return deps.actionItemPort.createActionItem({
        retrospectiveId: params.retrospectiveId,
        content,
        createdBy: params.createdBy,
        assignedTo: params.assignedTo ?? null,
        assignedToName: params.assignedToName ?? null,
        dueDate: params.dueDate ?? null,
    });
}

export interface EditActionItemParams {
    actionItemId: string;
    content?: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/** PATCH /api/action-items/:id — any participant (FR-015); NotFoundError is enforced
 * by the adapter for a nonexistent id. */
export async function editActionItem(deps: { actionItemPort: ActionItemPort }, params: EditActionItemParams): Promise<ActionItemDTO> {
    const content = params.content !== undefined ? params.content.trim() : undefined;
    if (content !== undefined && !content) {
        throw new AppError('invalid_request', 'content cannot be empty', 400);
    }
    const updates: EditActionItemInput = { content, assignedTo: params.assignedTo, assignedToName: params.assignedToName, dueDate: params.dueDate };
    return deps.actionItemPort.editActionItem(params.actionItemId, updates);
}

export interface DeleteActionItemParams {
    actionItemId: string;
}

/** DELETE /api/action-items/:id — any participant (FR-015). */
export async function deleteActionItem(deps: { actionItemPort: ActionItemPort }, params: DeleteActionItemParams): Promise<void> {
    await deps.actionItemPort.deleteActionItem(params.actionItemId);
}
