import { describe, it, expect, vi } from 'vitest';
import { joinRetrospective } from '../../../../src/application/use-cases/retrospective/JoinRetrospective';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { NotFoundError } from '../../../../src/domain/errors';

function board(overrides: Partial<import('./retrospectiveFakes').FakeRetrospectiveRecord> = {}) {
    return {
        id: 'r1',
        title: 'Sprint Retro',
        createdBy: 'facilitator-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        columnGroupingStates: {},
        ...overrides,
    };
}

describe('joinRetrospective', () => {
    it('creates a new participant record for a first-time joiner', async () => {
        const store = createRetrospectiveFakeStore({ retrospectives: [board()] });
        const participant = await joinRetrospective({ ...store }, { retrospectiveId: 'r1', uid: 'u1', userName: 'Alice', photoURL: null });
        expect(participant.userId).toBe('u1');
        expect(participant.retrospectiveId).toBe('r1');
    });

    it('is idempotent — a second join for the same uid does not duplicate the participant record', async () => {
        const store = createRetrospectiveFakeStore({ retrospectives: [board()] });
        const first = await joinRetrospective({ ...store }, { retrospectiveId: 'r1', uid: 'u1', userName: 'Alice', photoURL: null });
        const second = await joinRetrospective({ ...store }, { retrospectiveId: 'r1', uid: 'u1', userName: 'Alice', photoURL: null });
        expect(second.id).toBe(first.id);

        const all = await store.participantPort.listParticipants('r1');
        expect(all.filter((p) => p.userId === 'u1')).toHaveLength(1);
    });

    it('throws NotFoundError for a nonexistent board', async () => {
        const store = createRetrospectiveFakeStore();
        await expect(joinRetrospective({ ...store }, { retrospectiveId: 'missing', uid: 'u1', userName: 'Alice', photoURL: null })).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError for an inactive board', async () => {
        const store = createRetrospectiveFakeStore({ retrospectives: [board({ isActive: false })] });
        await expect(joinRetrospective({ ...store }, { retrospectiveId: 'r1', uid: 'u1', userName: 'Alice', photoURL: null })).rejects.toThrow(NotFoundError);
    });

    it('passes the board it already fetched through to participantPort.join, so a conforming adapter never needs a second existence read (FR-001)', async () => {
        const store = createRetrospectiveFakeStore({ retrospectives: [board()] });
        const joinSpy = vi.spyOn(store.participantPort, 'join');

        await joinRetrospective({ ...store }, { retrospectiveId: 'r1', uid: 'u1', userName: 'Alice', photoURL: null });

        expect(joinSpy).toHaveBeenCalledTimes(1);
        const [, , , , knownBoard] = joinSpy.mock.calls[0];
        expect(knownBoard).toMatchObject({ id: 'r1', isActive: true });
    });
});
