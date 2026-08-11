import { describe, it, expect } from 'vitest';
import { RedisFailOpenTracker } from '../../../../src/adapters/firebase/redis/RedisFailOpenTracker';

// Pure per-board health-state tracking behind the fail-open behavior required by
// FR-008a/contracts/redis-coordination-protocol.md's Failure semantics: a board starts
// (and defaults back to) 'coordinated'; a failed Redis operation for that board marks
// it 'degraded' (triggering the caller's fallback to direct Firestore listeners); a
// later successful operation marks it 'recovered' back to 'coordinated' (triggering the
// caller to tear down the temporary direct listeners). The actual Redis calls and
// Firestore listener lifecycle live in CoordinatedRealtimeGatewayAdapter, which is
// E2E-verified per this codebase's established convention; this tracker's decision
// logic is pure and fully unit-tested here.

describe('RedisFailOpenTracker', () => {
    it('defaults an unknown board to coordinated', () => {
        const tracker = new RedisFailOpenTracker();
        expect(tracker.getState('board-1')).toBe('coordinated');
    });

    it('marks a board degraded on its first recorded failure', () => {
        const tracker = new RedisFailOpenTracker();

        const result = tracker.recordFailure('board-1');

        expect(result).toEqual({ state: 'degraded', transitioned: true });
        expect(tracker.getState('board-1')).toBe('degraded');
    });

    it('does not report a transition on a second consecutive failure (already degraded)', () => {
        const tracker = new RedisFailOpenTracker();
        tracker.recordFailure('board-1');

        const result = tracker.recordFailure('board-1');

        expect(result).toEqual({ state: 'degraded', transitioned: false });
    });

    it('reports a recovery transition when a success follows a failure', () => {
        const tracker = new RedisFailOpenTracker();
        tracker.recordFailure('board-1');

        const result = tracker.recordSuccess('board-1');

        expect(result).toEqual({ state: 'coordinated', transitioned: true });
        expect(tracker.getState('board-1')).toBe('coordinated');
    });

    it('does not report a transition on success when already coordinated', () => {
        const tracker = new RedisFailOpenTracker();

        const result = tracker.recordSuccess('board-1');

        expect(result).toEqual({ state: 'coordinated', transitioned: false });
    });

    it('tracks each board independently', () => {
        const tracker = new RedisFailOpenTracker();
        tracker.recordFailure('board-1');

        expect(tracker.getState('board-1')).toBe('degraded');
        expect(tracker.getState('board-2')).toBe('coordinated');
    });

    it('clear() resets a board back to the default coordinated state', () => {
        const tracker = new RedisFailOpenTracker();
        tracker.recordFailure('board-1');

        tracker.clear('board-1');

        expect(tracker.getState('board-1')).toBe('coordinated');
    });
});
