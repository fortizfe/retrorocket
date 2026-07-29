import { describe, it, expect } from 'vitest';
import { configureTimer, startTimer, pauseTimer, resetTimer, deleteTimer } from '../../../../src/application/use-cases/retrospective/Timer';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { ForbiddenError } from '../../../../src/domain/errors';

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
            },
        ],
    });
}

describe('configureTimer', () => {
    it('creates a timer for the facilitator', async () => {
        const { retrospectiveBoardPort } = seedStore();
        const timer = await configureTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid', duration: 300 });
        expect(timer).toMatchObject({ retrospectiveId: 'r1', duration: 300, originalDuration: 300, isRunning: false });
    });

    it('rejects a non-facilitator with ForbiddenError', async () => {
        const { retrospectiveBoardPort } = seedStore();
        await expect(configureTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'someone-else', duration: 300 })).rejects.toThrow(ForbiddenError);
    });
});

describe('startTimer/pauseTimer/resetTimer/deleteTimer', () => {
    it('start/pause/reset/delete the facilitator-configured timer', async () => {
        const { retrospectiveBoardPort } = seedStore();
        await configureTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid', duration: 300 });

        const started = await startTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid' });
        expect(started.isRunning).toBe(true);

        const paused = await pauseTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid' });
        expect(paused.isRunning).toBe(false);
        expect(paused.isPaused).toBe(true);

        const reset = await resetTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid' });
        expect(reset.isPaused).toBe(false);
        expect(reset.duration).toBe(300);

        await deleteTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid' });
        expect(await retrospectiveBoardPort.getTimer('r1')).toBeNull();
    });

    it('rejects a non-facilitator start/pause/reset/delete with ForbiddenError', async () => {
        const { retrospectiveBoardPort } = seedStore();
        await configureTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'facilitator-uid', duration: 300 });

        await expect(startTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'intruder' })).rejects.toThrow(ForbiddenError);
        await expect(pauseTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'intruder' })).rejects.toThrow(ForbiddenError);
        await expect(resetTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'intruder' })).rejects.toThrow(ForbiddenError);
        await expect(deleteTimer({ retrospectiveBoardPort }, { retrospectiveId: 'r1', uid: 'intruder' })).rejects.toThrow(ForbiddenError);
    });
});
