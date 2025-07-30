import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { CountdownTimer } from '../types/countdown';

const COUNTDOWN_COLLECTION = 'countdown_timers';

export class CountdownService {

    static async createOrUpdateTimer(
        retrospectiveId: string,
        duration: number,
        createdBy: string
    ): Promise<void> {
        if (!db) throw new Error('Firestore not initialized');

        const timerRef = doc(db, COUNTDOWN_COLLECTION, retrospectiveId);

        const timerData: Omit<CountdownTimer, 'id'> = {
            retrospectiveId,
            startTime: null,
            duration,
            originalDuration: duration,
            isRunning: false,
            isPaused: false,
            endTime: null,
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date()
        }; await setDoc(timerRef, {
            ...timerData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    static async startTimer(retrospectiveId: string): Promise<void> {
        if (!db) throw new Error('Firestore not initialized');

        const timerRef = doc(db, COUNTDOWN_COLLECTION, retrospectiveId);
        const timerDoc = await getDoc(timerRef);

        if (!timerDoc.exists()) {
            throw new Error('Timer not found');
        }

        const timerData = timerDoc.data() as CountdownTimer;
        const now = new Date();
        const endTime = new Date(now.getTime() + timerData.duration * 1000);

        await updateDoc(timerRef, {
            startTime: serverTimestamp(),
            endTime: Timestamp.fromDate(endTime),
            isRunning: true,
            isPaused: false,
            updatedAt: serverTimestamp()
        });
    }

    static async pauseTimer(retrospectiveId: string): Promise<void> {
        if (!db) throw new Error('Firestore not initialized');

        const timerRef = doc(db, COUNTDOWN_COLLECTION, retrospectiveId);
        const timerDoc = await getDoc(timerRef);

        if (!timerDoc.exists()) {
            throw new Error('Timer not found');
        }

        const timerData = timerDoc.data() as CountdownTimer;

        if (!timerData.isRunning || !timerData.startTime) {
            throw new Error('Timer is not running');
        }

        // Calculate remaining time
        const now = new Date();
        const startTime = timerData.startTime instanceof Timestamp
            ? timerData.startTime.toDate()
            : new Date(timerData.startTime);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const remainingDuration = Math.max(0, timerData.duration - elapsed);

        await updateDoc(timerRef, {
            duration: remainingDuration,
            isRunning: false,
            isPaused: true,
            startTime: null,
            endTime: null,
            updatedAt: serverTimestamp()
        });
    }

    static async resetTimer(retrospectiveId: string): Promise<void> {
        if (!db) throw new Error('Firestore not initialized');

        const timerRef = doc(db, COUNTDOWN_COLLECTION, retrospectiveId);
        const timerDoc = await getDoc(timerRef);

        if (!timerDoc.exists()) {
            throw new Error('Timer not found');
        }

        const timerData = timerDoc.data() as CountdownTimer;
        const originalDuration = timerData.originalDuration || timerData.duration;

        await updateDoc(timerRef, {
            startTime: null,
            endTime: null,
            isRunning: false,
            isPaused: false,
            duration: originalDuration, // Reset to original duration
            updatedAt: serverTimestamp()
        });
    } static async deleteTimer(retrospectiveId: string): Promise<void> {
        if (!db) throw new Error('Firestore not initialized');

        const timerRef = doc(db, COUNTDOWN_COLLECTION, retrospectiveId);

        // Eliminar completamente el documento del temporizador
        await deleteDoc(timerRef);
    } static subscribeToTimer(
        retrospectiveId: string,
        callback: (timer: CountdownTimer | null) => void
    ): () => void {
        if (!db) {
            console.warn('Firestore not initialized');
            return () => { };
        }

        const timerRef = doc(db, COUNTDOWN_COLLECTION, retrospectiveId);

        return onSnapshot(timerRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const timer: CountdownTimer = {
                    id: doc.id,
                    retrospectiveId: data.retrospectiveId,
                    startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : data.startTime,
                    duration: data.duration,
                    originalDuration: data.originalDuration || data.duration, // fallback for existing timers
                    isRunning: data.isRunning,
                    isPaused: data.isPaused,
                    endTime: data.endTime instanceof Timestamp ? data.endTime.toDate() : data.endTime,
                    createdBy: data.createdBy,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
                    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt
                };
                callback(timer);
            } else {
                callback(null);
            }
        }, (error) => {
            console.error('Error listening to timer:', error);
            callback(null);
        });
    }

    static async getTimer(retrospectiveId: string): Promise<CountdownTimer | null> {
        if (!db) throw new Error('Firestore not initialized');

        const timerRef = doc(db, COUNTDOWN_COLLECTION, retrospectiveId);
        const timerDoc = await getDoc(timerRef);

        if (!timerDoc.exists()) {
            return null;
        }

        const data = timerDoc.data();
        return {
            id: timerDoc.id,
            retrospectiveId: data.retrospectiveId,
            startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : data.startTime,
            duration: data.duration,
            originalDuration: data.originalDuration || data.duration, // fallback for existing timers
            isRunning: data.isRunning,
            isPaused: data.isPaused,
            endTime: data.endTime instanceof Timestamp ? data.endTime.toDate() : data.endTime,
            createdBy: data.createdBy,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt
        };
    }
}
