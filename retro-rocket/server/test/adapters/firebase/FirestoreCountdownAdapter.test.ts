import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreCountdownAdapter } from '../../../src/adapters/firebase/FirestoreCountdownAdapter';
import { FakeFirestore } from './fakeFirestore';

let nowSeconds = 1_700_000_000;
const clock = { nowSeconds: () => nowSeconds };

function adapter(): FirestoreCountdownAdapter {
    return new FirestoreCountdownAdapter(new FakeFirestore() as unknown as Firestore, clock);
}

describe('FirestoreCountdownAdapter', () => {
    it('creates and round-trips a timer', async () => {
        const countdown = adapter();
        const timer = await countdown.createOrUpdateTimer('b1', 300, 'facilitator-1');
        expect(timer.duration).toBe(300);
        expect(timer.originalDuration).toBe(300);
        expect(timer.isRunning).toBe(false);

        const fetched = await countdown.getTimer('b1');
        expect(fetched?.duration).toBe(300);
    });

    it('starts, pauses (computing remaining duration from elapsed wall time), and resets', async () => {
        const countdown = adapter();
        await countdown.createOrUpdateTimer('b1', 100, 'facilitator-1');

        const started = await countdown.startTimer('b1');
        expect(started.isRunning).toBe(true);
        expect(started.startTime).not.toBeNull();
        expect(started.endTime).not.toBeNull();

        nowSeconds += 30;
        const paused = await countdown.pauseTimer('b1');
        expect(paused.duration).toBe(70);
        expect(paused.isPaused).toBe(true);
        expect(paused.isRunning).toBe(false);

        const reset = await countdown.resetTimer('b1');
        expect(reset.duration).toBe(100);
        expect(reset.isPaused).toBe(false);
    });

    it('deletes a timer', async () => {
        const countdown = adapter();
        await countdown.createOrUpdateTimer('b1', 100, 'facilitator-1');
        await countdown.deleteTimer('b1');
        expect(await countdown.getTimer('b1')).toBeNull();
    });

    it('returns null for a nonexistent timer', async () => {
        const countdown = adapter();
        expect(await countdown.getTimer('missing')).toBeNull();
    });
});
