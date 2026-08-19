import { vi } from 'vitest';
import express, { type Express } from 'express';
import { correlationId } from '../../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/errorHandler';
import { teamsRouter, type TeamsRouterDeps } from '../../../src/http/routes/teams';
import type { SessionServicePort } from '../../../src/application/ports';
import type { TeamMetricsPort, TeamMetricsSummary } from '../../../src/application/ports/teamMetrics';
import { fixedClock } from '../../application/use-cases/mcp/mcpFakes';
import { inMemoryTeamsPort, type FakeMembershipRecord, type FakeProfileRecord, type FakeTeamRecord } from '../../application/use-cases/teams/teamsFakes';
import { inMemoryProfilePort } from '../../application/use-cases/profile/profileFakes';

/** Minimal fake for routes not covered by this test app's existing route tests yet
 * (056-team-metrics-dashboard's GET /api/teams/:id/metrics) — kept trivial since no
 * route-level test here exercises it; callers needing specific behavior should pass
 * `overrides.teamMetricsPort`. */
function fakeTeamMetricsPort(): TeamMetricsPort {
    return {
        async getTeamMetrics(teamId: string): Promise<TeamMetricsSummary> {
            return { teamId, retrospectiveCount: 0, averageParticipants: 0, actionItemsCreated: 0, moodEvolution: [] };
        },
    };
}

/**
 * Mirrors boardsTestApp.ts's fakeSessionServiceWithUser — teams routes also read
 * session.user.displayName (via resolveDisplayName/ensureUserProfile), so this fake
 * carries a full PublicUser projection, not just `sub`.
 */
function fakeSessionServiceWithUser(): SessionServicePort {
    return {
        issue: vi.fn(),
        verify: vi.fn(async (token: string) => {
            if (!token.startsWith('session-')) return null;
            const uid = token.slice('session-'.length);
            return {
                data: {
                    sub: uid,
                    user: { uid, email: `${uid}@example.com`, displayName: `User ${uid}`, photoURL: null, providers: ['google'] },
                },
                isActive: () => true,
            } as never;
        }),
        refresh: vi.fn(),
    };
}

export interface TeamsTestAppOptions {
    teams?: FakeTeamRecord[];
    memberships?: FakeMembershipRecord[];
    profiles?: FakeProfileRecord[];
    overrides?: Partial<TeamsRouterDeps>;
}

export function buildTeamsTestApp(options: TeamsTestAppOptions = {}): { app: Express; deps: TeamsRouterDeps } {
    const deps: TeamsRouterDeps = {
        teamsPort: inMemoryTeamsPort(options.teams ?? [], options.memberships ?? [], options.profiles ?? []),
        profilePort: inMemoryProfilePort([]),
        teamMetricsPort: fakeTeamMetricsPort(),
        sessionService: fakeSessionServiceWithUser(),
        clock: fixedClock(),
        testMode: true,
        ...options.overrides,
    };

    const app = express();
    // Mirrors createApp()'s trust-proxy setting (server/src/http/app.ts) so IP-keyed
    // rate-limit behavior in tests reflects the real, single-Vercel-hop configuration.
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(correlationId());
    app.use(teamsRouter(deps));
    app.use(notFoundHandler());
    app.use(errorHandler());
    return { app, deps };
}

export function sessionCookieFor(uid: string): string {
    return `rr_session=${encodeURIComponent(`session-${uid}`)}`;
}
