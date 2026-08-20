/**
 * Client for the Team Retrospective Metrics Dashboard API (feature 056). Like
 * `backendTeamsClient.ts`, the browser never talks to Firestore directly for this data —
 * every operation goes through the backend's session-cookie-authenticated
 * `/api/teams/:id/metrics` endpoint instead (constitution Technology Stack: Real-Time
 * Data Security). Mirrors `backendTeamsClient.ts`'s fetch conventions (`credentials:
 * 'include'`, `errorMessageOf`'s error-envelope handling, throw on `!res.ok`) exactly.
 *
 * T012 (tasks.md) adds `getTeamMetrics`, matching
 * specs/056-team-metrics-dashboard/contracts/team-metrics-api.md's
 * `GET /api/teams/:id/metrics`.
 */

import type { RetrospectiveMoodPoint, TeamMetricsSummary } from '../types/teamMetrics';

const API = '/api/teams';

/**
 * Extracts the backend's error message from the `{ error: { code, message } }` envelope
 * (errorHandler.ts) when present, so callers see the same specific messages the backend
 * produced rather than a generic "request failed". Mirrors
 * `backendTeamsClient.ts`'s `errorMessageOf` exactly.
 */
export async function errorMessageOf(res: Response, fallback: string): Promise<string> {
    try {
        const body = (await res.json()) as { error?: { message?: string } };
        return body.error?.message ?? fallback;
    } catch {
        return fallback;
    }
}

/** Wire shape of one `moodEvolution[]` entry (contracts/team-metrics-api.md), dates as
 * ISO-8601 strings. */
interface RetrospectiveMoodPointDTO {
    retrospectiveId: string;
    retrospectiveTitle: string;
    createdAt: string;
    moodScore: number | null;
}

/** Wire shape of `GET /api/teams/:id/metrics` (contracts/team-metrics-api.md). */
interface TeamMetricsSummaryDTO {
    teamId: string;
    retrospectiveCount: number;
    averageParticipants: number;
    actionItemsCreated: number;
    moodEvolution: RetrospectiveMoodPointDTO[];
}

function fromMoodPointDTO(dto: RetrospectiveMoodPointDTO): RetrospectiveMoodPoint {
    return { ...dto, createdAt: new Date(dto.createdAt) };
}

function fromTeamMetricsSummaryDTO(dto: TeamMetricsSummaryDTO): TeamMetricsSummary {
    return {
        teamId: dto.teamId,
        retrospectiveCount: dto.retrospectiveCount,
        averageParticipants: dto.averageParticipants,
        actionItemsCreated: dto.actionItemsCreated,
        moodEvolution: dto.moodEvolution.map(fromMoodPointDTO),
    };
}

/** GET /api/teams/:id/metrics — aggregated, read-only retrospective metrics for one team,
 * computed across its full history. Caller must be a current member of the team (owner or
 * member); a non-member gets `403 forbidden` (contracts/team-metrics-api.md). */
export async function getTeamMetrics(teamId: string): Promise<TeamMetricsSummary> {
    const res = await fetch(`${API}/${teamId}/metrics`, { credentials: 'include' });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to load team metrics: ${res.status}`));
    return fromTeamMetricsSummaryDTO((await res.json()) as TeamMetricsSummaryDTO);
}
