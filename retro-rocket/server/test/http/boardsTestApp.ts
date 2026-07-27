import express, { type Express } from 'express';
import { vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { correlationId } from '../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../src/http/middleware/errorHandler';
import { boardsRouter, type BoardsRouterDeps } from '../../src/http/routes/boards';
import type { ClockPort, SessionServicePort } from '../../src/application/ports';
import type { PublicUser } from '../../src/domain/auth/types';
import type { BoardWithColumns, Participant } from '../../src/application/ports/boards';
import type { Card, CardGroup } from '../../src/application/ports/cards';
import type { ActionItem, CountdownTimer, FacilitatorNote, SentimentResult } from '../../src/application/ports/facilitator';
import { inMemoryBoardStore, inMemoryParticipantStore } from '../application/use-cases/boards/fakes';
import { inMemoryCardGroupStore, inMemoryCardStore, inMemoryTypingStore } from '../application/use-cases/boards/cardFakes';
import {
    inMemoryActionItemStore,
    inMemoryCountdownStore,
    inMemoryFacilitatorNotesStore,
    inMemorySentimentStore,
} from '../application/use-cases/boards/facilitatorFakes';

export const NOW = 1_700_000_000;

export function fixedClock(now = NOW): ClockPort {
    return { nowSeconds: () => now };
}

/** Generic fake: token "session-<uid>" verifies as a session carrying the given user. */
export function fakeSessionServiceForUser(user: PublicUser): SessionServicePort {
    return {
        issue: vi.fn(),
        verify: vi.fn(async (token: string) => {
            if (token !== `session-${user.uid}`) return null;
            return { data: { sub: user.uid, user } } as never;
        }),
        refresh: vi.fn(),
    };
}

export function sessionCookieFor(uid: string): string {
    return `rr_session=${encodeURIComponent(`session-${uid}`)}`;
}

export function defaultUser(overrides: Partial<PublicUser> = {}): PublicUser {
    return {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'Ana',
        photoURL: null,
        providers: ['google'],
        primaryProvider: 'google',
        createdAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

export interface BoardsTestAppOptions {
    signedInUser?: PublicUser;
    boards?: BoardWithColumns[];
    participants?: Participant[];
    cards?: Card[];
    groups?: CardGroup[];
    countdownTimers?: CountdownTimer[];
    notes?: FacilitatorNote[];
    actionItems?: ActionItem[];
    sentimentResults?: SentimentResult[];
    overrides?: Partial<BoardsRouterDeps>;
}

/**
 * Test-app helper for the boards router (mirrors mcpTestApp.ts). Builds a fully-wired
 * Express app from in-memory fakes — no live Firestore/emulator needed. `db` is an
 * unused stub here since only the SSE `/events` route touches it directly, and that
 * route is exercised by the dedicated FirestoreRealtimeRelay/boardsEvents unit tests instead.
 */
export function buildBoardsTestApp(options: BoardsTestAppOptions = {}): { app: Express; deps: BoardsRouterDeps; user: PublicUser } {
    const user = options.signedInUser ?? defaultUser();
    const boardStore = inMemoryBoardStore(options.boards ?? []);
    const participantStore = inMemoryParticipantStore(options.participants ?? []);

    const deps: BoardsRouterDeps = {
        db: {} as Firestore,
        boardReadPort: boardStore,
        boardWritePort: boardStore,
        participantPort: participantStore,
        cardPort: inMemoryCardStore(options.cards ?? []),
        cardGroupPort: inMemoryCardGroupStore(options.groups ?? []),
        typingPort: inMemoryTypingStore(),
        countdownPort: inMemoryCountdownStore(fixedClock(), options.countdownTimers ?? []),
        facilitatorNotesPort: inMemoryFacilitatorNotesStore(options.notes ?? []),
        actionItemPort: inMemoryActionItemStore(options.actionItems ?? []),
        sentimentPort: inMemorySentimentStore(options.sentimentResults ?? []),
        sessionService: fakeSessionServiceForUser(user),
        clock: fixedClock(),
        ...options.overrides,
    };

    const app = express();
    app.use(express.json());
    app.use(correlationId());
    app.use(boardsRouter(deps));
    app.use(notFoundHandler());
    app.use(errorHandler());
    return { app, deps, user };
}
