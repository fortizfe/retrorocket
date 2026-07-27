import type { BoardReadPort, BoardWithColumns, BoardWritePort, Participant, ParticipantPort } from '../../ports/boards';
import { NotFoundError } from '../../../domain/errors';

export interface JoinBoardDeps {
    boardReadPort: BoardReadPort;
    boardWritePort: BoardWritePort;
    participantPort: ParticipantPort;
}

export interface JoinBoardParams {
    boardId: string;
    userId: string;
    userName: string;
    userPhotoURL: string | null;
}

export interface JoinBoardResult {
    board: BoardWithColumns;
    participant: Participant;
    isNew: boolean;
}

/**
 * contracts/boards-api.md `POST /api/boards/:id/join` — Foundational minimal version
 * (idempotent participant creation + count bookkeeping only). User Story 4 (T097) extends
 * this with `userBoardHistory`/`joinedBoards` bookkeeping, consolidating the current
 * 4-round-trip client flow (`useJoinRetrospective.ts`) into this one use-case.
 */
export async function joinBoard(deps: JoinBoardDeps, params: JoinBoardParams): Promise<JoinBoardResult> {
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board || !board.isActive) {
        throw new NotFoundError('Board not found');
    }

    const { participant, isNew } = await deps.participantPort.addParticipant({
        retrospectiveId: params.boardId,
        userId: params.userId,
        name: params.userName,
        photoURL: params.userPhotoURL,
    });

    if (isNew) {
        await deps.boardWritePort.incrementParticipantCount(params.boardId);
    }

    const refreshedBoard = isNew ? await deps.boardReadPort.getBoard(params.boardId) : board;
    return { board: refreshedBoard!, participant, isNew };
}
