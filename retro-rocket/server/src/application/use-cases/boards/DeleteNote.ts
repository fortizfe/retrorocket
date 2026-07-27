import type { FacilitatorNotesPort } from '../../ports/facilitator';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';

export interface DeleteNoteDeps {
    facilitatorNotesPort: FacilitatorNotesPort;
}

export interface DeleteNoteParams {
    boardId: string;
    noteId: string;
    requesterUid: string;
}

/** contracts/facilitator-tools-api.md `DELETE /api/boards/:id/notes/:noteId` — facilitator only, must own the note. */
export async function deleteNote(deps: DeleteNoteDeps, params: DeleteNoteParams): Promise<void> {
    const note = await deps.facilitatorNotesPort.getNote(params.noteId);
    if (!note || note.retrospectiveId !== params.boardId) throw new NotFoundError('Note not found');
    if (note.facilitatorId !== params.requesterUid) {
        throw new ForbiddenError('Only the note author may delete it');
    }
    await deps.facilitatorNotesPort.deleteNote(params.noteId);
}
