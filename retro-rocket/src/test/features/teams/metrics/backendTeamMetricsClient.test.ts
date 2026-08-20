import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTeamMetrics } from '@/features/teams/metrics/services/backendTeamMetricsClient';

// 056-team-metrics-dashboard — direct unit test for backendTeamMetricsClient.ts
// (contracts/team-metrics-api.md's GET /api/teams/:id/metrics). Mirrors
// src/test/features/teams/backendTeamsClient.test.ts's fetch-mocking pattern: every
// other caller of this client (useTeamMetricsQuery.test.ts, TeamMetricsPanel.test.tsx)
// mocks the client module itself, so the client's own fetch call, response parsing,
// and error-message extraction were previously never exercised directly.

function jsonResponse(ok: boolean, status: number, body: unknown): Response {
    return { ok, status, json: async () => body } as unknown as Response;
}

function rejectingJsonResponse(ok: boolean, status: number): Response {
    return { ok, status, json: async () => { throw new Error('not json'); } } as unknown as Response;
}

const metricsDto = {
    teamId: 't1',
    retrospectiveCount: 2,
    averageParticipants: 1.5,
    actionItemsCreated: 3,
    moodEvolution: [
        { retrospectiveId: 'r1', retrospectiveTitle: 'Retro A', createdAt: '2026-01-01T00:00:00.000Z', moodScore: 10 },
        { retrospectiveId: 'r2', retrospectiveTitle: 'Retro B', createdAt: '2026-01-02T00:00:00.000Z', moodScore: null },
    ],
};

describe('backendTeamMetricsClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('getTeamMetrics', () => {
        it('fetches GET /api/teams/:id/metrics with credentials and parses moodEvolution timestamps into Dates', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, metricsDto));
            vi.stubGlobal('fetch', fetchMock);

            const metrics = await getTeamMetrics('t1');

            expect(fetchMock).toHaveBeenCalledWith('/api/teams/t1/metrics', { credentials: 'include' });
            expect(metrics.teamId).toBe('t1');
            expect(metrics.retrospectiveCount).toBe(2);
            expect(metrics.averageParticipants).toBe(1.5);
            expect(metrics.actionItemsCreated).toBe(3);
            expect(metrics.moodEvolution).toHaveLength(2);
            expect(metrics.moodEvolution[0].createdAt).toEqual(new Date(metricsDto.moodEvolution[0].createdAt));
            expect(metrics.moodEvolution[0].moodScore).toBe(10);
            expect(metrics.moodEvolution[1].moodScore).toBeNull();
        });

        it('throws the backend error message on a non-OK response (e.g. 403 forbidden)', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => jsonResponse(false, 403, { error: { code: 'forbidden', message: 'Not a member of this team' } })),
            );

            await expect(getTeamMetrics('t1')).rejects.toThrow('Not a member of this team');
        });

        it('falls back to a generic status-coded message when the error body has no message', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 500, {})));

            await expect(getTeamMetrics('t1')).rejects.toThrow('Failed to load team metrics: 500');
        });

        it('falls back to a generic status-coded message when the error body is not valid JSON', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => rejectingJsonResponse(false, 502)));

            await expect(getTeamMetrics('t1')).rejects.toThrow('Failed to load team metrics: 502');
        });
    });
});
