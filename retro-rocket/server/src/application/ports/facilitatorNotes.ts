// ---------------------------------------------------------------------------
// FacilitatorNotePort — read/write Firestore access for private facilitator
// notes (feature 019). Every read/write MUST be scoped by facilitatorId ===
// caller uid (FR-013) — enforced by the adapter, never trusting a caller-
// supplied facilitatorId.
// ---------------------------------------------------------------------------

export interface FacilitatorNoteDTO {
    id: string;
    content: string;
    timestamp: Date;
    retrospectiveId: string;
    facilitatorId: string;
}

export interface FacilitatorNotePort {
    /** Only ever returns notes authored by facilitatorId — never another facilitator's. */
    listNotesForFacilitator(retrospectiveId: string, facilitatorId: string): Promise<FacilitatorNoteDTO[]>;
    createNote(retrospectiveId: string, facilitatorId: string, content: string): Promise<FacilitatorNoteDTO>;
    /** Throws ForbiddenError if uid !== the note's facilitatorId. */
    editNote(noteId: string, uid: string, content: string): Promise<FacilitatorNoteDTO>;
    /** Throws ForbiddenError if uid !== the note's facilitatorId. */
    deleteNote(noteId: string, uid: string): Promise<void>;
    getNote(noteId: string): Promise<FacilitatorNoteDTO | null>;
}
