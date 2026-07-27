import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { handleBoardEvents, type BoardsRouterDeps } from '../../../src/http/routes/boards';
import { NotFoundError } from '../../../src/domain/errors';
import { inMemoryBoardStore, inMemoryParticipantStore } from '../../application/use-cases/boards/fakes';
import { inMemoryCardGroupStore, inMemoryCardStore, inMemoryTypingStore } from '../../application/use-cases/boards/cardFakes';
import {
    inMemoryActionItemStore,
    inMemoryCountdownStore,
    inMemoryFacilitatorNotesStore,
    inMemorySentimentStore,
} from '../../application/use-cases/boards/facilitatorFakes';
import { fixedClock, fakeSessionServiceForUser, defaultUser } from '../boardsTestApp';
import type { BoardWithColumns } from '../../../src/application/ports/boards';

const ACTIVE_BOARD: BoardWithColumns = {
    id: 'b1',
    title: 'Sprint 42 Retro',
    templateId: 'default',
    createdBy: 'u1',
    createdByName: 'Ana',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 0,
    isActive: true,
    columns: [],
};

function fakeFirestore(): Firestore {
    const querySnapshot = {
        onSnapshot: (onData: (snap: { docs: unknown[] }) => void) => {
            onData({ docs: [] });
            return () => {};
        },
        where: () => querySnapshot,
    };
    return {
        collection: () => ({
            doc: () => ({
                get: async () => ({ exists: false, data: () => undefined }),
                onSnapshot: (onData: (snap: { exists: boolean; data: () => unknown }) => void) => {
                    onData({ exists: true, data: () => ({ createdBy: 'u1', title: 'X', createdAt: new Date(), updatedAt: new Date() }) });
                    return () => {};
                },
            }),
            where: () => querySnapshot,
        }),
    } as unknown as Firestore;
}

function fakeReq(boardId: string): Request & EventEmitter {
    const emitter = new EventEmitter();
    return Object.assign(emitter, { params: { id: boardId } }) as unknown as Request & EventEmitter;
}

function fakeRes(uid: string): { res: Response; writes: string[] } {
    const writes: string[] = [];
    const res = {
        locals: { uid, user: defaultUser({ uid }) },
        setHeader: () => {},
        flushHeaders: () => {},
        write: (chunk: string) => {
            writes.push(chunk);
            return true;
        },
    } as unknown as Response;
    return { res, writes };
}

function buildDeps(boards: BoardWithColumns[], participants: Parameters<typeof inMemoryParticipantStore>[0] = []): BoardsRouterDeps {
    const boardStore = inMemoryBoardStore(boards);
    return {
        db: fakeFirestore(),
        boardReadPort: boardStore,
        boardWritePort: boardStore,
        participantPort: inMemoryParticipantStore(participants),
        cardPort: inMemoryCardStore(),
        cardGroupPort: inMemoryCardGroupStore(),
        typingPort: inMemoryTypingStore(),
        countdownPort: inMemoryCountdownStore(fixedClock()),
        facilitatorNotesPort: inMemoryFacilitatorNotesStore(),
        actionItemPort: inMemoryActionItemStore(),
        sentimentPort: inMemorySentimentStore(),
        sessionService: fakeSessionServiceForUser(defaultUser({ uid: 'u1' })),
        clock: fixedClock(),
    };
}

describe('handleBoardEvents (GET /api/boards/:id/events)', () => {
    it('sends an initial snapshot event for an authorized requester', async () => {
        const deps = buildDeps([ACTIVE_BOARD]);
        const req = fakeReq('b1');
        const { res, writes } = fakeRes('u1');

        await handleBoardEvents(deps, req, res);

        expect(writes[0]).toContain('event: snapshot');
        expect(writes.some((w) => w.startsWith('event: board'))).toBe(true);
        expect(writes.some((w) => w.startsWith('event: participants'))).toBe(true);
    });

    it('cleans up its Firestore listeners when the request closes', async () => {
        const deps = buildDeps([ACTIVE_BOARD]);
        const req = fakeReq('b1');
        const { res } = fakeRes('u1');

        await handleBoardEvents(deps, req, res);
        expect(() => req.emit('close')).not.toThrow();
    });

    it('rejects with NotFoundError for a requester who is not a participant or creator', async () => {
        const deps = buildDeps([ACTIVE_BOARD]);
        const req = fakeReq('b1');
        const { res } = fakeRes('stranger');

        await expect(handleBoardEvents(deps, req, res)).rejects.toThrow(NotFoundError);
    });

    it('rejects with NotFoundError for a nonexistent board', async () => {
        const deps = buildDeps([]);
        const req = fakeReq('missing');
        const { res } = fakeRes('u1');

        await expect(handleBoardEvents(deps, req, res)).rejects.toThrow(NotFoundError);
    });

    it('includes cards, groups, and typing in the initial snapshot', async () => {
        const deps = buildDeps([ACTIVE_BOARD]);
        const req = fakeReq('b1');
        const { res, writes } = fakeRes('u1');

        await handleBoardEvents(deps, req, res);

        const snapshotLine = writes.find((w) => w.startsWith('event: snapshot'))!;
        const data = JSON.parse(snapshotLine.split('data: ')[1]);
        expect(data).toHaveProperty('cards');
        expect(data).toHaveProperty('groups');
        expect(data).toHaveProperty('typing');
    });

    it('marks the connecting participant active on connect and inactive on disconnect', async () => {
        const participantStore = inMemoryParticipantStore([]);
        const { participant } = await participantStore.addParticipant({ retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null });

        const deps: BoardsRouterDeps = { ...buildDeps([ACTIVE_BOARD]), participantPort: participantStore };
        const req = fakeReq('b1');
        const { res } = fakeRes('u2');

        await handleBoardEvents(deps, req, res);
        expect((await participantStore.getParticipantByUser('b1', 'u2'))?.isActive).toBe(true);

        req.emit('close');
        expect((await participantStore.getParticipantByUser('b1', 'u2'))?.isActive).toBe(false);
        void participant;
    });

    it('skips presence marking when the requester has no participant record (e.g. the creator)', async () => {
        const deps = buildDeps([ACTIVE_BOARD]);
        const req = fakeReq('b1');
        const { res } = fakeRes('u1');

        await expect(handleBoardEvents(deps, req, res)).resolves.toBeUndefined();
        expect(() => req.emit('close')).not.toThrow();
    });

    it('includes countdown/actionItems/sentiment in the initial snapshot for every participant', async () => {
        const deps = buildDeps([ACTIVE_BOARD]);
        const req = fakeReq('b1');
        const { res, writes } = fakeRes('u1');

        await handleBoardEvents(deps, req, res);

        const snapshotLine = writes.find((w) => w.startsWith('event: snapshot'))!;
        const data = JSON.parse(snapshotLine.split('data: ')[1]);
        expect(data).toHaveProperty('countdown');
        expect(data).toHaveProperty('actionItems');
        expect(data).toHaveProperty('sentiment');
    });

    it("includes notes in the snapshot for the facilitator's own connection (uid == retrospective.createdBy)", async () => {
        const deps = buildDeps([ACTIVE_BOARD]);
        const req = fakeReq('b1');
        const { res, writes } = fakeRes('u1');

        await handleBoardEvents(deps, req, res);

        const snapshotLine = writes.find((w) => w.startsWith('event: snapshot'))!;
        const data = JSON.parse(snapshotLine.split('data: ')[1]);
        expect(data).toHaveProperty('notes');
        expect(writes.some((w) => w.startsWith('event: notes'))).toBe(true);
    });

    it("omits notes entirely (not even empty) for a non-facilitator connection — research.md §1's closed dead-rule finding", async () => {
        const participantStore = inMemoryParticipantStore([
            { id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true },
        ]);
        const deps: BoardsRouterDeps = { ...buildDeps([ACTIVE_BOARD]), participantPort: participantStore };
        const req = fakeReq('b1');
        const { res, writes } = fakeRes('u2');

        await handleBoardEvents(deps, req, res);

        const snapshotLine = writes.find((w) => w.startsWith('event: snapshot'))!;
        const data = JSON.parse(snapshotLine.split('data: ')[1]);
        expect(data).not.toHaveProperty('notes');
        expect(writes.some((w) => w.startsWith('event: notes'))).toBe(false);
    });
});
