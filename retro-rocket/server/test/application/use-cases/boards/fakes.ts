import type {
    BoardReadPort,
    BoardWithColumns,
    BoardWritePort,
    CreateBoardInput,
    CreateParticipantInput,
    Participant,
    ParticipantPort,
} from '../../../../src/application/ports/boards';

/** In-memory fake for BoardReadPort/BoardWritePort, following mcp/mcpFakes.ts's convention. */
export function inMemoryBoardStore(initial: BoardWithColumns[] = []): BoardReadPort & BoardWritePort {
    // Shallow-clone each seeded fixture so mutations (incrementParticipantCount) never leak
    // back into a caller's shared `const` fixture object across test cases.
    const boards = new Map(initial.map((b) => [b.id, { ...b }]));
    let counter = 0;

    return {
        async getBoard(boardId) {
            return boards.get(boardId) ?? null;
        },
        async createBoard(input: CreateBoardInput) {
            const id = `board-${++counter}`;
            const now = new Date();
            const board: BoardWithColumns = {
                id,
                title: input.title,
                description: input.description,
                templateId: input.templateId,
                createdBy: input.createdBy,
                createdByName: input.createdByName,
                locale: input.locale,
                createdAt: now,
                updatedAt: now,
                participantCount: 0,
                isActive: true,
                columns: input.columns.map((c) => ({ ...c })),
            };
            boards.set(id, board);
            return board;
        },
        async incrementParticipantCount(boardId) {
            const board = boards.get(boardId);
            if (board) board.participantCount += 1;
        },
        async listBoardsCreatedBy(userId) {
            return [...boards.values()].filter((b) => b.createdBy === userId);
        },
        async renameBoard(boardId, updates) {
            const board = boards.get(boardId);
            if (!board) throw new Error('not found');
            if (updates.title !== undefined) board.title = updates.title;
            if (updates.description !== undefined) board.description = updates.description;
            board.updatedAt = new Date();
            return board;
        },
        async deleteBoardCascade(boardId) {
            boards.delete(boardId);
        },
    };
}

/** In-memory fake for ParticipantPort. `isFacilitator` on seeded fixtures is caller-supplied. */
export function inMemoryParticipantStore(initial: Participant[] = []): ParticipantPort {
    const participants = [...initial];
    let counter = 0;

    return {
        async listParticipants(retrospectiveId) {
            return participants.filter((p) => p.retrospectiveId === retrospectiveId);
        },
        async getParticipantByUser(retrospectiveId, userId) {
            return participants.find((p) => p.retrospectiveId === retrospectiveId && p.userId === userId) ?? null;
        },
        async addParticipant(input: CreateParticipantInput) {
            const existing = participants.find(
                (p) => p.retrospectiveId === input.retrospectiveId && p.userId === input.userId,
            );
            if (existing) return { participant: existing, isNew: false };

            const participant: Participant = {
                id: `participant-${++counter}`,
                retrospectiveId: input.retrospectiveId,
                userId: input.userId,
                name: input.name,
                photoURL: input.photoURL,
                joinedAt: new Date(),
                isFacilitator: false,
                isActive: false,
            };
            participants.push(participant);
            return { participant, isNew: true };
        },
        async setActive(participantId, isActive) {
            const participant = participants.find((p) => p.id === participantId);
            if (participant) participant.isActive = isActive;
        },
        async listParticipantRecordsForUser(userId) {
            return participants.filter((p) => p.userId === userId);
        },
    };
}
