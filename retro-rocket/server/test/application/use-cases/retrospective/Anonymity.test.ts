import { describe, it, expect } from 'vitest';
import { setAnonymity } from '../../../../src/application/use-cases/retrospective/Anonymity';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { ForbiddenError } from '../../../../src/domain/errors';

// 051-anonymous-board-mode, US3, T044 (red phase): Anonymity.ts does not exist yet
// (T050) — this file mirrors Timer.test.ts's configureTimer suite exactly (seedStore
// helper, describe block, ForbiddenError assertion) for the new setAnonymity use-case,
// which is expected to be a thin delegate to
// deps.retrospectiveBoardPort.setAnonymous(retrospectiveId, uid, isAnonymous).

function seedStore() {
    return createRetrospectiveFakeStore({
        retrospectives: [
            {
                id: 'r1',
                title: 'Board',
                createdBy: 'facilitator-uid',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 1,
                isActive: true,
                columnGroupingStates: {},
                isAnonymous: false,
            },
        ],
    });
}

describe('setAnonymity', () => {
    it('delegates to retrospectiveBoardPort.setAnonymous and returns its result', async () => {
        const { retrospectiveBoardPort } = seedStore();

        const result = await setAnonymity({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid', isAnonymous: true });

        expect(result).toMatchObject({ id: 'r1', isAnonymous: true });
        // Confirms the change was actually persisted through the port, not just
        // returned — i.e. this really delegates rather than short-circuiting.
        const refetched = await retrospectiveBoardPort.getRetrospective('r1');
        expect(refetched?.isAnonymous).toBe(true);
    });

    it('rejects a non-facilitator with ForbiddenError', async () => {
        const { retrospectiveBoardPort } = seedStore();

        await expect(setAnonymity({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'someone-else', isAnonymous: true })).rejects.toThrow(ForbiddenError);
    });
});
