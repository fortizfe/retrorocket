import { describe, expect, it } from 'vitest';
import { createOrUpdateCountdown } from '../../../../src/application/use-cases/boards/CreateOrUpdateCountdown';
import { startCountdown } from '../../../../src/application/use-cases/boards/StartCountdown';
import { pauseCountdown } from '../../../../src/application/use-cases/boards/PauseCountdown';
import { resetCountdown } from '../../../../src/application/use-cases/boards/ResetCountdown';
import { deleteCountdown } from '../../../../src/application/use-cases/boards/DeleteCountdown';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore } from './fakes';
import { inMemoryCountdownStore } from './facilitatorFakes';
import type { BoardWithColumns } from '../../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1',
    title: 'Sprint 42 Retro',
    templateId: 'default',
    createdBy: 'facilitator-1',
    createdByName: 'Ana',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 1,
    isActive: true,
    columns: [],
};

let nowSeconds = 1_700_000_000;
const clock = { nowSeconds: () => nowSeconds };

describe('createOrUpdateCountdown', () => {
    it('creates a timer for the facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);

        const timer = await createOrUpdateCountdown({ boardReadPort: boardStore, countdownPort }, { boardId: 'b1', requesterUid: 'facilitator-1', duration: 300 });

        expect(timer.duration).toBe(300);
        expect(timer.originalDuration).toBe(300);
        expect(timer.isRunning).toBe(false);
    });

    it('rejects a non-facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);

        await expect(
            createOrUpdateCountdown({ boardReadPort: boardStore, countdownPort }, { boardId: 'b1', requesterUid: 'u2', duration: 300 }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a nonexistent board', async () => {
        const boardStore = inMemoryBoardStore([]);
        const countdownPort = inMemoryCountdownStore(clock);

        await expect(
            createOrUpdateCountdown({ boardReadPort: boardStore, countdownPort }, { boardId: 'missing', requesterUid: 'facilitator-1', duration: 300 }),
        ).rejects.toThrow(NotFoundError);
    });
});

describe('startCountdown / pauseCountdown / resetCountdown', () => {
    it('starts, then computes remaining duration correctly on pause (last-write-wins, FR-014)', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);
        const deps = { boardReadPort: boardStore, countdownPort };

        await createOrUpdateCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1', duration: 100 });
        const started = await startCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1' });
        expect(started.isRunning).toBe(true);
        expect(started.startTime).not.toBeNull();

        nowSeconds += 40;
        const paused = await pauseCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1' });
        expect(paused.isRunning).toBe(false);
        expect(paused.isPaused).toBe(true);
        expect(paused.duration).toBe(60);
    });

    it('resets duration back to the original value', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);
        const deps = { boardReadPort: boardStore, countdownPort };

        await createOrUpdateCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1', duration: 100 });
        await startCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1' });
        nowSeconds += 40;
        await pauseCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1' });

        const reset = await resetCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1' });
        expect(reset.duration).toBe(100);
        expect(reset.isPaused).toBe(false);
        expect(reset.isRunning).toBe(false);
    });

    it('rejects pausing a timer that is not running', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);
        const deps = { boardReadPort: boardStore, countdownPort };

        await createOrUpdateCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1', duration: 100 });

        await expect(pauseCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1' })).rejects.toThrow('Timer is not running');
    });

    it('rejects a non-facilitator starting/pausing/resetting the timer', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);
        const deps = { boardReadPort: boardStore, countdownPort };
        await createOrUpdateCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1', duration: 100 });

        await expect(startCountdown(deps, { boardId: 'b1', requesterUid: 'u2' })).rejects.toThrow(ForbiddenError);
        await expect(pauseCountdown(deps, { boardId: 'b1', requesterUid: 'u2' })).rejects.toThrow(ForbiddenError);
        await expect(resetCountdown(deps, { boardId: 'b1', requesterUid: 'u2' })).rejects.toThrow(ForbiddenError);
    });
});

describe('deleteCountdown', () => {
    it('removes the timer for the facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);
        const deps = { boardReadPort: boardStore, countdownPort };
        await createOrUpdateCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1', duration: 100 });

        await deleteCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1' });

        expect(await countdownPort.getTimer('b1')).toBeNull();
    });

    it('rejects a non-facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const countdownPort = inMemoryCountdownStore(clock);
        const deps = { boardReadPort: boardStore, countdownPort };
        await createOrUpdateCountdown(deps, { boardId: 'b1', requesterUid: 'facilitator-1', duration: 100 });

        await expect(deleteCountdown(deps, { boardId: 'b1', requesterUid: 'u2' })).rejects.toThrow(ForbiddenError);
    });
});
