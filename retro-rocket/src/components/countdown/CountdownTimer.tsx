import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { CountdownDisplayProps } from '../../types/countdown';

const CountdownTimer: React.FC<CountdownDisplayProps> = ({ retrospectiveId }) => {
    const { countdownState, formatTime, loading } = useCountdown(retrospectiveId);

    if (loading || countdownState.totalDuration === 0) {
        return null;
    }

    const { timeRemaining, isRunning, isPaused, isFinished } = countdownState;
    const progressPercentage = ((countdownState.totalDuration - timeRemaining) / countdownState.totalDuration) * 100;

    const getStatusColor = () => {
        if (isFinished) return 'text-red-500 dark:text-red-400';
        if (isPaused) return 'text-yellow-500 dark:text-yellow-400';
        if (isRunning) return 'text-green-500 dark:text-green-400';
        return 'text-gray-500 dark:text-gray-400';
    };

    const getStatusBg = () => {
        if (isFinished) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
        if (isPaused) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
        if (isRunning) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    };

    const getStatusIcon = () => {
        if (isFinished) return <AlertCircle className="w-4 h-4" />;
        return <Clock className="w-4 h-4" />;
    };

    const getProgressBarColor = () => {
        if (isFinished) return 'bg-red-500';
        if (isPaused) return 'bg-yellow-500';
        if (isRunning) return 'bg-green-500';
        return 'bg-gray-400';
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
                    <motion.div
                        key={timeRemaining}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`
              text-xl font-mono font-bold
              ${getStatusColor()}
              ${isFinished ? 'animate-pulse' : ''}
            `}
                    >
                        {formatTime(timeRemaining)}
                    </motion.div>

                    <div className={`text-xs font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col items-center gap-1">
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className={`
                h-full transition-all duration-1000 ease-linear
                ${getProgressBarColor()}
              `}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(progressPercentage)}%
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CountdownTimer;
