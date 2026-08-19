import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 056-team-metrics-dashboard, T006 (spec.md User Story 1 / contracts/team-metrics-api.md /
// tasks.md T014):
//
//   "TeamMetricsPanel (loading/error/empty-state handling, per FR-010) ... renders
//   ActivitySummary with data from useTeamMetricsQuery, shows a loading state while
//   fetching, and shows an error state with retry on failure."
//
// Signature contract: TeamMetricsPanel(props: { teamId: string }) — a container
// component that calls useTeamMetricsQuery(teamId) internally.
//
// useTeamMetricsQuery is mocked directly (not its backendTeamMetricsClient dependency),
// mirroring src/test/features/teams/Teams.page.test.tsx's pattern of mocking a query
// hook one level up so this file is a focused test of the PANEL's rendering branches —
// ActivitySummary itself is NOT mocked, so its real render output (the retrospective
// count text) is what proves the panel actually passed the fetched data down, the same
// way Teams.page.test.tsx asserts against TeamMemberList's real rendered rows rather
// than a stub.
//
// Loading uses `role="status"` and the error state uses `role="alert"` with a
// `common.retry`-labelled button that calls the hook's `refetch`, mirroring
// src/pages/Teams.tsx's existing loading/error branches (same UseTeamsQueryResult-style
// hook contract, applied here to useTeamMetricsQuery's `{ metrics, loading, error,
// refetch }` shape — see useTeamMetricsQuery.test.ts's header comment for that shape).
//
// TeamMetricsPanel and useTeamMetricsQuery do not exist yet — this file is expected to
// fail with a "Cannot find module" error until
// src/features/teams/metrics/components/TeamMetricsPanel.tsx and
// src/features/teams/metrics/hooks/useTeamMetricsQuery.ts are implemented (T013, T014).

vi.mock('@/features/teams/metrics/hooks/useTeamMetricsQuery', () => ({
    useTeamMetricsQuery: vi.fn(),
}));

import TeamMetricsPanel from '@/features/teams/metrics/components/TeamMetricsPanel';
import { useTeamMetricsQuery } from '@/features/teams/metrics/hooks/useTeamMetricsQuery';
import type { TeamMetricsSummary } from '@/features/teams/metrics/types/teamMetrics';

const SAMPLE_METRICS: TeamMetricsSummary = {
    teamId: 't1',
    retrospectiveCount: 8,
    averageParticipants: 5.2,
    actionItemsCreated: 3,
    moodEvolution: [],
};

function mockQueryResult(overrides: {
    metrics?: TeamMetricsSummary | null;
    loading?: boolean;
    error?: boolean;
    refetch?: () => Promise<void>;
}) {
    return {
        metrics: null,
        loading: false,
        error: false,
        refetch: vi.fn(async () => {}),
        ...overrides,
    };
}

describe('TeamMetricsPanel', () => {
    beforeEach(() => {
        vi.mocked(useTeamMetricsQuery).mockReset();
    });

    it('renders a loading indicator while useTeamMetricsQuery is loading', () => {
        vi.mocked(useTeamMetricsQuery).mockReturnValue(mockQueryResult({ loading: true }));

        render(<TeamMetricsPanel teamId="t1" />);

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders ActivitySummary populated with the fetched data once loaded', () => {
        vi.mocked(useTeamMetricsQuery).mockReturnValue(mockQueryResult({ metrics: SAMPLE_METRICS }));

        render(<TeamMetricsPanel teamId="t1" />);

        // Real ActivitySummary render output — proves the panel passed the fetched
        // retrospectiveCount down rather than something stubbed.
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('5.2')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders an error state with a retry control that calls refetch when clicked', () => {
        const refetch = vi.fn(async () => {});
        vi.mocked(useTeamMetricsQuery).mockReturnValue(mockQueryResult({ error: true, refetch }));

        render(<TeamMetricsPanel teamId="t1" />);

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();

        const retryButton = screen.getByRole('button', { name: 'common.retry' });
        retryButton.click();

        expect(refetch).toHaveBeenCalledTimes(1);
    });
});
