import type { CardDTO, CardPort } from '../../ports/cards';
import { AppError } from '../../../domain/errors';

export interface CreateCardParams {
    retrospectiveId: string;
    content: string;
    column: string;
    createdBy: string;
    createdByName: string;
    color?: string;
}

/** POST /api/retrospectives/:id/cards (session-cookie-authenticated) — FR-007. */
export async function createCard(deps: { cardPort: CardPort }, params: CreateCardParams): Promise<CardDTO> {
    const content = params.content.trim();
    if (!content) {
        throw new AppError('invalid_request', 'content is required', 400);
    }

    return deps.cardPort.createCard({
        retrospectiveId: params.retrospectiveId,
        content,
        column: params.column,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        color: params.color,
    });
}

export interface EditCardParams {
    cardId: string;
    uid: string;
    content?: string;
    color?: string;
}

/** PATCH /api/cards/:id (owner-only) — FR-007, FR-020. Ownership rejection
 * (ForbiddenError) is enforced by the adapter. */
export async function editCard(deps: { cardPort: CardPort }, params: EditCardParams): Promise<CardDTO> {
    const content = params.content !== undefined ? params.content.trim() : undefined;
    if (content !== undefined && !content) {
        throw new AppError('invalid_request', 'content cannot be empty', 400);
    }

    return deps.cardPort.editCard(params.cardId, params.uid, { content, color: params.color });
}

export interface DeleteCardParams {
    cardId: string;
    uid: string;
}

/** DELETE /api/cards/:id (owner-only) — FR-007, FR-020. */
export async function deleteCard(deps: { cardPort: CardPort }, params: DeleteCardParams): Promise<void> {
    await deps.cardPort.deleteCard(params.cardId, params.uid);
}
