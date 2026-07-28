import type { BoardsPort } from '../../ports/boards';
import { AppError } from '../../../domain/errors';

export interface RenameBoardParams {
    boardId: string;
    uid: string;
    title: string;
}

/**
 * PATCH /api/boards/:id (session-cookie-authenticated, owner-only). Ownership rejection
 * (ForbiddenError) and not-found rejection (NotFoundError) are enforced by the adapter.
 */
export async function renameBoard(deps: { boardsPort: BoardsPort }, params: RenameBoardParams): Promise<void> {
    const title = params.title.trim();
    if (!title) {
        throw new AppError('invalid_request', 'title is required', 400);
    }

    await deps.boardsPort.renameBoard(params.boardId, params.uid, title);
}
