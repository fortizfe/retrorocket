import { describe, expect, it } from 'vitest';
import { joinBoard } from '../../../../src/application/use-cases/boards/JoinBoard';
import { NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore, inMemoryParticipantStore } from './fakes';
import type { BoardWithColumns } from '../../../../src/application/ports/boards';

const ACTIVE_BOARD: BoardWithColumns = {
    id: 'b1',
    title: 'Sprint 42 Retro',
    templateId: 'default',
    createdBy: 'facilitator-1',
    createdByName: 'Ana',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 0,
    isActive: true,
    columns: [],
};

describe('joinBoard', () => {
    it('creates a new participant and increments the participant count', async () => {
        const boardStore = inMemoryBoardStore([ACTIVE_BOARD]);
        const participantStore = inMemoryParticipantStore([]);

        const result = await joinBoard(
            { boardReadPort: boardStore, boardWritePort: boardStore, participantPort: participantStore },
            { boardId: 'b1', userId: 'u2', userName: 'Bob', userPhotoURL: null },
        );

        expect(result.isNew).toBe(true);
        expect(result.board.participantCount).toBe(1);
        expect(result.participant.userId).toBe('u2');
        const participants = await participantStore.listParticipants('b1');
        expect(participants).toHaveLength(1);
        expect(participants[0].userId).toBe('u2');
    });

    it('is idempotent for a user who already joined (no duplicate participant, no double increment)', async () => {
        const boardStore = inMemoryBoardStore([ACTIVE_BOARD]);
        const participantStore = inMemoryParticipantStore([]);
        const deps = { boardReadPort: boardStore, boardWritePort: boardStore, participantPort: participantStore };

        await joinBoard(deps, { boardId: 'b1', userId: 'u2', userName: 'Bob', userPhotoURL: null });
        const second = await joinBoard(deps, { boardId: 'b1', userId: 'u2', userName: 'Bob', userPhotoURL: null });

        expect(second.isNew).toBe(false);
        expect(second.board.participantCount).toBe(1);
        expect(second.participant.userId).toBe('u2');
        expect(await participantStore.listParticipants('b1')).toHaveLength(1);
    });

    it('rejects joining a nonexistent board', async () => {
        const boardStore = inMemoryBoardStore([]);
        const participantStore = inMemoryParticipantStore([]);

        await expect(
            joinBoard(
                { boardReadPort: boardStore, boardWritePort: boardStore, participantPort: participantStore },
                { boardId: 'missing', userId: 'u2', userName: 'Bob', userPhotoURL: null },
            ),
        ).rejects.toThrow(NotFoundError);
    });

    it('rejects joining an inactive board', async () => {
        const boardStore = inMemoryBoardStore([{ ...ACTIVE_BOARD, isActive: false }]);
        const participantStore = inMemoryParticipantStore([]);

        await expect(
            joinBoard(
                { boardReadPort: boardStore, boardWritePort: boardStore, participantPort: participantStore },
                { boardId: 'b1', userId: 'u2', userName: 'Bob', userPhotoURL: null },
            ),
        ).rejects.toThrow(NotFoundError);
    });
});
