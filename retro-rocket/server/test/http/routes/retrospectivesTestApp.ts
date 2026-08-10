import { vi } from 'vitest';
import express, { type Express } from 'express';
import { correlationId } from '../../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/errorHandler';
import { retrospectiveRouter, type RetrospectiveRouterDeps } from '../../../src/http/routes/retrospectives';
import type { SessionServicePort } from '../../../src/application/ports';
import { createRetrospectiveFakeStore, type FakeRetrospectiveRecord } from '../../application/use-cases/retrospective/retrospectiveFakes';
import { inMemoryProfilePort } from '../../application/use-cases/profile/profileFakes';
import type { ColumnDTO, CountdownTimerDTO, ParticipantDTO } from '../../../src/application/ports/retrospective';
import type { CardDTO, CardGroupDTO } from '../../../src/application/ports/cards';
import type { ActionItemDTO } from '../../../src/application/ports/actionItems';
import type { FacilitatorNoteDTO } from '../../../src/application/ports/facilitatorNotes';
import type { SentimentResultDTO } from '../../../src/application/ports/sentiment';

function fixedClock() {
    return { nowSeconds: () => 0 };
}

/** Mirrors boardsTestApp.ts's fakeSessionServiceWithUser — routes read session.user.displayName. */
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
            } as never;
        }),
        refresh: vi.fn(),
    };
}

export interface RetrospectiveTestAppSeed {
    retrospectives?: FakeRetrospectiveRecord[];
    columns?: ColumnDTO[];
    participants?: ParticipantDTO[];
    cards?: CardDTO[];
    groups?: CardGroupDTO[];
    actionItems?: ActionItemDTO[];
    facilitatorNotes?: FacilitatorNoteDTO[];
    sentimentResults?: SentimentResultDTO[];
    timers?: CountdownTimerDTO[];
    overrides?: Partial<RetrospectiveRouterDeps>;
}

export function buildRetrospectiveTestApp(seed: RetrospectiveTestAppSeed = {}): { app: Express; deps: RetrospectiveRouterDeps } {
    const store = createRetrospectiveFakeStore(seed);

    const deps: RetrospectiveRouterDeps = {
        ...store,
        profilePort: inMemoryProfilePort([]),
        sessionService: fakeSessionServiceWithUser(),
        clock: fixedClock(),
        testMode: true,
        ...seed.overrides,
    };

    const app = express();
    // Mirrors createApp()'s trust-proxy setting (server/src/http/app.ts) so IP-keyed
    // rate-limit behavior in tests reflects the real, single-Vercel-hop configuration.
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(correlationId());
    app.use(retrospectiveRouter(deps));
    app.use(notFoundHandler());
    app.use(errorHandler());
    return { app, deps };
}

export function sessionCookieFor(uid: string): string {
    return `rr_session=${encodeURIComponent(`session-${uid}`)}`;
}
