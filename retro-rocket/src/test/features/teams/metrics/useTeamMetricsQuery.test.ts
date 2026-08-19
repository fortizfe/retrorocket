import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 056-team-metrics-dashboard, T004 (spec.md User Story 1 / data-model.md
// "TeamMetricsSummary" / tasks.md T013):
//
//   "useTeamMetricsQuery(teamId) hook (loading/error/data, mirroring useTeamQuery's
//   existing shape) in src/features/teams/metrics/hooks/useTeamMetricsQuery.ts."
//
// Mirrors src/test/features/teams/useTeamQuery.test.ts exactly: mocks the backend
// client module the hook calls internally (backendTeamMetricsClient.getTeamMetrics),
// not fetch directly, so this test is about the hook's own loading/error/success/
// refetch bookkeeping rather than the wire format.
//
// Signature contract (mirroring useTeamQuery.ts's UseTeamQueryResult shape, with
// `team` renamed to `metrics` for this domain):
//
//   export interface UseTeamMetricsQueryResult {
//       metrics: TeamMetricsSummary | null;
//       loading: boolean;
//       error: boolean;
//       refetch: () => Promise<void>;
//   }
//   export function useTeamMetricsQuery(teamId: string | undefined): UseTeamMetricsQueryResult
//
// useTeamMetricsQuery does not exist yet — this file is expected to fail with a
// "Cannot find module" error until src/features/teams/metrics/hooks/useTeamMetricsQuery.ts
// (and its backendTeamMetricsClient.ts dependency) are implemented (T012, T013).

const mockGetTeamMetrics = vi.fn();

vi.mock('@/features/teams/metrics/services/backendTeamMetricsClient', () => ({
    getTeamMetrics: (...args: unknown[]) => mockGetTeamMetrics(...args),
}));

import { useTeamMetricsQuery } from '@/features/teams/metrics/hooks/useTeamMetricsQuery';
import type { TeamMetricsSummary } from '@/features/teams/metrics/types/teamMetrics';

const metricsSummary: TeamMetricsSummary = {
    teamId: 't1',
    retrospectiveCount: 5,
    averageParticipants: 4.3,
    actionItemsCreated: 12,
    moodEvolution: [
        {
            retrospectiveId: 'r1',
            retrospectiveTitle: 'Sprint 41',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            moodScore: 7.4,
        },
        {
            retrospectiveId: 'r2',
            retrospectiveTitle: 'Sprint 42',
            createdAt: new Date('2026-02-01T00:00:00Z'),
            moodScore: null,
        },
    ],
};

describe('useTeamMetricsQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts loading and fetches the team metrics on mount', async () => {
        mockGetTeamMetrics.mockResolvedValue(metricsSummary);
        const { result } = renderHook(() => useTeamMetricsQuery('t1'));

        expect(result.current.loading).toBe(true);
        expect(result.current.metrics).toBeNull();

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockGetTeamMetrics).toHaveBeenCalledWith('t1');
        expect(result.current.error).toBe(false);
    });

    it('sets error=true and leaves metrics null when the fetch fails', async () => {
        mockGetTeamMetrics.mockRejectedValue(new Error('forbidden'));
        const { result } = renderHook(() => useTeamMetricsQuery('t1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe(true);
        expect(result.current.metrics).toBeNull();
    });

    it('exposes the fetched TeamMetricsSummary fields on success', async () => {
        mockGetTeamMetrics.mockResolvedValue(metricsSummary);
        const { result } = renderHook(() => useTeamMetricsQuery('t1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.metrics).not.toBeNull();
        expect(result.current.metrics?.retrospectiveCount).toBe(5);
        expect(result.current.metrics?.averageParticipants).toBe(4.3);
        expect(result.current.metrics?.actionItemsCreated).toBe(12);
        expect(result.current.metrics?.moodEvolution).toEqual(metricsSummary.moodEvolution);
    });

    it('sets error=true without calling the backend when teamId is undefined', async () => {
        const { result } = renderHook(() => useTeamMetricsQuery(undefined));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockGetTeamMetrics).not.toHaveBeenCalled();
        expect(result.current.error).toBe(true);
        expect(result.current.metrics).toBeNull();
    });

    it('refetch re-runs the fetch and clears a prior error on success', async () => {
        mockGetTeamMetrics.mockRejectedValueOnce(new Error('first failure'));
        const { result } = renderHook(() => useTeamMetricsQuery('t1'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe(true);

        mockGetTeamMetrics.mockResolvedValueOnce(metricsSummary);
        await act(async () => {
            await result.current.refetch();
        });

        expect(mockGetTeamMetrics).toHaveBeenCalledTimes(2);
        expect(result.current.error).toBe(false);
        expect(result.current.metrics).toEqual(metricsSummary);
    });
});
