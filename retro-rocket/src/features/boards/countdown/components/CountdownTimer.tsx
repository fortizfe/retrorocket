import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { CountdownDisplayProps } from '@/features/boards/types/countdown';

const CountdownTimer: React.FC<CountdownDisplayProps> = ({ retrospectiveId }) => {
    const { countdownState, formatTime, loading } = useCountdown(retrospectiveId);

    if (loading || countdownState.totalDuration === 0) {
        return null;
    }

    const { timeRemaining, isRunning, isPaused, isFinished } = countdownState;

    const getStatusColor = () => {
        if (isFinished) return 'text-error-fg';
        if (isPaused) return 'text-warning-fg';
        if (isRunning) return 'text-success-fg';
        return 'text-text-muted';
    };

    const getStatusBg = () => {
        if (isFinished) return 'bg-error-bg border-error-fg';
        if (isPaused) return 'bg-warning-bg border-warning-fg';
        if (isRunning) return 'bg-success-bg border-success-fg';
        return 'bg-surface border-border-default';
    };

    const getStatusIcon = () => {
        if (isFinished) return <AlertCircle className="w-4 h-4" />;
        return <Clock className="w-4 h-4" />;
    };

    const getStatusText = () => {
        if (isFinished) return 'Tiempo terminado';
        if (isPaused) return 'Pausado';
        if (isRunning) return 'En curso';
        return 'Detenido';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`
          inline-flex items-center gap-3 px-4 py-2 rounded-lg border-2
          transition-all duration-300
          ${getStatusBg()}
        `}
            >
                {/* Status Icon */}
                <div className={`flex items-center ${getStatusColor()}`}>
                    {getStatusIcon()}
                </div>

                {/* Timer Display */}
                <div className="flex flex-col items-center min-w-[80px]">
                    <div
                        className={`
              text-xl font-mono font-bold
              ${getStatusColor()}
              ${isFinished ? 'animate-pulse' : ''}
            `}
                    >
                        {formatTime(timeRemaining)}
                    </div>

                    <div className={`text-xs font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CountdownTimer;
