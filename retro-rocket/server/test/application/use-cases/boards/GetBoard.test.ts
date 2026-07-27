import { describe, expect, it } from 'vitest';
import { getBoard } from '../../../../src/application/use-cases/boards/GetBoard';
import { NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore, inMemoryParticipantStore } from './fakes';
import type { BoardWithColumns, Participant } from '../../../../src/application/ports/boards';

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

const PARTICIPANT: Participant = {
    id: 'p1',
    retrospectiveId: 'b1',
    userId: 'participant-1',
    name: 'Bob',
    photoURL: null,
    isActive: false,
    joinedAt: new Date(),
    isFacilitator: false,
};

describe('getBoard', () => {
    it("returns the board for its creator", async () => {
        const deps = {
            boardReadPort: inMemoryBoardStore([BOARD]),
            participantPort: inMemoryParticipantStore([]),
        };

        const board = await getBoard(deps, { boardId: 'b1', requesterUid: 'facilitator-1' });
        expect(board.id).toBe('b1');
    });

    it('returns the board for a joined participant', async () => {
        const deps = {
            boardReadPort: inMemoryBoardStore([BOARD]),
            participantPort: inMemoryParticipantStore([PARTICIPANT]),
        };

        const board = await getBoard(deps, { boardId: 'b1', requesterUid: 'participant-1' });
        expect(board.id).toBe('b1');
    });

    it('rejects a uid that is neither creator nor participant with NotFoundError (existence never leaked)', async () => {
        const deps = {
            boardReadPort: inMemoryBoardStore([BOARD]),
            participantPort: inMemoryParticipantStore([PARTICIPANT]),
        };

        await expect(getBoard(deps, { boardId: 'b1', requesterUid: 'stranger' })).rejects.toThrow(NotFoundError);
    });

    it('throws the identical NotFoundError for a nonexistent board', async () => {
        const deps = {
            boardReadPort: inMemoryBoardStore([]),
            participantPort: inMemoryParticipantStore([]),
        };

        await expect(getBoard(deps, { boardId: 'missing', requesterUid: 'anyone' })).rejects.toThrow(NotFoundError);
    });
});
