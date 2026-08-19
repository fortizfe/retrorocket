import type { BoardsPort, BoardSummary, CreateBoardInput } from '../../../../src/application/ports/boards';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/errors';

export interface FakeBoardRecord {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
    createdBy: string;
    /** 055-retro-team-association: mirrors the real BoardSummary's teamId/teamName fields. */
    teamId?: string | null;
    teamName?: string | null;
}

export interface FakeMembership {
    boardId: string;
    uid: string;
}

/**
 * In-memory BoardsPort replicating FirestoreBoardsAdapter's observable behavior
 * (owned+joined merge, idempotent join, ownership checks) — mirrors mcpFakes.ts's
 * inMemoryConnectionStore, shared by use-case tests and boardsTestApp.ts.
 */
export function inMemoryBoardsPort(seed: FakeBoardRecord[] = [], participants: FakeMembership[] = []): BoardsPort {
    const boards = new Map<string, FakeBoardRecord>(seed.map((b) => [b.id, { ...b }]));
    const memberships = new Set(participants.map((p) => `${p.boardId}:${p.uid}`));
    let nextId = 1;

    function toSummary(b: FakeBoardRecord, uid: string): BoardSummary {
        return { ...b, isCreator: b.createdBy === uid, teamId: b.teamId ?? null, teamName: b.teamName ?? null };
    }

    return {
        async listBoardsForUser(uid: string) {
            const result: BoardSummary[] = [];
            for (const b of boards.values()) {
                if (b.createdBy === uid || memberships.has(`${b.id}:${uid}`)) {
                    result.push(toSummary(b, uid));
                }
            }
            return result;
        },

        async createBoard(input: CreateBoardInput) {
            const id = `board-${nextId++}`;
            boards.set(id, {
                id,
                title: input.title,
                description: '',
                createdAt: new Date(),
                updatedAt: new Date(),
                // Creator counts as the first participant — mirrors FirestoreBoardsAdapter.
                participantCount: 1,
                isActive: true,
                createdBy: input.createdBy,
                teamId: input.teamId ?? null,
            });
            return { boardId: id };
        },

        async getBoard(id: string) {
            const b = boards.get(id);
            return b ? toSummary(b, '') : null;
        },

        async joinBoard(id: string, uid: string) {
            const b = boards.get(id);
            if (!b || !b.isActive) throw new NotFoundError('El tablero especificado no existe o no está disponible');

            if (b.createdBy !== uid && !memberships.has(`${id}:${uid}`)) {
                memberships.add(`${id}:${uid}`);
                b.participantCount += 1;
                b.updatedAt = new Date();
            }
            return toSummary(b, uid);
        },

        async renameBoard(id: string, uid: string, title: string) {
            const b = boards.get(id);
            if (!b) throw new NotFoundError('Board not found');
            if (b.createdBy !== uid) throw new ForbiddenError();
            b.title = title;
            b.updatedAt = new Date();
        },

        async deleteBoard(id: string, uid: string) {
            const b = boards.get(id);
            if (!b) throw new NotFoundError('Board not found');
            if (b.createdBy !== uid) throw new ForbiddenError();
            boards.delete(id);
        },
    };
}
