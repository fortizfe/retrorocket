import type { BoardsPort } from '../../ports/boards';

export interface DeleteBoardParams {
    boardId: string;
    uid: string;
}

/**
 * DELETE /api/boards/:id (session-cookie-authenticated, owner-only). Ownership rejection
 * (ForbiddenError) and not-found rejection (NotFoundError) are enforced by the adapter.
 * Deletes only the top-level board doc — no cascade (research.md §6).
 */
export async function deleteBoard(deps: { boardsPort: BoardsPort }, params: DeleteBoardParams): Promise<void> {
    await deps.boardsPort.deleteBoard(params.boardId, params.uid);
}
