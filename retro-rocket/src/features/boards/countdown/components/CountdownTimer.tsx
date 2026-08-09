import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { useLanguage } from '@/lib/hooks/useLanguage';
import type { CountdownTimer as CountdownTimerData } from '@/features/boards/retrospective/services/backendRetrospectiveClient';

interface CountdownTimerProps {
    retrospectiveId: string;
    /** Sourced from useRetrospectiveRealtimeSync's board state via BoardDataContext
     * (feature 019, US5). */
    timer: CountdownTimerData | null;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ retrospectiveId, timer }) => {
    const { t } = useLanguage();
    const { countdownState, formatTime } = useCountdown(retrospectiveId, timer);

    if (countdownState.totalDuration === 0) {
        return null;
    }

    const { timeRemaining, isRunning, isPaused, isFinished } = countdownState;

    const getStatusColor = () => {
        if (isFinished) return 'text-error-fg';
        if (isPaused) return 'text-warning-fg';
        if (isRunning) return 'text-success-fg';
        return 'text-text-muted';
    };

    const getStatusIcon = () => {
        if (isFinished) return <AlertCircle className="w-4 h-4" />;
        return <Clock className="w-4 h-4" />;
    };

    const getStatusText = () => {
        // Existing keys (retrospective.facilitator.countdown.status.*) — this
        // component previously hardcoded the Spanish literals directly instead
        // of using them (FR-013 gap).
        if (isFinished) return t('retrospective.facilitator.countdown.status.finished');
        if (isPaused) return t('retrospective.facilitator.countdown.status.paused');
        if (isRunning) return t('retrospective.facilitator.countdown.status.running');
        return t('retrospective.facilitator.countdown.status.stopped');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-raised/80 backdrop-blur-sm shadow-sm transition-shadow duration-300"
            >
                {/* Status Icon */}
                <div className={`flex items-center ${getStatusColor()}`}>
                    {getStatusIcon()}
                </div>

                {/* Timer Display */}
                <div className="flex items-baseline gap-1.5">
                    <span
                        className={`
              text-sm font-mono font-semibold tabular-nums
              ${getStatusColor()}
              ${isFinished ? 'animate-pulse' : ''}
            `}
                    >
                        {formatTime(timeRemaining)}
                    </span>

                    <span className={`text-xs font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CountdownTimer;
