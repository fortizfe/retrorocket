import { describe, it, expect } from 'vitest';
import { toOp, toEntityChangeEvent, isVisibleToConnection, serializeFirestoreValue, computeSweepDelayMs } from '../../../src/adapters/firebase/FirestoreRealtimeGatewayAdapter';

// FirestoreRealtimeGatewayAdapter's per-board reference-counted onSnapshot listener
// lifecycle and its WebSocket relay wiring are exercised end-to-end by the Playwright
// E2E suite against the Firestore emulator (e2e/retrospective-board.spec.ts's synthetic
// live-relay check), consistent with FirestoreBoardsAdapter/FirestoreProfileAdapter
// having no dedicated Vitest-level Firestore mock. Only this adapter's pure translation
// helpers (Firestore docChanges() type -> entity_change op, facilitatorNote per-
// connection visibility filter) are unit-tested directly here.

describe('toOp', () => {
    it('maps added -> created', () => {
        expect(toOp('added')).toBe('created');
    });

    it('maps modified -> updated', () => {
        expect(toOp('modified')).toBe('updated');
    });

    it('maps removed -> deleted', () => {
        expect(toOp('removed')).toBe('deleted');
    });
});

describe('toEntityChangeEvent', () => {
    it('builds a created event with the full entity data attached, including the doc id (mirrors the REST GET shape)', () => {
        const event = toEntityChangeEvent('card', 'added', 'card-1', { content: 'hi' });
        expect(event).toEqual({ type: 'entity_change', entity: 'card', op: 'created', id: 'card-1', data: { id: 'card-1', content: 'hi' } });
    });

    it('builds an updated event with the current entity data attached', () => {
        const event = toEntityChangeEvent('group', 'modified', 'group-1', { title: 'x' });
        expect(event).toEqual({ type: 'entity_change', entity: 'group', op: 'updated', id: 'group-1', data: { id: 'group-1', title: 'x' } });
    });

    it('serializes Firestore Timestamp-like fields in data to ISO strings', () => {
        const createdAt = { toDate: () => new Date('2026-01-01T00:00:00Z') };
        const event = toEntityChangeEvent('card', 'added', 'card-1', { content: 'hi', createdAt });
        expect(event).toMatchObject({ data: { createdAt: '2026-01-01T00:00:00.000Z' } });
    });

    it('omits data entirely for a deleted event', () => {
        const event = toEntityChangeEvent('actionItem', 'removed', 'ai-1', { content: 'gone' });
        expect(event).toEqual({ type: 'entity_change', entity: 'actionItem', op: 'deleted', id: 'ai-1' });
        expect(event).not.toHaveProperty('data');
    });
});

describe('serializeFirestoreValue', () => {
    it('converts a Timestamp-like value to an ISO string', () => {
        const timestamp = { toDate: () => new Date('2026-01-01T00:00:00Z') };
        expect(serializeFirestoreValue(timestamp)).toBe('2026-01-01T00:00:00.000Z');
    });

    it('converts a plain Date to an ISO string', () => {
        expect(serializeFirestoreValue(new Date('2026-02-02T00:00:00Z'))).toBe('2026-02-02T00:00:00.000Z');
    });

    it('recurses into arrays (e.g. a card\'s likes/reactions)', () => {
        const timestamp = { toDate: () => new Date('2026-01-01T00:00:00Z') };
        expect(serializeFirestoreValue([{ userId: 'u1', timestamp }])).toEqual([{ userId: 'u1', timestamp: '2026-01-01T00:00:00.000Z' }]);
    });

    it('recurses into nested plain objects', () => {
        const timestamp = { toDate: () => new Date('2026-01-01T00:00:00Z') };
        expect(serializeFirestoreValue({ nested: { timestamp } })).toEqual({ nested: { timestamp: '2026-01-01T00:00:00.000Z' } });
    });

    it('passes through primitives unchanged', () => {
        expect(serializeFirestoreValue('x')).toBe('x');
        expect(serializeFirestoreValue(42)).toBe(42);
        expect(serializeFirestoreValue(true)).toBe(true);
        expect(serializeFirestoreValue(null)).toBe(null);
    });
});

describe('isVisibleToConnection', () => {
    it('is always visible for non-facilitatorNote entities regardless of uid', () => {
        expect(isVisibleToConnection('card', { createdBy: 'someone-else' }, 'viewer-uid')).toBe(true);
        expect(isVisibleToConnection('participant', undefined, 'viewer-uid')).toBe(true);
    });

    it('is visible for a facilitatorNote only when facilitatorId matches the connection uid', () => {
        expect(isVisibleToConnection('facilitatorNote', { facilitatorId: 'fac-1' }, 'fac-1')).toBe(true);
    });

    it('is not visible for a facilitatorNote authored by a different facilitator', () => {
        expect(isVisibleToConnection('facilitatorNote', { facilitatorId: 'fac-1' }, 'fac-2')).toBe(false);
    });

    it('is not visible for a facilitatorNote when data is unavailable', () => {
        expect(isVisibleToConnection('facilitatorNote', undefined, 'fac-1')).toBe(false);
    });
});

// 040, US2: the typing-status sweep moved from an unconditional 500ms setInterval to
// an event-driven setTimeout scheduled from the observed write. computeSweepDelayMs is
// the pure decision logic behind that scheduling — how long to wait, from "now", before
// the TTL-based staleness sweep should fire for a given write.
describe('computeSweepDelayMs', () => {
    it('returns the full TTL when the write just happened', () => {
        const writeTimestamp = new Date('2026-01-01T00:00:00.000Z');
        const now = new Date('2026-01-01T00:00:00.000Z');
        expect(computeSweepDelayMs(writeTimestamp, now, 3000)).toBe(3000);
    });

    it('returns the remaining time when some of the TTL has already elapsed', () => {
        const writeTimestamp = new Date('2026-01-01T00:00:00.000Z');
        const now = new Date('2026-01-01T00:00:01.000Z');
        expect(computeSweepDelayMs(writeTimestamp, now, 3000)).toBe(2000);
    });

    it('clamps to 0 once the TTL has already fully elapsed', () => {
        const writeTimestamp = new Date('2026-01-01T00:00:00.000Z');
        const now = new Date('2026-01-01T00:00:05.000Z');
        expect(computeSweepDelayMs(writeTimestamp, now, 3000)).toBe(0);
    });

    it('clamps to 0 exactly at the TTL boundary', () => {
        const writeTimestamp = new Date('2026-01-01T00:00:00.000Z');
        const now = new Date('2026-01-01T00:00:03.000Z');
        expect(computeSweepDelayMs(writeTimestamp, now, 3000)).toBe(0);
    });
});
