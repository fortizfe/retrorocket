import { useState, useEffect, useCallback, useRef } from 'react';
import { CountdownService } from '../services/countdownService';
import { CountdownTimer, CountdownState } from '../types/countdown';

export const useCountdown = (retrospectiveId: string) => {
    const [timer, setTimer] = useState<CountdownTimer | null>(null);
    const [countdownState, setCountdownState] = useState<CountdownState>({
        timeRemaining: 0,
        isRunning: false,
        isPaused: false,
        isFinished: false,
        totalDuration: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasPlayedFinishSound = useRef(false);

    // Clear interval helper
    const clearCountdownInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Calculate time remaining
    const calculateTimeRemaining = useCallback((timerData: CountdownTimer): number => {
        if (!timerData.isRunning || !timerData.startTime) {
            return timerData.duration;
        }

        const now = new Date();
        const startTime = new Date(timerData.startTime);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        return Math.max(0, timerData.duration - elapsed);
    }, []);

    // Update countdown state
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
            totalDuration: timerData.originalDuration || timerData.duration // Use original duration for progress bar
        });

        // Play sound when timer finishes
        if (isFinished && !hasPlayedFinishSound.current) {
            hasPlayedFinishSound.current = true;
            // Optional: Play notification sound
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCDOAzvLZiTYIG2m+7t2QQAoUXrPo66tWFAg+ltryxnkpBSl+zPLaizsIGGS57OGYSw0PUKXi8LljHgg4kdXyznkpBSdnzPLZiz0IG2e57OGYSw0OUKXi8LljHgg4kdXyzngpBSlnzPPPa');
                audio.play().catch(() => {
                    // Ignore audio errors (browser might block autoplay)
                });
            } catch {
                // Ignore audio errors
            }
        }

        // Reset sound flag when timer is reset
        if (!timerData.isRunning && timeRemaining === (timerData.originalDuration || timerData.duration)) {
            hasPlayedFinishSound.current = false;
        }
    }, [calculateTimeRemaining, clearCountdownInterval]);

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

                // Stop the interval when time reaches 0
                if (timeRemaining === 0) {
                    clearCountdownInterval();
                }
            }, 1000);
        } else {
            clearCountdownInterval();
        }

        return clearCountdownInterval;
    }, [timer, calculateTimeRemaining, clearCountdownInterval]);

    // Subscribe to timer changes
    useEffect(() => {
        setLoading(true);
        setError(null);

        const unsubscribe = CountdownService.subscribeToTimer(retrospectiveId, (timerData) => {
            setTimer(timerData);
            updateCountdownState(timerData);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            clearCountdownInterval();
        };
    }, [retrospectiveId, updateCountdownState, clearCountdownInterval]);

    // Timer control methods
    const createTimer = useCallback(async (duration: number, createdBy: string) => {
        try {
            setError(null);
            await CountdownService.createOrUpdateTimer(retrospectiveId, duration, createdBy);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error creating timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);

    const startTimer = useCallback(async () => {
        try {
            setError(null);
            await CountdownService.startTimer(retrospectiveId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error starting timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);

    const pauseTimer = useCallback(async () => {
        try {
            setError(null);
            await CountdownService.pauseTimer(retrospectiveId);
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
            await CountdownService.resetTimer(retrospectiveId);
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
            await CountdownService.deleteTimer(retrospectiveId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error deleting timer';
            setError(errorMessage);
            throw err;
        }
    }, [retrospectiveId]);    // Format time helper
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
