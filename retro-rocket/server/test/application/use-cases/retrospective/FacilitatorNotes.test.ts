import { describe, it, expect } from 'vitest';
import { createNote, editNote, deleteNote } from '../../../../src/application/use-cases/retrospective/FacilitatorNotes';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { AppError, ForbiddenError } from '../../../../src/domain/errors';

describe('createNote', () => {
    it('creates a note authored by the caller', async () => {
        const { facilitatorNotePort } = createRetrospectiveFakeStore();
        const note = await createNote({ facilitatorNotePort }, { retrospectiveId: 'r1', facilitatorId: 'u1', content: 'Remember to follow up' });
        expect(note).toMatchObject({ retrospectiveId: 'r1', facilitatorId: 'u1', content: 'Remember to follow up' });
    });

    it('rejects empty content', async () => {
        const { facilitatorNotePort } = createRetrospectiveFakeStore();
        await expect(createNote({ facilitatorNotePort }, { retrospectiveId: 'r1', facilitatorId: 'u1', content: '   ' })).rejects.toThrow(AppError);
    });
});

describe('editNote/deleteNote', () => {
    it("lets the author edit and delete their own note", async () => {
        const { facilitatorNotePort } = createRetrospectiveFakeStore();
        const note = await createNote({ facilitatorNotePort }, { retrospectiveId: 'r1', facilitatorId: 'u1', content: 'Original' });

        const edited = await editNote({ facilitatorNotePort }, { noteId: note.id, uid: 'u1', content: 'Updated' });
        expect(edited.content).toBe('Updated');

        await deleteNote({ facilitatorNotePort }, { noteId: note.id, uid: 'u1' });
        expect(await facilitatorNotePort.getNote(note.id)).toBeNull();
    });

    it('rejects a non-author edit/delete with ForbiddenError', async () => {
        const { facilitatorNotePort } = createRetrospectiveFakeStore();
        const note = await createNote({ facilitatorNotePort }, { retrospectiveId: 'r1', facilitatorId: 'u1', content: 'Private' });

        await expect(editNote({ facilitatorNotePort }, { noteId: note.id, uid: 'intruder', content: 'Hijacked' })).rejects.toThrow(ForbiddenError);
        await expect(deleteNote({ facilitatorNotePort }, { noteId: note.id, uid: 'intruder' })).rejects.toThrow(ForbiddenError);
    });
});
