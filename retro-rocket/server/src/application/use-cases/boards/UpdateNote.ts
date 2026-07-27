import type { FacilitatorNote, FacilitatorNotesPort } from '../../ports/facilitator';
import { AppError, ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface UpdateNoteDeps {
    facilitatorNotesPort: FacilitatorNotesPort;
}

export interface UpdateNoteParams {
    boardId: string;
    noteId: string;
    requesterUid: string;
    content: string;
}

/** contracts/facilitator-tools-api.md `PATCH /api/boards/:id/notes/:noteId` — facilitator only, must own the note. */
export async function updateNote(deps: UpdateNoteDeps, params: UpdateNoteParams): Promise<FacilitatorNote> {
    if (params.content.trim() === '') {
        throw new AppError('invalid_request', 'content is required', 400);
    }
    const note = await deps.facilitatorNotesPort.getNote(params.noteId);
    if (!note || note.retrospectiveId !== params.boardId) throw new NotFoundError('Note not found');
    if (note.facilitatorId !== params.requesterUid) {
        throw new ForbiddenError('Only the note author may edit it');
    }
    return deps.facilitatorNotesPort.updateNote(params.noteId, params.content);
}
