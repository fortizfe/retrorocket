import type { ActionItemDTO, ActionItemPort } from '../../ports/actionItems';
import type { CardPort } from '../../ports/cards';
import type { RetrospectiveBoardPort } from '../../ports/retrospective';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface ConvertCardToActionItemDeps {
    cardPort: CardPort;
    actionItemPort: ActionItemPort;
    retrospectiveBoardPort: RetrospectiveBoardPort;
}

export interface ConvertCardToActionItemParams {
    cardId: string;
    uid: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/**
 * POST /api/cards/:id/convert-to-action-item — facilitator-only (FR-015). The action
 * item's content is sourced from the card itself (looked up server-side) rather than
 * trusted from the request body, unlike the retired client-side ActionItemsService,
 * which took the content as a caller-supplied string; the card is left untouched
 * (mirrors the old client behavior — converting doesn't delete the source card).
 */
export async function convertCardToActionItem(deps: ConvertCardToActionItemDeps, params: ConvertCardToActionItemParams): Promise<ActionItemDTO> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');

    const board = await deps.retrospectiveBoardPort.getRetrospective(card.retrospectiveId);
    if (!board) throw new NotFoundError('El tablero especificado no existe o no está disponible');
    if (board.createdBy !== params.uid) {
        throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
    }

    return deps.actionItemPort.createActionItem({
        retrospectiveId: card.retrospectiveId,
        content: card.content,
        createdBy: params.uid,
        assignedTo: params.assignedTo ?? null,
        assignedToName: params.assignedToName ?? null,
        dueDate: params.dueDate ?? null,
    });
}
