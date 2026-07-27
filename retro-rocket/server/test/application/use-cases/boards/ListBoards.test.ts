import { describe, expect, it } from 'vitest';
import { listBoards } from '../../../../src/application/use-cases/boards/ListBoards';
import { inMemoryBoardStore, inMemoryParticipantStore } from './fakes';
import type { BoardWithColumns, Participant } from '../../../../src/application/ports/boards';

function board(overrides: Partial<BoardWithColumns>): BoardWithColumns {
    return {
        id: 'b1', title: 'X', templateId: 'default', createdBy: 'u1', createdByName: 'Ana', locale: 'en',
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), participantCount: 0, isActive: true, columns: [],
        ...overrides,
    };
}

function participant(overrides: Partial<Participant>): Participant {
    return {
        id: 'p1', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null,
        joinedAt: new Date(), isFacilitator: false, isActive: true,
        ...overrides,
    };
}

describe('listBoards', () => {
    it('returns owned boards marked isCreator: true', async () => {
        const boardStore = inMemoryBoardStore([board({ id: 'b1', createdBy: 'u1' })]);
        const participantStore = inMemoryParticipantStore([]);

        const result = await listBoards({ boardReadPort: boardStore, participantPort: participantStore }, { userId: 'u1' });

        expect(result).toHaveLength(1);
        expect(result[0].isCreator).toBe(true);
    });

    it('returns joined (non-owned) boards marked isCreator: false, derived from participant records', async () => {
        const boardStore = inMemoryBoardStore([
            board({ id: 'b1', createdBy: 'facilitator-1' }),
        ]);
        const participantStore = inMemoryParticipantStore([participant({ retrospectiveId: 'b1', userId: 'u2' })]);

        const result = await listBoards({ boardReadPort: boardStore, participantPort: participantStore }, { userId: 'u2' });

        expect(result).toHaveLength(1);
        expect(result[0].isCreator).toBe(false);
        expect(result[0].id).toBe('b1');
    });

    it('does not duplicate a board the user both created and has a participant record for', async () => {
        const boardStore = inMemoryBoardStore([board({ id: 'b1', createdBy: 'u1' })]);
        const participantStore = inMemoryParticipantStore([participant({ retrospectiveId: 'b1', userId: 'u1' })]);

        const result = await listBoards({ boardReadPort: boardStore, participantPort: participantStore }, { userId: 'u1' });

        expect(result).toHaveLength(1);
        expect(result[0].isCreator).toBe(true);
    });

    it('returns an empty list for a new user — never an error', async () => {
        const boardStore = inMemoryBoardStore([]);
        const participantStore = inMemoryParticipantStore([]);

        const result = await listBoards({ boardReadPort: boardStore, participantPort: participantStore }, { userId: 'new-user' });

        expect(result).toEqual([]);
    });

    it('sorts owned+joined boards together by updatedAt descending', async () => {
        const boardStore = inMemoryBoardStore([
            board({ id: 'older', createdBy: 'u1', updatedAt: new Date('2026-01-01') }),
            board({ id: 'newer', createdBy: 'facilitator-1', updatedAt: new Date('2026-02-01') }),
        ]);
        const participantStore = inMemoryParticipantStore([participant({ retrospectiveId: 'newer', userId: 'u1' })]);

        const result = await listBoards({ boardReadPort: boardStore, participantPort: participantStore }, { userId: 'u1' });

        expect(result.map((b) => b.id)).toEqual(['newer', 'older']);
    });
});
