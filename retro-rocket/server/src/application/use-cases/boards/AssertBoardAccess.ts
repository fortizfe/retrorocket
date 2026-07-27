import type { BoardReadPort, ParticipantPort } from '../../ports/boards';
import { NotFoundError } from '../../../domain/errors';
import { isParticipantOrCreator } from '../../../domain/boards/BoardAccess';

export interface AssertBoardAccessDeps {
    boardReadPort: BoardReadPort;
    participantPort: ParticipantPort;
}

/**
 * Shared FR-004 gate reused by every card/group/typing/countdown/note/action-item/sentiment
 * route: the requester must be the board's creator or a participant. Throws the same
 * NotFoundError for "board missing" and "board exists but not accessible" (existence is
 * never leaked, matching the MCP precedent and GetBoard.ts).
 */
export async function assertBoardAccess(deps: AssertBoardAccessDeps, boardId: string, requesterUid: string): Promise<void> {
    const board = await deps.boardReadPort.getBoard(boardId);
    const participants = board ? await deps.participantPort.listParticipants(boardId) : [];

    if (!board || !isParticipantOrCreator(board, participants, requesterUid)) {
        throw new NotFoundError('Board not found');
    }
}
