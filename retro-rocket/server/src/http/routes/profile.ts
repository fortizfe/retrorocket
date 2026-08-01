import { Router, type Request, type Response } from 'express';
import { createRateLimiter } from '../middleware/rateLimiting';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import type { ProfilePort, ProfileRecord } from '../../application/ports/profile';
import type { ParticipantPort } from '../../application/ports/retrospective';
import type { PublicUser } from '../../domain/auth/types';
import { AppError } from '../../domain/errors';
import { readCookie, SESSION_COOKIE } from '../cookies';
import { ensureUserProfile } from '../../application/use-cases/profile/EnsureUserProfile';
import { updateDisplayName as updateDisplayNameUseCase } from '../../application/use-cases/profile/UpdateDisplayName';

export interface ProfileRouterDeps {
    profilePort: ProfilePort;
    participantPort: ParticipantPort;
    sessionService: SessionServicePort;
    clock: ClockPort;
    /** Skips profileLimiter, mirroring boards.ts's testMode. MUST be false in production. */
    testMode?: boolean;
}

interface AuthedSession {
    sub: string;
    user?: PublicUser;
}

async function requireSession(req: Request, deps: ProfileRouterDeps): Promise<AuthedSession> {
    const session = await deps.sessionService.verify(readCookie(req, SESSION_COOKIE) ?? '', deps.clock.nowSeconds());
    if (!session) throw new AppError('unauthenticated', 'Sign-in required', 401);
    return session.data as unknown as AuthedSession;
}

function serializeProfile(profile: ProfileRecord) {
    return {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        providers: profile.providers,
        primaryProvider: profile.primaryProvider,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
    };
}

/**
 * "Mi Perfil" profile routes (feature 018): get-or-create + update display name.
 * Session-cookie authenticated, reusing 014-backend-auth-foundation's session service.
 * Mirrors routes/boards.ts's structure and error-envelope conventions. Every operation
 * is implicitly scoped to the requesting session's own uid — no :uid parameter exists
 * on either route (research.md §3).
 */
export function profileRouter(deps: ProfileRouterDeps): Router {
    const router = Router();

    // Same rationale as boards.ts's boardsLimiter — see that file's comment for the
    // testMode skip's justification (shared emulator-backed E2E run/session) and
    // rateLimiting.ts for the session-first/trust-proxy-aware keying (021, research.md §1).
    if (!deps.testMode) {
        const profileLimiter = createRateLimiter({
            sessionService: deps.sessionService,
            clock: deps.clock,
            windowMs: 15 * 60 * 1000,
            limit: 150,
        });
        router.use(profileLimiter);
    }

    router.get('/api/profile', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
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
        res.status(200).json(serializeProfile(profile));
    });

    router.patch('/api/profile', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { displayName?: unknown };
        const profile = await updateDisplayNameUseCase(
            { profilePort: deps.profilePort, participantPort: deps.participantPort },
            { uid: session.sub, displayName: typeof body.displayName === 'string' ? body.displayName : '' },
        );
        res.status(200).json(serializeProfile(profile));
    });

    return router;
}
