import type { FacilitatorNoteDTO, FacilitatorNotePort } from '../../ports/facilitatorNotes';
import { AppError } from '../../../domain/errors';

export interface FacilitatorNotesDeps {
    facilitatorNotePort: FacilitatorNotePort;
}

export interface CreateNoteParams {
    retrospectiveId: string;
    facilitatorId: string;
    content: string;
}

/** POST .../notes — any authenticated participant may keep private notes (FR-013);
 * only the author ever sees or edits them (enforced by the adapter). */
export async function createNote(deps: FacilitatorNotesDeps, params: CreateNoteParams): Promise<FacilitatorNoteDTO> {
    const content = params.content.trim();
    if (!content) {
        throw new AppError('invalid_request', 'content is required', 400);
    }
    return deps.facilitatorNotePort.createNote(params.retrospectiveId, params.facilitatorId, content);
}

export interface EditNoteParams {
    noteId: string;
    uid: string;
    content: string;
}

/** PATCH /api/notes/:id — author-only (FR-013). ForbiddenError is enforced by the adapter. */
export async function editNote(deps: FacilitatorNotesDeps, params: EditNoteParams): Promise<FacilitatorNoteDTO> {
    const content = params.content.trim();
    if (!content) {
        throw new AppError('invalid_request', 'content cannot be empty', 400);
    }
    return deps.facilitatorNotePort.editNote(params.noteId, params.uid, content);
}

export interface DeleteNoteParams {
    noteId: string;
    uid: string;
}

/** DELETE /api/notes/:id — author-only (FR-013). ForbiddenError is enforced by the adapter. */
export async function deleteNote(deps: FacilitatorNotesDeps, params: DeleteNoteParams): Promise<void> {
    await deps.facilitatorNotePort.deleteNote(params.noteId, params.uid);
}
