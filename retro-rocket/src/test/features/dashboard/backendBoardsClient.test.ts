import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listBoards, createBoard, joinBoard, renameBoard, deleteBoard } from '@/features/dashboard/services/backendBoardsClient';

function jsonResponse(ok: boolean, status: number, body: unknown): Response {
    return { ok, status, json: async () => body } as unknown as Response;
}

const dto = {
    id: 'b1',
    title: 'Board',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    participantCount: 1,
    isActive: true,
    createdBy: 'u1',
    isCreator: true,
};

describe('backendBoardsClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('listBoards', () => {
        it('fetches GET /api/boards and parses timestamps into Dates', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { boards: [dto] }));
            vi.stubGlobal('fetch', fetchMock);

            const boards = await listBoards();

            expect(fetchMock).toHaveBeenCalledWith('/api/boards', { credentials: 'include' });
            expect(boards).toHaveLength(1);
            expect(boards[0].createdAt).toEqual(new Date(dto.createdAt));
            expect(boards[0].updatedAt).toEqual(new Date(dto.updatedAt));
        });

        it('throws the backend error message on a non-OK response', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 401, { error: { message: 'Sign-in required' } })));
            await expect(listBoards()).rejects.toThrow('Sign-in required');
        });
    });

    describe('createBoard', () => {
        it('POSTs to /api/boards with the given params', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, { boardId: 'b1' }));
            vi.stubGlobal('fetch', fetchMock);

            const result = await createBoard({ templateId: 'default', title: 'New', locale: 'en' });

            expect(fetchMock).toHaveBeenCalledWith('/api/boards', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId: 'default', title: 'New', locale: 'en' }),
            });
            expect(result).toEqual({ boardId: 'b1' });
        });

        it('throws on a non-OK response', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 400, { error: { message: 'Invalid template ID: nope' } })));
            await expect(createBoard({ templateId: 'default', title: 'X', locale: 'en' })).rejects.toThrow('Invalid template ID: nope');
        });

        // 051-anonymous-board-mode, T019 (contracts/anonymity-api-contract.md "Extended
        // endpoint: POST /api/boards"): isAnonymous must be included in the POST body
        // when the caller provides it.
        it('includes isAnonymous: true in the request body when provided', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, { boardId: 'b1' }));
            vi.stubGlobal('fetch', fetchMock);

            await createBoard({ templateId: 'default', title: 'New', locale: 'en', isAnonymous: true });

            const [, requestInit] = fetchMock.mock.calls[0];
            expect(JSON.parse((requestInit as RequestInit).body as string)).toMatchObject({ isAnonymous: true });
        });
    });

    describe('joinBoard', () => {
        it('POSTs to /api/boards/:id/join and returns the board', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, dto));
            vi.stubGlobal('fetch', fetchMock);

            const board = await joinBoard('b1');

            expect(fetchMock).toHaveBeenCalledWith('/api/boards/b1/join', { method: 'POST', credentials: 'include' });
            expect(board.id).toBe('b1');
        });

        it('throws the backend message for a not-found board', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 404, { error: { message: 'El tablero especificado no existe o no está disponible' } })));
            await expect(joinBoard('missing')).rejects.toThrow('no existe');
        });
    });

    describe('renameBoard', () => {
        it('PATCHes /api/boards/:id with the new title', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await renameBoard('b1', 'Renamed');

            expect(fetchMock).toHaveBeenCalledWith('/api/boards/b1', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Renamed' }),
            });
        });

        it('throws on a 403 (non-owner)', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 403, { error: { message: "Not this board's owner" } })));
            await expect(renameBoard('b1', 'X')).rejects.toThrow("Not this board's owner");
        });
    });

    describe('deleteBoard', () => {
        it('DELETEs /api/boards/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await deleteBoard('b1');

            expect(fetchMock).toHaveBeenCalledWith('/api/boards/b1', { method: 'DELETE', credentials: 'include' });
        });

        it('throws on a 403 (non-owner)', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 403, { error: { message: "Not this board's owner" } })));
            await expect(deleteBoard('b1')).rejects.toThrow("Not this board's owner");
        });
    });
});
