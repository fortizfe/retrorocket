/**
 * Client for the Dashboard ("My Boards") boards API (feature 017). The browser no longer
 * talks to Firestore for listing, creating, joining, renaming, or deleting boards (FR-001):
 * every operation goes through the backend's session-cookie-authenticated /api/boards/*
 * endpoints instead. Mirrors the fetch conventions of backendAuthClient.ts / connectedAppsService.ts.
 */

export interface BoardSummary {
    id: string;
    title: string;
    description: string;
    templateId?: string;
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
    createdBy: string;
    isCreator: boolean;
    // 055-retro-team-association: the team this board is associated with, if any.
    // `null` (never omitted) so callers can distinguish "no team" from "not loaded yet".
    teamId: string | null;
    // 055-retro-team-association: the associated team's display name, resolved
    // server-side (serializeBoard()). `null` whenever teamId is `null`, and also
    // `null` outside the dashboard list endpoint (listBoardsForUser) by design —
    // the team indicator is dashboard-only, never shown inside an open session.
    teamName: string | null;
}

export interface CreateBoardParams {
    templateId: 'default' | 'madSadGlad' | 'startStopContinue';
    title: string;
    locale: 'es' | 'en';
    isAnonymous?: boolean;
    // 055-retro-team-association: optionally associate the new board with one of the
    // creator's teams (spec.md FR-001). `null`/omitted means no team association.
    teamId?: string | null;
}

interface BoardSummaryDTO {
    id: string;
    title: string;
    description: string;
    templateId?: string;
    createdAt: string;
    updatedAt: string;
    participantCount: number;
    isActive: boolean;
    createdBy: string;
    isCreator: boolean;
    teamId: string | null;
    teamName: string | null;
}

const API = '/api/boards';

function fromDTO(dto: BoardSummaryDTO): BoardSummary {
    return {
        ...dto,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    };
}

/**
 * Extracts the backend's error message from the { error: { code, message } } envelope
 * (errorHandler.ts) when present, so callers keep seeing the same specific messages
 * ("board not found", etc.) the previous direct-Firestore code surfaced — a generic
 * "request failed" would be a UX regression from today's behavior.
 */
async function errorMessageOf(res: Response, fallback: string): Promise<string> {
    try {
        const body = (await res.json()) as { error?: { message?: string } };
        return body.error?.message ?? fallback;
    } catch {
        return fallback;
    }
}

/** GET /api/boards — the requesting user's created + joined boards. */
export async function listBoards(): Promise<BoardSummary[]> {
    const res = await fetch(API, { credentials: 'include' });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to load boards: ${res.status}`));
    const body = (await res.json()) as { boards: BoardSummaryDTO[] };
    return body.boards.map(fromDTO);
}

/** POST /api/boards — create a board from a template. */
export async function createBoard(params: CreateBoardParams): Promise<{ boardId: string }> {
    const res = await fetch(API, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to create board: ${res.status}`));
    return (await res.json()) as { boardId: string };
}

/** POST /api/boards/:id/join — join an existing board by ID. Idempotent. */
export async function joinBoard(boardId: string): Promise<BoardSummary> {
    const res = await fetch(`${API}/${encodeURIComponent(boardId)}/join`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to join board: ${res.status}`));
    return fromDTO((await res.json()) as BoardSummaryDTO);
}

/** PATCH /api/boards/:id — rename a board (owner only). */
export async function renameBoard(boardId: string, title: string): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(boardId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to rename board: ${res.status}`));
}

/** DELETE /api/boards/:id — permanently delete a board (owner only). */
export async function deleteBoard(boardId: string): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(boardId)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to delete board: ${res.status}`));
}
