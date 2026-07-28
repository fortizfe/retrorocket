import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import type { BoardsPort } from '../../application/ports/boards';
import type { PublicUser } from '../../domain/auth/types';
import { AppError } from '../../domain/errors';
import { readCookie, SESSION_COOKIE } from '../cookies';
import { listBoardsForUser } from '../../application/use-cases/boards/ListBoardsForUser';
import { createBoard } from '../../application/use-cases/boards/CreateBoard';
import { joinBoard } from '../../application/use-cases/boards/JoinBoard';
import { renameBoard } from '../../application/use-cases/boards/RenameBoard';
import { deleteBoard } from '../../application/use-cases/boards/DeleteBoard';

export interface BoardsRouterDeps {
    boardsPort: BoardsPort;
    sessionService: SessionServicePort;
    clock: ClockPort;
    /** Skips boardsLimiter, mirroring auth.ts's authLimiter. MUST be false in production —
     * see auth.ts's testMode doc comment for why (shared emulator-backed E2E run/session). */
    testMode?: boolean;
}

interface AuthedSession {
    sub: string;
    user?: PublicUser;
}

async function requireSession(req: Request, deps: BoardsRouterDeps): Promise<AuthedSession> {
    const session = await deps.sessionService.verify(readCookie(req, SESSION_COOKIE) ?? '', deps.clock.nowSeconds());
    if (!session) throw new AppError('unauthenticated', 'Sign-in required', 401);
    return session.data as unknown as AuthedSession;
}

function displayNameOf(user: PublicUser | undefined): string {
    return user?.displayName ?? user?.email ?? 'Anonymous';
}

function serializeBoard(board: import('../../application/ports/boards').BoardSummary) {
    return {
        id: board.id,
        title: board.title,
        description: board.description,
        templateId: board.templateId,
        createdAt: board.createdAt.toISOString(),
        updatedAt: board.updatedAt.toISOString(),
        participantCount: board.participantCount,
        isActive: board.isActive,
        createdBy: board.createdBy,
        isCreator: board.isCreator,
    };
}

/**
 * Dashboard ("My Boards") board management routes (feature 017): list, create, join,
 * rename, delete. Session-cookie authenticated, reusing 014-backend-auth-foundation's
 * session service. Mirrors routes/mcp.ts's structure and error-envelope conventions.
 */
export function boardsRouter(deps: BoardsRouterDeps): Router {
    const router = Router();

    // Same rationale as auth.ts's authLimiter / mcp.ts's tokenLimiter: blunt
    // brute-force/resource-exhaustion within Vercel's free-tier request budget.
    //
    // Skipped entirely when testMode is on (never production — see auth-wiring.ts):
    // the emulator-backed E2E suite shares one dev-server process/session across every
    // spec file (playwright.config.ts), so its cumulative request volume across a full
    // run can legitimately exceed 100/15min for /api/boards without any real abuse
    // occurring — mirrors auth.ts's authLimiter skip for the exact same reason.
    if (!deps.testMode) {
        const boardsLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 100,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            validate: false,
        });
        router.use(boardsLimiter);
    }

    router.get('/api/boards', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const boards = await listBoardsForUser({ boardsPort: deps.boardsPort }, session.sub);
        res.status(200).json({ boards: boards.map(serializeBoard) });
    });

    router.post('/api/boards', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { templateId?: unknown; title?: unknown; locale?: unknown };

        const result = await createBoard(
            { boardsPort: deps.boardsPort },
            {
                templateId: typeof body.templateId === 'string' ? body.templateId : '',
                title: typeof body.title === 'string' ? body.title : '',
                locale: body.locale === 'en' ? 'en' : 'es',
                createdBy: session.sub,
                createdByName: displayNameOf(session.user),
            },
        );
        res.status(201).json(result);
    });

    router.post('/api/boards/:id/join', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const board = await joinBoard(
            { boardsPort: deps.boardsPort },
            { boardId: String(req.params.id), uid: session.sub, userName: displayNameOf(session.user) },
        );
        res.status(200).json(serializeBoard(board));
    });

    router.patch('/api/boards/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { title?: unknown };
        await renameBoard(
            { boardsPort: deps.boardsPort },
            { boardId: String(req.params.id), uid: session.sub, title: typeof body.title === 'string' ? body.title : '' },
        );
        res.status(204).end();
    });

    router.delete('/api/boards/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await deleteBoard({ boardsPort: deps.boardsPort }, { boardId: String(req.params.id), uid: session.sub });
        res.status(204).end();
    });

    return router;
}
