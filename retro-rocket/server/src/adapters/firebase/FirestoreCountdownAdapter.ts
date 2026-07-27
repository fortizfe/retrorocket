import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { ClockPort } from '../../application/ports';
import type { CountdownPort, CountdownTimer } from '../../application/ports/facilitator';
import { COUNTDOWN_TIMERS } from './collections';
import { toDate } from './firestoreUtil';

/**
 * Admin SDK access to the `countdown_timers` collection (doc id == retrospectiveId,
 * data-model.md). start/pause elapsed-time math runs server-side using the injected
 * ClockPort (deterministic in tests), replacing the client-side `Date.now()` math in
 * today's countdownService.ts.
 */
export class FirestoreCountdownAdapter implements CountdownPort {
    constructor(private readonly db: Firestore, private readonly clock: ClockPort) {}

    private ref(retrospectiveId: string) {
        return this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId);
    }

    async getTimer(retrospectiveId: string): Promise<CountdownTimer | null> {
        const doc = await this.ref(retrospectiveId).get();
        if (!doc.exists) return null;
        return this.toTimer(doc.id, doc.data()!);
    }

    async createOrUpdateTimer(retrospectiveId: string, duration: number, createdBy: string): Promise<CountdownTimer> {
        const ref = this.ref(retrospectiveId);
        const existing = await ref.get();
        await ref.set({
            retrospectiveId,
            duration,
            originalDuration: duration,
            startTime: null,
            endTime: null,
            isRunning: false,
            isPaused: false,
            createdBy,
            createdAt: existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return (await this.getTimer(retrospectiveId))!;
    }

    async startTimer(retrospectiveId: string): Promise<CountdownTimer> {
        const doc = await this.ref(retrospectiveId).get();
        if (!doc.exists) throw new Error('Timer not found');
        const data = doc.data()!;
        const now = this.clock.nowSeconds() * 1000;
        const endTime = new Date(now + data.duration * 1000);
        await this.ref(retrospectiveId).update({
            startTime: Timestamp.fromDate(new Date(now)),
            endTime: Timestamp.fromDate(endTime),
            isRunning: true,
            isPaused: false,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return (await this.getTimer(retrospectiveId))!;
    }

    async pauseTimer(retrospectiveId: string): Promise<CountdownTimer> {
        const doc = await this.ref(retrospectiveId).get();
        if (!doc.exists) throw new Error('Timer not found');
        const data = doc.data()!;
        const now = this.clock.nowSeconds() * 1000;
        const startTime = data.startTime ? toDate(data.startTime).getTime() : now;
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, data.duration - elapsed);
        await this.ref(retrospectiveId).update({
            duration: remaining,
            startTime: null,
            endTime: null,
            isRunning: false,
            isPaused: true,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return (await this.getTimer(retrospectiveId))!;
    }

    async resetTimer(retrospectiveId: string): Promise<CountdownTimer> {
        const doc = await this.ref(retrospectiveId).get();
        if (!doc.exists) throw new Error('Timer not found');
        const data = doc.data()!;
        await this.ref(retrospectiveId).update({
            duration: data.originalDuration ?? data.duration,
            startTime: null,
            endTime: null,
            isRunning: false,
            isPaused: false,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return (await this.getTimer(retrospectiveId))!;
    }

    async deleteTimer(retrospectiveId: string): Promise<void> {
        await this.ref(retrospectiveId).delete();
    }

    private toTimer(id: string, data: FirebaseFirestore.DocumentData): CountdownTimer {
        return {
            id,
            retrospectiveId: data.retrospectiveId,
            duration: data.duration,
            originalDuration: data.originalDuration ?? data.duration,
            startTime: data.startTime ? toDate(data.startTime) : null,
            endTime: data.endTime ? toDate(data.endTime) : null,
            isRunning: data.isRunning,
            isPaused: data.isPaused,
            createdBy: data.createdBy,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
        };
    }
}
