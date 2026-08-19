/**
 * Client for the Team Management API (feature 054). Like `backendBoardsClient.ts`, the browser
 * never talks to Firestore directly for team data (constitution Technology Stack: Real-Time Data
 * Security) — every operation goes through the backend's session-cookie-authenticated
 * /api/teams/* endpoints instead. Mirrors the fetch conventions of `backendBoardsClient.ts`.
 *
 * T015 (tasks.md) added `createTeam`/`listTeams`, matching contracts/teams-api.md's
 * `POST /api/teams` and `GET /api/teams`. T033 adds `getTeam`/`addTeamMember`/`removeTeamMember`
 * for `GET /api/teams/:id`, `POST /api/teams/:id/members`, and
 * `DELETE /api/teams/:id/members/:userId`.
 */

import type { TeamDetail, TeamMember, TeamSummary } from '../types/team';

// Exported (rather than module-private like `backendBoardsClient.ts`'s equivalents) purely
// because this skeleton has no endpoint functions calling them yet; later tasks (T015/T033)
// will consume both from within this same file as they add createTeam/listTeams/etc., at
// which point keeping the export is harmless but no longer necessary.
export const API = '/api/teams';

/**
 * Extracts the backend's error message from the { error: { code, message } } envelope
 * (errorHandler.ts) when present, so callers see the same specific messages the backend
 * produced (e.g. "user_not_found") rather than a generic "request failed".
 */
export async function errorMessageOf(res: Response, fallback: string): Promise<string> {
    try {
        const body = (await res.json()) as { error?: { message?: string } };
        return body.error?.message ?? fallback;
    } catch {
        return fallback;
    }
}

export interface CreateTeamParams {
    name: string;
    description?: string;
}

/** Wire shape of a `GET /api/teams` row — dates as ISO-8601 strings (contracts/teams-api.md). */
interface TeamSummaryDTO {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    myRole: 'owner' | 'member';
}

function fromSummaryDTO(dto: TeamSummaryDTO): TeamSummary {
    return {
        ...dto,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    };
}

/** POST /api/teams — create a team. The caller becomes its owner (FR-001, FR-002). */
export async function createTeam(params: CreateTeamParams): Promise<{ teamId: string }> {
    const res = await fetch(API, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to create team: ${res.status}`));
    return (await res.json()) as { teamId: string };
}

/** GET /api/teams — every team the caller currently belongs to (FR-010). */
export async function listTeams(): Promise<TeamSummary[]> {
    const res = await fetch(API, { credentials: 'include' });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to load teams: ${res.status}`));
    const body = (await res.json()) as { teams: TeamSummaryDTO[] };
    return body.teams.map(fromSummaryDTO);
}

/**
 * Thrown by the T033 membership functions below instead of a plain `Error`, so callers
 * can branch on the backend's `error.code` (errorHandler.ts's envelope) rather than
 * string-matching `error.message` — the UI needs to tell `user_not_found` apart from
 * `conflict` (already a member) and `forbidden` (not the owner), per contracts/teams-api.md,
 * and collapsing all three into one generic message would make that impossible.
 */
export class TeamApiError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'TeamApiError';
        this.code = code;
    }
}

/** Parses the `{ error: { code, message } }` envelope into a `TeamApiError`, preserving
 * both fields (unlike `errorMessageOf`, which only keeps the message). */
async function teamApiErrorOf(res: Response, fallback: string): Promise<TeamApiError> {
    try {
        const body = (await res.json()) as { error?: { code?: string; message?: string } };
        return new TeamApiError(body.error?.code ?? 'unknown', body.error?.message ?? fallback);
    } catch {
        return new TeamApiError('unknown', fallback);
    }
}

/** Wire shape of one `members[]` entry (contracts/teams-api.md), dates as ISO-8601 strings. */
interface TeamMemberDTO {
    userId: string;
    displayName: string;
    email: string;
    photoURL: string | null;
    role: 'owner' | 'member';
    joinedAt: string;
}

/** Wire shape of `GET /api/teams/:id` (contracts/teams-api.md). */
interface TeamDetailDTO {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    members: TeamMemberDTO[];
}

function fromMemberDTO(dto: TeamMemberDTO): TeamMember {
    return { ...dto, joinedAt: new Date(dto.joinedAt) };
}

function fromDetailDTO(dto: TeamDetailDTO): TeamDetail {
    return {
        id: dto.id,
        name: dto.name,
        description: dto.description,
        ownerId: dto.ownerId,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
        members: dto.members.map(fromMemberDTO),
    };
}

/** GET /api/teams/:id — team detail + full member roster (FR-009). Caller must be a
 * current member (any role); a non-member gets `403 forbidden`. */
export async function getTeam(teamId: string): Promise<TeamDetail> {
    const res = await fetch(`${API}/${teamId}`, { credentials: 'include' });
    if (!res.ok) throw await teamApiErrorOf(res, `Failed to load team: ${res.status}`);
    return fromDetailDTO((await res.json()) as TeamDetailDTO);
}

/**
 * POST /api/teams/:id/members — owner looks up an existing RetroRocket user by exact
 * email and adds them (FR-003, FR-004). Owner-only (FR-008, `403 forbidden`).
 * `404 user_not_found` when no account matches the email; `409 conflict` when the user
 * is already a member (FR-007) — both preserved on the thrown `TeamApiError.code` so
 * `AddMemberByEmailForm` can show the right inline message for each.
 */
export async function addTeamMember(teamId: string, email: string): Promise<TeamMember> {
    const res = await fetch(`${API}/${teamId}/members`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) throw await teamApiErrorOf(res, `Failed to add member: ${res.status}`);
    return fromMemberDTO((await res.json()) as TeamMemberDTO);
}

/**
 * DELETE /api/teams/:id/members/:userId — removes a member. Covers all three cases from
 * contracts/teams-api.md (owner removes another member, a non-owner leaves themself, or
 * the owner leaves — possibly transferring ownership or emptying the team server-side).
 *
 * The backend returns `204 No Content` for an ordinary removal/self-leave, or for the
 * owner-departs-with-others-remaining case (ownership transferred silently server-side —
 * re-fetch `getTeam` to see the new owner). It returns `200 OK { teamEmptied: true }`
 * only when the owner was the sole remaining member, so the caller can navigate away
 * from a now-inert team instead of re-fetching it — that's the one case this function
 * surfaces via its return value rather than treating identically to a plain 204.
 */
export async function removeTeamMember(teamId: string, userId: string): Promise<{ teamEmptied: boolean }> {
    const res = await fetch(`${API}/${teamId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!res.ok) throw await teamApiErrorOf(res, `Failed to remove member: ${res.status}`);
    if (res.status === 200) {
        const body = (await res.json()) as { teamEmptied: boolean };
        return { teamEmptied: body.teamEmptied };
    }
    return { teamEmptied: false };
}
