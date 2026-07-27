import { backendApiClient } from '@/lib/services/backendApiClient';
import { Retrospective } from '@/features/boards/types/retrospective';
import { TemplateId } from '@/features/create-board/boardTemplates';

interface RawBoard extends Omit<Retrospective, 'createdAt' | 'updatedAt'> {
    createdAt: string;
    updatedAt: string;
}

interface RawBoardSummary extends RawBoard {
    isCreator: boolean;
}

function parseBoard(raw: RawBoard): Retrospective {
    return { ...raw, createdAt: new Date(raw.createdAt), updatedAt: new Date(raw.updatedAt) };
}

export interface CreateBoardParams {
    templateId: TemplateId;
    title: string;
    description?: string;
    locale: 'es' | 'en';
}

/** Replaces createBoardFromTemplate.ts's direct Firestore access (feature 017 US4). */
export async function createBoard(params: CreateBoardParams): Promise<Retrospective> {
    const raw = await backendApiClient.post<RawBoard>('/api/boards', params);
    return parseBoard(raw);
}

/** One-time fetch — live updates come from the board's SSE channel (contracts/boards-api.md). */
export async function getBoard(boardId: string): Promise<Retrospective> {
    const raw = await backendApiClient.get<RawBoard>(`/api/boards/${boardId}`);
    return parseBoard(raw);
}

export interface BoardSummary extends Retrospective {
    isCreator: boolean;
}

/** Replaces userService.getUserBoards/retrospectiveService.ts/OptimizedRetrospectiveService.ts's listing paths. */
export async function listBoards(): Promise<BoardSummary[]> {
    const res = await backendApiClient.get<{ boards: RawBoardSummary[] }>('/api/boards');
    return res.boards.map((b) => ({ ...parseBoard(b), isCreator: b.isCreator }));
}

export async function renameBoard(boardId: string, updates: { title?: string; description?: string }): Promise<Retrospective> {
    const raw = await backendApiClient.patch<RawBoard>(`/api/boards/${boardId}`, updates);
    return parseBoard(raw);
}

/** Full cascade delete — replaces OptimizedRetrospectiveService.deleteRetrospectiveCompletely. */
export async function deleteBoard(boardId: string): Promise<void> {
    await backendApiClient.delete(`/api/boards/${boardId}`);
}
