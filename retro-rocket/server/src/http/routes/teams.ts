import { Router, type Request, type Response } from 'express';
import { createRateLimiter } from '../middleware/rateLimiting';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import type { TeamMemberView, TeamRecord, TeamsPort, TeamSummary } from '../../application/ports/teams';
import type { ProfilePort } from '../../application/ports/profile';
import type { TeamMetricsPort, TeamMetricsSummary } from '../../application/ports/teamMetrics';
import type { PublicUser } from '../../domain/auth/types';
import { AppError } from '../../domain/errors';
import { readCookie, SESSION_COOKIE } from '../cookies';
import { ensureUserProfile } from '../../application/use-cases/profile/EnsureUserProfile';
import { createTeam } from '../../application/use-cases/teams/CreateTeam';
import { listTeamsForUser } from '../../application/use-cases/teams/ListTeamsForUser';
import { getTeamWithMembers } from '../../application/use-cases/teams/GetTeamWithMembers';
import { getTeamMetrics } from '../../application/use-cases/teams/GetTeamMetrics';
import { addTeamMember } from '../../application/use-cases/teams/AddTeamMember';
import { removeTeamMember } from '../../application/use-cases/teams/RemoveTeamMember';
import { leaveTeam } from '../../application/use-cases/teams/LeaveTeam';

export interface TeamsRouterDeps {
    teamsPort: TeamsPort;
    profilePort: ProfilePort;
    teamMetricsPort: TeamMetricsPort;
    sessionService: SessionServicePort;
    clock: ClockPort;
    /** Skips teamsLimiter, mirroring auth.ts's authLimiter. MUST be false in production —
     * see auth.ts's testMode doc comment for why (shared emulator-backed E2E run/session). */
    testMode?: boolean;
}

interface AuthedSession {
    sub: string;
    user?: PublicUser;
}

// Exported (unlike boards.ts's private requireSession) because this skeleton has no
// endpoints of its own yet to call it — T014/T032 (specs/054-team-management/tasks.md)
// add the handlers that use it directly in this file, at which point it stays exported
// for parity but is also used locally, same as boards.ts.
export async function requireSession(req: Request, deps: TeamsRouterDeps): Promise<AuthedSession> {
    const now = deps.clock.nowSeconds();
    const session = await deps.sessionService.verify(readCookie(req, SESSION_COOKIE) ?? '', now);
    // 045-idle-connection-cleanup, US5/FR-007: a session past its soft TTL is rejected
    // the same way an invalid one is, even though it's still within its absolute TTL —
    // recoverable via the client's existing silent-refresh flow for a present user.
    if (!session || !session.isActive(now)) throw new AppError('unauthenticated', 'Sign-in required', 401);
    return session.data as unknown as AuthedSession;
}

/**
 * Resolves the acting user's currently configured Profile display name, mirroring
 * routes/boards.ts's resolveDisplayName — the same get-or-create profile source used
 * across every session-authenticated feature.
 */
export async function resolveDisplayName(deps: Pick<TeamsRouterDeps, 'profilePort'>, session: AuthedSession): Promise<string> {
    const profile = await ensureUserProfile(
        { profilePort: deps.profilePort },
        {
            uid: session.sub,
            email: session.user?.email ?? '',
            displayName: session.user?.displayName ?? null,
            photoURL: session.user?.photoURL ?? null,
            providers: session.user?.providers ?? [],
        },
    );
    return profile.displayName;
}

/** Serializes a TeamSummary for the wire, mirroring routes/boards.ts's serializeBoard (ISO dates). */
function serializeTeamSummary(team: TeamSummary) {
    return {
        id: team.id,
        name: team.name,
        description: team.description,
        ownerId: team.ownerId,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
        memberCount: team.memberCount,
        myRole: team.myRole,
    };
}

/** Serializes a TeamMemberView for the wire (ISO dates), mirroring serializeTeamSummary. */
function serializeTeamMember(member: TeamMemberView) {
    return {
        userId: member.userId,
        displayName: member.displayName,
        email: member.email,
        photoURL: member.photoURL,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
    };
}

/** Serializes team detail + roster per contracts/teams-api.md's GET /api/teams/:id shape. */
function serializeTeamDetail(team: TeamRecord, members: TeamMemberView[]) {
    return {
        id: team.id,
        name: team.name,
        description: team.description,
        ownerId: team.ownerId,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
        members: members.map(serializeTeamMember),
    };
}

/** Serializes a TeamMetricsSummary for the wire, per contracts/team-metrics-api.md's
 * GET /api/teams/:id/metrics shape (ISO dates, including each moodEvolution entry's
 * createdAt). Mirrors serializeTeamDetail. */
function serializeTeamMetrics(summary: TeamMetricsSummary) {
    return {
        teamId: summary.teamId,
        retrospectiveCount: summary.retrospectiveCount,
        averageParticipants: summary.averageParticipants,
        actionItemsCreated: summary.actionItemsCreated,
        moodEvolution: summary.moodEvolution.map((point) => ({
            retrospectiveId: point.retrospectiveId,
            retrospectiveTitle: point.retrospectiveTitle,
            createdAt: point.createdAt.toISOString(),
            moodScore: point.moodScore,
        })),
    };
}

/**
 * Team Management routes (feature 054): create/list/detail teams, manage membership.
 * Session-cookie authenticated, reusing 014-backend-auth-foundation's session service.
 * Mirrors routes/boards.ts's structure and error-envelope conventions. Skeleton only —
 * endpoints are added per user story (see specs/054-team-management/tasks.md T014/T032).
 */
export function teamsRouter(deps: TeamsRouterDeps): Router {
    const router = Router();

    // Same rationale as boards.ts's boardsLimiter / auth.ts's authLimiter: blunt
    // brute-force/resource-exhaustion within Vercel's free-tier request budget, keyed
    // by session identity (falling back to the trust-proxy-aware IP) via
    // rateLimiting.ts.
    //
    // Skipped entirely when testMode is on (never production — see auth-wiring.ts):
    // the emulator-backed E2E suite shares one dev-server process/session across every
    // spec file (playwright.config.ts), so its cumulative request volume across a full
    // run can legitimately exceed the limit for /api/teams without any real abuse
    // occurring — mirrors boards.ts's boardsLimiter skip for the exact same reason.
    if (!deps.testMode) {
        const teamsLimiter = createRateLimiter({
            sessionService: deps.sessionService,
            clock: deps.clock,
            windowMs: 15 * 60 * 1000,
            limit: 150,
        });
        router.use(teamsLimiter);
    }

    router.post('/api/teams', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { name?: unknown; description?: unknown };

        const result = await createTeam(
            { teamsPort: deps.teamsPort },
            {
                name: typeof body.name === 'string' ? body.name : '',
                description: typeof body.description === 'string' ? body.description : undefined,
                createdBy: session.sub,
            },
        );
        res.status(201).json(result);
    });

    router.get('/api/teams', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const teams = await listTeamsForUser({ teamsPort: deps.teamsPort }, session.sub);
        res.status(200).json({ teams: teams.map(serializeTeamSummary) });
    });

    // FR-009: team detail + full roster, readable by any current member (owner or not).
    router.get('/api/teams/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const detail = await getTeamWithMembers(
            { teamsPort: deps.teamsPort },
            { teamId: String(req.params.id), requesterUid: session.sub },
        );
        res.status(200).json(serializeTeamDetail(detail.team, detail.members));
    });

    // 056-team-metrics-dashboard, T010 (contracts/team-metrics-api.md): aggregated,
    // read-only retrospective metrics for one team, readable by any current member
    // (owner or not) — same membership gate as GET /api/teams/:id.
    router.get('/api/teams/:id/metrics', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const summary = await getTeamMetrics(
            { teamsPort: deps.teamsPort, teamMetricsPort: deps.teamMetricsPort },
            { teamId: String(req.params.id), requesterUid: session.sub },
        );
        res.status(200).json(serializeTeamMetrics(summary));
    });

    // FR-003/FR-004/FR-006/FR-007/FR-008: owner-only, add an existing user by exact email.
    router.post('/api/teams/:id/members', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { email?: unknown };

        const result = await addTeamMember(
            { teamsPort: deps.teamsPort },
            {
                teamId: String(req.params.id),
                email: typeof body.email === 'string' ? body.email : '',
                requestedBy: session.sub,
            },
        );
        res.status(201).json(serializeTeamMember(result));
    });

    // FR-005/FR-008/FR-012/FR-013/FR-014: three cases per contracts/teams-api.md —
    // owner removes another member, a non-owner removes themself (both via
    // removeTeamMember), or the owner removes themself (routed to leaveTeam instead,
    // since that path carries ownership-transfer/team-emptied semantics that
    // removeTeamMember deliberately rejects).
    router.delete('/api/teams/:id/members/:userId', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const teamId = String(req.params.id);
        const targetUserId = String(req.params.userId);

        if (targetUserId === session.sub) {
            const requesterMembership = await deps.teamsPort.getMembership(teamId, session.sub);
            if (requesterMembership?.role === 'owner') {
                const result = await leaveTeam({ teamsPort: deps.teamsPort }, { teamId, uid: session.sub });
                if (result.teamEmptied) {
                    res.status(200).json({ teamEmptied: true });
                } else {
                    res.status(204).send();
                }
                return;
            }
        }

        await removeTeamMember(
            { teamsPort: deps.teamsPort },
            { teamId, targetUserId, requestedBy: session.sub },
        );
        res.status(204).send();
    });

    return router;
}
