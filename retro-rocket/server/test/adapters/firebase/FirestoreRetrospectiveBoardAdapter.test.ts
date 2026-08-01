import { describe, it, expect } from 'vitest';
import { toDate, toRetrospective, toParticipant, toTimer, chunk } from '../../../src/adapters/firebase/FirestoreRetrospectiveBoardAdapter';

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
