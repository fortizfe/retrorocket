import { useState, useEffect, useCallback, useRef } from 'react';
import { useBoardEvents } from '@/lib/hooks/useBoardEvents';
import * as countdownApi from '@/features/boards/countdown/services/countdownApiClient';
import { CountdownTimer, CountdownState } from '@/features/boards/types/countdown';

/**
 * Backend-mediated replacement for countdownService.ts's direct Firestore access
 * (feature 017 US3). This hook is used from the facilitator menu, rendered outside
 * RetrospectiveBoard's tree (Header/RetrospectiveTopbar), so — like useParticipants — it
 * opens its own SSE connection rather than consuming the shared BoardEventsProvider.
 */
export const useCountdown = (retrospectiveId: string) => {
    const [timer, setTimer] = useState<CountdownTimer | null>(null);
    const [hasSnapshot, setHasSnapshot] = useState(false);
    const [countdownState, setCountdownState] = useState<CountdownState>({
        timeRemaining: 0,
        isRunning: false,
        isPaused: false,
        isFinished: false,
        totalDuration: 0
    });
    const [error, setError] = useState<string | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasPlayedFinishSound = useRef(false);

    const clearCountdownInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const calculateTimeRemaining = useCallback((timerData: CountdownTimer): number => {
        if (!timerData.isRunning || !timerData.startTime) {
            return timerData.duration;
        }

        const now = new Date();
        const startTime = new Date(timerData.startTime);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        return Math.max(0, timerData.duration - elapsed);
    }, []);

    const updateCountdownState = useCallback((timerData: CountdownTimer | null) => {
        if (!timerData) {
            setCountdownState({
                timeRemaining: 0,
                isRunning: false,
                isPaused: false,
                isFinished: false,
                totalDuration: 0
            });
            clearCountdownInterval();
            return;
        }

        const timeRemaining = calculateTimeRemaining(timerData);
        const isFinished = timeRemaining === 0 && timerData.isRunning;

        setCountdownState({
            timeRemaining,
            isRunning: timerData.isRunning,
            isPaused: timerData.isPaused,
            isFinished,
            totalDuration: timerData.originalDuration || timerData.duration
        });

        if (isFinished && !hasPlayedFinishSound.current) {
            hasPlayedFinishSound.current = true;
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCDOAzvLZiTYIG2m+7t2QQAoUXrPo66tWFAg+ltryxnkpBSl+zPLaizsIGGS57OGYSw0PUKXi8LljHgg4kdXyznkpBSdnzPLZiz0IG2e57OGYSw0OUKXi8LljHgg4kdXyzngpBSlnzPPPa');
                audio.play().catch(() => {});
            } catch {
                // Ignore audio errors
            }
        }

        if (!timerData.isRunning && timeRemaining === (timerData.originalDuration || timerData.duration)) {
            hasPlayedFinishSound.current = false;
        }
    }, [calculateTimeRemaining, clearCountdownInterval]);

    const { connectionState } = useBoardEvents(retrospectiveId || undefined, {
        onSnapshot: (data) => {
            setHasSnapshot(true);
            const raw = (data as { countdown: Parameters<typeof countdownApi.parseCountdownSnapshot>[0] }).countdown;
            const parsed = countdownApi.parseCountdownSnapshot(raw);
            setTimer(parsed);
            updateCountdownState(parsed);
        },
        on: {
            countdown: (data) => {
                const parsed = countdownApi.parseCountdownSnapshot(data as Parameters<typeof countdownApi.parseCountdownSnapshot>[0]);
                setTimer(parsed);
                updateCountdownState(parsed);
            },
        },
    });

    const loading = !!retrospectiveId && !hasSnapshot && connectionState !== 'reconnecting';

    // Start real-time countdown when timer is running
    useEffect(() => {
        if (timer?.isRunning) {
            clearCountdownInterval();

            intervalRef.current = setInterval(() => {
                const timeRemaining = calculateTimeRemaining(timer);

                setCountdownState(prev => ({
                    ...prev,
                    timeRemaining,
                    isFinished: timeRemaining === 0
                }));

                if (timeRemaining === 0) {
                    clearCountdownInterval();
                }
            }, 1000);
        } else {
            clearCountdownInterval();
        }

        return clearCountdownInterval;
    }, [timer, calculateTimeRemaining, clearCountdownInterval]);

    const createTimer = useCallback(async (duration: number, _createdBy?: string) => {
        try {
            setError(null);
            if (!retrospectiveId) throw new Error('No retrospectiveId provided');
            await countdownApi.createOrUpdateTimer(retrospectiveId, duration);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error creating timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);

    const startTimer = useCallback(async () => {
        try {
            setError(null);
            if (!retrospectiveId) throw new Error('No retrospectiveId provided');
            await countdownApi.startTimer(retrospectiveId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error starting timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);

    const pauseTimer = useCallback(async () => {
        try {
            setError(null);
            if (!retrospectiveId) throw new Error('No retrospectiveId provided');
            await countdownApi.pauseTimer(retrospectiveId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error pausing timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);

    const resetTimer = useCallback(async () => {
        try {
            setError(null);
            hasPlayedFinishSound.current = false;
            if (!retrospectiveId) throw new Error('No retrospectiveId provided');
            await countdownApi.resetTimer(retrospectiveId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error resetting timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);

    const deleteTimer = useCallback(async () => {
        try {
            setError(null);
            hasPlayedFinishSound.current = false;
            if (!retrospectiveId) throw new Error('No retrospectiveId provided');
            await countdownApi.deleteTimer(retrospectiveId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error deleting timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);

    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timer,
        countdownState,
        loading,
        error,
        createTimer,
        startTimer,
        pauseTimer,
        resetTimer,
        deleteTimer,
        formatTime
    };
};
