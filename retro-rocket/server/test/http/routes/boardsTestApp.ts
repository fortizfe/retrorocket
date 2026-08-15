import { vi } from 'vitest';
import express, { type Express } from 'express';
import { correlationId } from '../../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/errorHandler';
import { boardsRouter, type BoardsRouterDeps } from '../../../src/http/routes/boards';
import type { SessionServicePort } from '../../../src/application/ports';
import { fixedClock } from '../../application/use-cases/mcp/mcpFakes';
import { inMemoryBoardsPort, type FakeBoardRecord, type FakeMembership } from '../../application/use-cases/boards/boardsFakes';
import { inMemoryProfilePort } from '../../application/use-cases/profile/profileFakes';

/**
 * Unlike mcpFakes.ts's fakeSessionServiceFor (which omits `user` — MCP tools only need
 * `sub`), boards routes also read `session.user.displayName` for createdByName/joiner
 * name, so this fake includes a full PublicUser projection.
 */
/** `isActive` defaults to true (045-idle-connection-cleanup, US5) so every existing
 * test keeps representing a healthy, active session unless it explicitly opts out via
 * `overrides.sessionService`. */
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

export interface BoardsTestAppOptions {
    boards?: FakeBoardRecord[];
    memberships?: FakeMembership[];
    overrides?: Partial<BoardsRouterDeps>;
}

export function buildBoardsTestApp(options: BoardsTestAppOptions = {}): { app: Express; deps: BoardsRouterDeps } {
    const deps: BoardsRouterDeps = {
        boardsPort: inMemoryBoardsPort(options.boards ?? [], options.memberships ?? []),
        profilePort: inMemoryProfilePort([]),
        sessionService: fakeSessionServiceWithUser(),
        clock: fixedClock(),
        ...options.overrides,
    };

    const app = express();
    // Mirrors createApp()'s trust-proxy setting (server/src/http/app.ts) so IP-keyed
    // rate-limit behavior in tests reflects the real, single-Vercel-hop configuration.
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(correlationId());
    app.use(boardsRouter(deps));
    app.use(notFoundHandler());
    app.use(errorHandler());
    return { app, deps };
}

export function sessionCookieFor(uid: string): string {
    return `rr_session=${encodeURIComponent(`session-${uid}`)}`;
}
