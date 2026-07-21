import React from 'react';
import { motion } from 'framer-motion';
import {
    Settings,
    Play,
    Pause,
    RotateCcw,
    Trash2,
    Clock,
    Timer as TimerIcon,
    Plus
} from 'lucide-react';
import ControlCard from '@/lib/components/ui/ControlCard';
import Button from '@/lib/components/ui/Button';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { useLanguage } from '@/lib/hooks/useLanguage';
import ActionColumnToggle from '@/features/boards/retrospective/components/ActionColumnToggle';
import SettingsRow from '@/lib/components/ui/SettingsRow';
import uiPreferencesStore from '@/lib/uiPreferencesStore';

interface ControlsTabProps {
    retrospectiveId?: string;
}

const ControlsTab: React.FC<ControlsTabProps> = ({ retrospectiveId }) => {
    const { t } = useLanguage();

    // Action column toggle state
    const [showActionColumn, setShowActionColumn] = React.useState<boolean>(() => uiPreferencesStore.getShowActionColumn());
    React.useEffect(() => {
        const unsub = uiPreferencesStore.subscribe((v) => setShowActionColumn(v));
        return unsub;
    }, []);
    const handleToggle = () => {
        uiPreferencesStore.setShowActionColumn(!uiPreferencesStore.getShowActionColumn());
    };

    // Timer logic - call hook unconditionally to respect hooks rules
    const countdown = useCountdown(retrospectiveId || '');
    const {
        timer,
        countdownState,
        loading,
        createTimer,
        startTimer,
        pauseTimer,
        resetTimer,
        deleteTimer,
        formatTime,
    } = countdown;

    const [inputs, setInputs] = React.useState({ minutes: 0, seconds: 0 });
    const [isCreating, setIsCreating] = React.useState(false);

    const handleInputChange = (field: 'minutes' | 'seconds', value: number) => {
        setInputs(prev => ({ ...prev, [field]: Math.max(0, value) }));
    };

    const handleCreateTimer = async () => {
        if (!createTimer) return;
        const totalSeconds = inputs.minutes * 60 + inputs.seconds;
        if (totalSeconds <= 0) return;

        setIsCreating(true);
        try {
            await createTimer(totalSeconds, 'facilitator');
            setInputs({ minutes: 0, seconds: 0 });
        } finally {
            setIsCreating(false);
        }
    };

    const canStart = timer && !countdownState.isRunning && !countdownState.isFinished;
    const canPause = timer && countdownState.isRunning;
    const canReset = timer && (countdownState.isRunning || countdownState.isPaused);
    const canDelete = timer;

    const getTimerStatus = () => {
        if (!timer) return {
            text: t('timer.status.ready'),
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-50 dark:bg-slate-700/50',
            border: 'border-slate-200 dark:border-slate-600'
        };

        if (countdownState.isFinished) return {
            text: t('timer.status.finished'),
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800'
        };

        if (countdownState.isRunning) return {
            text: t('timer.status.running'),
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800'
        };

        return {
            text: t('timer.status.paused'),
            color: 'text-yellow-600 dark:text-yellow-400',
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            border: 'border-yellow-200 dark:border-yellow-800'
        };
    };

    const getProgressBarColor = () => {
        if (!countdownState) return 'bg-blue-500';
        if (countdownState.isFinished) return 'bg-red-500';
        if (countdownState.isRunning) return 'bg-green-500';
        return 'bg-blue-500';
    };

    const status = getTimerStatus();

    return (
        <div className="space-y-4">

            {/* Controls stack - vertical list of control cards */}
            <div className="flex flex-col gap-4">
                <ControlCard
                    title={t('retrospective.facilitator.controlsCardTitle')}
                    icon={Settings}
                >
                    <div className="space-y-3">
                        <SettingsRow
                            label={t('retrospective.facilitator.showActionItems')}
                            description={t('retrospective.facilitator.showActionItemsDesc')}
                            control={<ActionColumnToggle visible={showActionColumn} onToggle={handleToggle} />}
                        />

                        {/* Placeholder: additional settings (dropdowns, toggles) can be added here as SettingsRow instances */}
                    </div>
                </ControlCard>

                {/* Timer section (optional) inside its own card */}
                {retrospectiveIdExists(retrospectiveId) && (
                    <ControlCard
                        title={t('retrospective.facilitator.countdown.title')}
                        icon={TimerIcon}
                    >
                        <div className="space-y-4">
                            {/* Current Timer Status */}
                            {timer && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-blue-100 dark:border-slate-600"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                        <div className="md:col-span-1 flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                                                <TimerIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('retrospective.facilitator.countdown.title')}</div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400">{status.text}</div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 text-center">
                                            <div className="text-4xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-wide">{formatTime ? formatTime(countdownState.timeRemaining) : '00:00'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('retrospective.facilitator.countdown.totalTime')}: {formatTime ? formatTime(countdownState.totalDuration) : '00:00'}</div>

                                            <div className="mt-3">
                                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: '100%' }}
                                                        animate={{ width: `${countdownState.totalDuration > 0 ? (countdownState.timeRemaining / countdownState.totalDuration) * 100 : 100}%` }}
                                                        transition={{ duration: 0.5 }}
                                                        className={`h-full rounded-full ${getProgressBarColor()}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Timer Creation */}
                            {(!timer || (countdownState && countdownState.totalDuration === 0)) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <Settings className="w-5 h-5" />
                                        <h3 className="font-medium">{t('retrospective.facilitator.configureTime')}</h3>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    {t('retrospective.facilitator.countdown.minutes')}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="60"
                                                        value={inputs.minutes}
                                                        onChange={(e) => handleInputChange('minutes', parseInt(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 text-center border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="0"
                                                    />
                                                    <Clock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    {t('retrospective.facilitator.countdown.seconds')}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="59"
                                                        value={inputs.seconds}
                                                        onChange={(e) => handleInputChange('seconds', parseInt(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 text-center border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="0"
                                                    />
                                                    <Clock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleCreateTimer}
                                            disabled={isCreating || loading || (inputs.minutes === 0 && inputs.seconds === 0)}
                                            variant="primary"
                                            className="w-full h-12 text-sm font-medium"
                                        >
                                            {isCreating ? (
                                                <>
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                        className="w-4 h-4 mr-2"
                                                    >
                                                        <TimerIcon className="w-4 h-4" />
                                                    </motion.div>
                                                    {t('retrospective.facilitator.countdown.creating')}
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    {t('retrospective.facilitator.countdown.create')}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Timer Controls */}
                            {timer && countdownState && countdownState.totalDuration > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <Settings className="w-5 h-5" />
                                        <h3 className="font-medium">{t('retrospective.facilitator.countdown.control')}</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {canStart && (
                                            <Button
                                                onClick={startTimer}
                                                disabled={loading}
                                                variant="primary"
                                                className="h-12 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 border-green-600 text-white"
                                            >
                                                <Play className="w-4 h-4 mr-2" />
                                                {t('retrospective.facilitator.countdown.start')}
                                            </Button>
                                        )}

                                        {canPause && (
                                            <Button
                                                onClick={pauseTimer}
                                                disabled={loading}
                                                variant="secondary"
                                                className="h-12 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 border-yellow-500 text-white"
                                            >
                                                <Pause className="w-4 h-4 mr-2" />
                                                {t('retrospective.facilitator.countdown.pause')}
                                            </Button>
                                        )}

                                        {canReset && (
                                            <Button
                                                onClick={resetTimer}
                                                disabled={loading}
                                                variant="outline"
                                                className="h-12"
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                {t('retrospective.facilitator.countdown.restart')}
                                            </Button>
                                        )}

                                        {canDelete && (
                                            <Button
                                                onClick={deleteTimer}
                                                disabled={loading}
                                                variant="danger"
                                                className="h-12"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                {t('retrospective.facilitator.countdown.delete')}
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Quick Timer Presets */}
                            {(!timer || (countdownState && countdownState.totalDuration === 0)) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {t('retrospective.facilitator.quickTimers')}
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { minutes: 5, label: '5min' },
                                            { minutes: 10, label: '10min' },
                                            { minutes: 15, label: '15min' }
                                        ].map((preset) => (
                                            <button
                                                key={preset.minutes}
                                                onClick={() => setInputs({ minutes: preset.minutes, seconds: 0 })}
                                                className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </ControlCard>
                )}
            </div>
        </div>
    );
};

function retrospectiveIdExists(id?: string) {
    return typeof id === 'string' && id.length > 0;
}

export default ControlsTab;

