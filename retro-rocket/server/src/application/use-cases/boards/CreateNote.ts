import type { BoardReadPort } from '../../ports/boards';
import type { FacilitatorNote, FacilitatorNotesPort } from '../../ports/facilitator';
import { AppError, ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isFacilitator } from '../../../domain/boards/FacilitatorAccess';

export interface CreateNoteDeps {
    boardReadPort: BoardReadPort;
    facilitatorNotesPort: FacilitatorNotesPort;
}

export interface CreateNoteParams {
    boardId: string;
    requesterUid: string;
    content: string;
}

/**
 * contracts/facilitator-tools-api.md `POST /api/boards/:id/notes` — read AND write
 * restricted to the board's own facilitator (research.md §2: this is where that
 * restriction becomes real, closing the previously-dead Firestore rule).
 */
export async function createNote(deps: CreateNoteDeps, params: CreateNoteParams): Promise<FacilitatorNote> {
    if (params.content.trim() === '') {
        throw new AppError('invalid_request', 'content is required', 400);
    }
    const board = await deps.boardReadPort.getBoard(params.boardId);
    if (!board) throw new NotFoundError('Board not found');
    if (!isFacilitator(board, params.requesterUid)) {
        throw new ForbiddenError('Only the board facilitator may create notes');
    }
    return deps.facilitatorNotesPort.createNote(params.boardId, params.requesterUid, params.content);
}
