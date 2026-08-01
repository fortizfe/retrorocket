import { vi } from 'vitest';
import express, { type Express } from 'express';
import { correlationId } from '../../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/errorHandler';
import { profileRouter, type ProfileRouterDeps } from '../../../src/http/routes/profile';
import type { SessionServicePort } from '../../../src/application/ports';
import type { ProfileRecord } from '../../../src/application/ports/profile';
import { fixedClock } from '../../application/use-cases/mcp/mcpFakes';
import { inMemoryProfilePort } from '../../application/use-cases/profile/profileFakes';

/**
 * Mirrors boardsTestApp.ts's fakeSessionServiceWithUser: profile routes read
 * session.user (email/displayName/photoURL/providers) as the EnsureProfileInput source,
 * so this fake includes a full PublicUser projection, keyed by uid so each test can
 * control what a given session's identity looks like.
 */
function fakeSessionServiceWithUser(
    users: Record<string, { email: string; displayName: string | null; photoURL: string | null; providers: ('google' | 'github')[] }>,
): SessionServicePort {
    return {
        issue: vi.fn(),
        verify: vi.fn(async (token: string) => {
            if (!token.startsWith('session-')) return null;
            const uid = token.slice('session-'.length);
            const user = users[uid] ?? { email: `${uid}@example.com`, displayName: `User ${uid}`, photoURL: null, providers: ['google'] as const };
            return { data: { sub: uid, user: { uid, ...user } } } as never;
        }),
        refresh: vi.fn(),
    };
}

export interface ProfileTestAppOptions {
    profiles?: ProfileRecord[];
    users?: Record<string, { email: string; displayName: string | null; photoURL: string | null; providers: ('google' | 'github')[] }>;
    overrides?: Partial<ProfileRouterDeps>;
}

export function buildProfileTestApp(options: ProfileTestAppOptions = {}): { app: Express; deps: ProfileRouterDeps } {
    const deps: ProfileRouterDeps = {
        profilePort: inMemoryProfilePort(options.profiles ?? []),
        sessionService: fakeSessionServiceWithUser(options.users ?? {}),
        clock: fixedClock(),
        ...options.overrides,
    };

    const app = express();
    // Mirrors createApp()'s trust-proxy setting (server/src/http/app.ts) so IP-keyed
    // rate-limit behavior in tests reflects the real, single-Vercel-hop configuration.
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(correlationId());
    app.use(profileRouter(deps));
    app.use(notFoundHandler());
    app.use(errorHandler());
    return { app, deps };
}

export function sessionCookieFor(uid: string): string {
    return `rr_session=${encodeURIComponent(`session-${uid}`)}`;
}
