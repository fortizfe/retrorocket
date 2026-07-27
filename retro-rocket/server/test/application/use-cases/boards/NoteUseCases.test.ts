import { describe, expect, it } from 'vitest';
import { createNote } from '../../../../src/application/use-cases/boards/CreateNote';
import { updateNote } from '../../../../src/application/use-cases/boards/UpdateNote';
import { deleteNote } from '../../../../src/application/use-cases/boards/DeleteNote';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore } from './fakes';
import { inMemoryFacilitatorNotesStore } from './facilitatorFakes';
import type { BoardWithColumns } from '../../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1',
    title: 'Sprint 42 Retro',
    templateId: 'default',
    createdBy: 'facilitator-1',
    createdByName: 'Ana',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 1,
    isActive: true,
    columns: [],
};

describe('createNote', () => {
    it('creates a note for the facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const notesPort = inMemoryFacilitatorNotesStore();

        const note = await createNote({ boardReadPort: boardStore, facilitatorNotesPort: notesPort }, { boardId: 'b1', requesterUid: 'facilitator-1', content: 'Watch the timebox' });

        expect(note.content).toBe('Watch the timebox');
        expect(note.facilitatorId).toBe('facilitator-1');
    });

    it(
        'rejects a non-facilitator creating a note (proves research.md §2\'s dead-rule finding is closed)',
        async () => {
            const boardStore = inMemoryBoardStore([BOARD]);
            const notesPort = inMemoryFacilitatorNotesStore();

            await expect(
                createNote({ boardReadPort: boardStore, facilitatorNotesPort: notesPort }, { boardId: 'b1', requesterUid: 'u2', content: 'Sneaky note' }),
            ).rejects.toThrow(ForbiddenError);
        },
    );

    it('rejects empty content', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const notesPort = inMemoryFacilitatorNotesStore();

        await expect(
            createNote({ boardReadPort: boardStore, facilitatorNotesPort: notesPort }, { boardId: 'b1', requesterUid: 'facilitator-1', content: '   ' }),
        ).rejects.toThrow('content is required');
    });
});

describe('updateNote / deleteNote', () => {
    it('updates a note the facilitator owns', async () => {
        const notesPort = inMemoryFacilitatorNotesStore([
            { id: 'n1', retrospectiveId: 'b1', facilitatorId: 'facilitator-1', content: 'old', createdAt: new Date(), updatedAt: new Date() },
        ]);

        const updated = await updateNote({ facilitatorNotesPort: notesPort }, { boardId: 'b1', noteId: 'n1', requesterUid: 'facilitator-1', content: 'new' });

        expect(updated.content).toBe('new');
    });

    it('rejects updating another facilitator\'s note (concurrent-edit last-write-wins case, FR-014, is moot once ownership is enforced)', async () => {
        const notesPort = inMemoryFacilitatorNotesStore([
            { id: 'n1', retrospectiveId: 'b1', facilitatorId: 'facilitator-1', content: 'old', createdAt: new Date(), updatedAt: new Date() },
        ]);

        await expect(
            updateNote({ facilitatorNotesPort: notesPort }, { boardId: 'b1', noteId: 'n1', requesterUid: 'u2', content: 'hijacked' }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('rejects updating a note from the wrong board', async () => {
        const notesPort = inMemoryFacilitatorNotesStore([
            { id: 'n1', retrospectiveId: 'other-board', facilitatorId: 'facilitator-1', content: 'old', createdAt: new Date(), updatedAt: new Date() },
        ]);

        await expect(
            updateNote({ facilitatorNotesPort: notesPort }, { boardId: 'b1', noteId: 'n1', requesterUid: 'facilitator-1', content: 'new' }),
        ).rejects.toThrow(NotFoundError);
    });

    it('deletes a note the facilitator owns', async () => {
        const notesPort = inMemoryFacilitatorNotesStore([
            { id: 'n1', retrospectiveId: 'b1', facilitatorId: 'facilitator-1', content: 'old', createdAt: new Date(), updatedAt: new Date() },
        ]);

        await deleteNote({ facilitatorNotesPort: notesPort }, { boardId: 'b1', noteId: 'n1', requesterUid: 'facilitator-1' });

        expect(await notesPort.getNote('n1')).toBeNull();
    });

    it('rejects deleting another facilitator\'s note', async () => {
        const notesPort = inMemoryFacilitatorNotesStore([
            { id: 'n1', retrospectiveId: 'b1', facilitatorId: 'facilitator-1', content: 'old', createdAt: new Date(), updatedAt: new Date() },
        ]);

        await expect(
            deleteNote({ facilitatorNotesPort: notesPort }, { boardId: 'b1', noteId: 'n1', requesterUid: 'u2' }),
        ).rejects.toThrow(ForbiddenError);
    });
});
