import type { BoardReadPort, BoardWithColumns, ParticipantPort } from '../../ports/boards';
import { NotFoundError } from '../../../domain/errors';
import { isParticipantOrCreator } from '../../../domain/boards/BoardAccess';

export interface GetBoardDeps {
    boardReadPort: BoardReadPort;
    participantPort: ParticipantPort;
}

export interface GetBoardParams {
    boardId: string;
    requesterUid: string;
}

/**
 * contracts/boards-api.md `GET /api/boards/:id`. Returns the identical NotFoundError for a
 * missing board and one the requester cannot access (FR-004) — existence is never leaked.
 */
export async function getBoard(deps: GetBoardDeps, params: GetBoardParams): Promise<BoardWithColumns> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    const participants = board ? await deps.participantPort.listParticipants(params.boardId) : [];

    if (!board || !isParticipantOrCreator(board, participants, params.requesterUid)) {
        throw new NotFoundError('Board not found');
    }

    return board;
}
