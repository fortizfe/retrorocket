import { describe, it, expect } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { toDate, toRetrospective, toParticipant, toTimer, chunk, FirestoreRetrospectiveBoardAdapter } from '../../../src/adapters/firebase/FirestoreRetrospectiveBoardAdapter';
import { ForbiddenError } from '../../../src/domain/errors';

// FirestoreRetrospectiveBoardAdapter's query/write composition (getRetrospective, join's
// idempotency, timer control's facilitator-only guard, renameParticipantsForUser's fan-out)
// is exercised end-to-end by the Playwright E2E suite against the Firestore emulator,
// consistent with FirestoreBoardsAdapter/FirestoreProfileAdapter having no dedicated
// Vitest-level Firestore mock. Only this adapter's pure mapping/chunking helpers are
// unit-tested here.

describe('toDate', () => {
    it('unwraps a Firestore Timestamp-like value via .toDate()', () => {
        const timestamp = { toDate: () => new Date('2026-01-01T00:00:00Z') };
        expect(toDate(timestamp)).toEqual(new Date('2026-01-01T00:00:00Z'));
    });

    it('passes through a plain Date unchanged', () => {
        const date = new Date('2026-02-02T00:00:00Z');
        expect(toDate(date)).toBe(date);
    });
});

describe('toRetrospective', () => {
    const data = {
        title: 'Sprint 12 Retro',
        createdBy: 'facilitator-uid',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        participantCount: 3,
        isActive: true,
    };

    it('maps a Firestore document into a RetrospectiveDTO', () => {
        expect(toRetrospective('r1', data)).toMatchObject({ id: 'r1', title: 'Sprint 12 Retro', createdBy: 'facilitator-uid' });
    });

    it('defaults columnGroupingStates to an empty object when absent (data-model.md gap)', () => {
        expect(toRetrospective('r1', data).columnGroupingStates).toEqual({});
    });

    it('preserves a present columnGroupingStates value', () => {
        const withGrouping = { ...data, columnGroupingStates: { col1: { criteria: 'user', activeGroups: ['g1'] } } };
        expect(toRetrospective('r1', withGrouping).columnGroupingStates).toEqual({ col1: { criteria: 'user', activeGroups: ['g1'] } });
    });

    // 051-anonymous-board-mode, data-model.md: isAnonymous defaults to false for
    // boards written before this field existed, mirroring the columnGroupingStates
    // gap-fallback pattern above.
    it('defaults isAnonymous to false when absent (data-model.md gap)', () => {
        expect(toRetrospective('r1', data).isAnonymous).toBe(false);
    });

    it('preserves a present isAnonymous value', () => {
        const withAnonymous = { ...data, isAnonymous: true };
        expect(toRetrospective('r1', withAnonymous).isAnonymous).toBe(true);
    });
});

describe('toParticipant', () => {
    it('maps a Firestore document into a ParticipantDTO, defaulting photoURL to null', () => {
        const data = { name: 'Alice', userId: 'u1', retrospectiveId: 'r1', joinedAt: new Date(), isActive: true };
        expect(toParticipant('p1', data)).toMatchObject({ id: 'p1', name: 'Alice', userId: 'u1', photoURL: null });
    });

    it('preserves a present photoURL', () => {
        const data = { name: 'Alice', userId: 'u1', retrospectiveId: 'r1', joinedAt: new Date(), isActive: true, photoURL: 'https://x/y.png' };
        expect(toParticipant('p1', data).photoURL).toBe('https://x/y.png');
    });
});

describe('chunk', () => {
    it('returns a single chunk when the input is within the chunk size', () => {
        expect(chunk([1, 2, 3], 500)).toEqual([[1, 2, 3]]);
    });

    it('returns no chunks for an empty array', () => {
        expect(chunk([], 500)).toEqual([]);
    });

    it('splits an input larger than the chunk size into multiple chunks of at most that size (Firestore\'s 500-write batch limit)', () => {
        const items = Array.from({ length: 1201 }, (_, i) => i);
        const chunks = chunk(items, 500);
        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toHaveLength(500);
        expect(chunks[1]).toHaveLength(500);
        expect(chunks[2]).toHaveLength(201);
        expect(chunks.flat()).toEqual(items);
    });
});

describe('toTimer', () => {
    it('maps a Firestore countdown_timers document into a CountdownTimerDTO', () => {
        const data = {
            startTime: null,
            duration: 300,
            originalDuration: 300,
            isRunning: false,
            isPaused: false,
            endTime: null,
            createdBy: 'facilitator-uid',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        expect(toTimer('r1', data)).toMatchObject({ retrospectiveId: 'r1', duration: 300, isRunning: false });
    });
});

// 051-anonymous-board-mode, US3, T043 (red phase): setAnonymous() does not exist on
// FirestoreRetrospectiveBoardAdapter yet (T048/T049) — this deliberately deviates from
// this file's stated "no dedicated Firestore mock, pure-helpers-only" convention above,
// because setAnonymous's facilitator-only guard + persist-and-return behavior (unlike
// toDate/toRetrospective/toParticipant/chunk) cannot be expressed as a pure function: it
// needs to read one doc (requireFacilitator) and write it back. A tiny in-memory
// Firestore-chain fake (collection().doc().get()/update()/set()) is introduced here,
// scoped to only this describe block, to make that testable without a real emulator.
function createFakeDb(seed: Record<string, Record<string, unknown>>): Firestore {
    const store = new Map<string, Record<string, unknown>>(Object.entries(seed).map(([key, value]) => [key, { ...value }]));
    return {
        collection: (name: string) => ({
            doc: (id: string) => {
                const key = `${name}/${id}`;
                return {
                    get: async () => ({
                        exists: store.has(key),
                        data: () => store.get(key),
                    }),
                    update: async (updates: Record<string, unknown>) => {
                        store.set(key, { ...(store.get(key) ?? {}), ...updates });
                    },
                    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
                        store.set(key, opts?.merge ? { ...(store.get(key) ?? {}), ...data } : data);
                    },
                };
            },
        }),
    } as unknown as Firestore;
}

describe('FirestoreRetrospectiveBoardAdapter.setAnonymous (T043, not yet implemented)', () => {
    it('throws ForbiddenError when uid is not the board facilitator', async () => {
        const db = createFakeDb({
            'retrospectives/r1': {
                title: 'Sprint 12 Retro',
                createdBy: 'facilitator-uid',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 1,
                isActive: true,
            },
        });
        const adapter = new FirestoreRetrospectiveBoardAdapter(db);

        await expect(adapter.setAnonymous('r1', 'someone-else', true)).rejects.toThrow(ForbiddenError);
    });

    it('persists and returns the new isAnonymous value when uid is the facilitator', async () => {
        const db = createFakeDb({
            'retrospectives/r1': {
                title: 'Sprint 12 Retro',
                createdBy: 'facilitator-uid',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 1,
                isActive: true,
                isAnonymous: false,
            },
        });
        const adapter = new FirestoreRetrospectiveBoardAdapter(db);

        const result = await adapter.setAnonymous('r1', 'facilitator-uid', true);
        expect(result).toMatchObject({ id: 'r1', isAnonymous: true });

        const refetched = await adapter.getRetrospective('r1');
        expect(refetched?.isAnonymous).toBe(true);
    });
});
