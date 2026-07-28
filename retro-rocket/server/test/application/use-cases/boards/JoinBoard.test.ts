import { describe, it, expect } from 'vitest';
import { joinBoard } from '../../../../src/application/use-cases/boards/JoinBoard';
import { inMemoryBoardsPort, type FakeBoardRecord } from './boardsFakes';
import { NotFoundError } from '../../../../src/domain/errors';

function board(overrides: Partial<FakeBoardRecord>): FakeBoardRecord {
    return {
        id: 'b1',
        title: 'Board',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        createdBy: 'owner',
        ...overrides,
    };
}

describe('joinBoard', () => {
    it('adds a new participant and increments participantCount', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        const result = await joinBoard({ boardsPort }, { boardId: 'b1', uid: 'newUser', userName: 'New' });
        expect(result.participantCount).toBe(2);
        expect(result.isCreator).toBe(false);
    });

    it('is idempotent for an already-joined participant (no duplicate increment)', async () => {
        const boardsPort = inMemoryBoardsPort([board({})], [{ boardId: 'b1', uid: 'existing' }]);
        const result = await joinBoard({ boardsPort }, { boardId: 'b1', uid: 'existing', userName: 'Existing' });
        expect(result.participantCount).toBe(1);
    });

    it('is idempotent for the board owner (owner is never a duplicate participant)', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        const result = await joinBoard({ boardsPort }, { boardId: 'b1', uid: 'owner', userName: 'Owner' });
        expect(result.participantCount).toBe(1);
        expect(result.isCreator).toBe(true);
    });

    it('rejects joining a nonexistent board', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        await expect(joinBoard({ boardsPort }, { boardId: 'missing', uid: 'u1', userName: 'U' })).rejects.toThrow(NotFoundError);
    });

    it('rejects joining an inactive board', async () => {
        const boardsPort = inMemoryBoardsPort([board({ id: 'b2', isActive: false })]);
        await expect(joinBoard({ boardsPort }, { boardId: 'b2', uid: 'u1', userName: 'U' })).rejects.toThrow(NotFoundError);
    });
});
