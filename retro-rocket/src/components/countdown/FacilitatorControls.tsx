import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    RotateCcw,
    Trash2,
    Settings,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCountdown } from '../../hooks/useCountdown';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { CountdownControlsProps, CountdownInputs } from '../../types/countdown';
import Button from '../ui/Button';

const FacilitatorControls: React.FC<CountdownControlsProps> = ({
    retrospectiveId,
    isOwner
}) => {
    const { uid } = useCurrentUser();
    const {
        timer,
        countdownState,
        loading,
        createTimer,
        startTimer,
        pauseTimer,
        resetTimer,
        deleteTimer
    } = useCountdown(retrospectiveId);

    const [isExpanded, setIsExpanded] = useState(false);
    const [inputs, setInputs] = useState<CountdownInputs>({ minutes: 5, seconds: 0 });
    const [isCreating, setIsCreating] = useState(false);

    if (!isOwner || !uid) {
        return null;
    }

    const handleCreateTimer = async () => {
        try {
            setIsCreating(true);
            const totalSeconds = inputs.minutes * 60 + inputs.seconds;

            if (totalSeconds <= 0) {
                toast.error('Por favor ingresa un tiempo válido');
                return;
            }

            if (totalSeconds > 3600) { // 1 hour max
                toast.error('El tiempo máximo es de 60 minutos');
                return;
            }

            await createTimer(totalSeconds, uid);
            toast.success(`Temporizador configurado: ${inputs.minutes}:${inputs.seconds.toString().padStart(2, '0')}`);
        } catch (error) {
            console.error('Error creating timer:', error);
            toast.error('Error al crear el temporizador');
        } finally {
            setIsCreating(false);
        }
    };

    const handleStart = async () => {
        try {
            await startTimer();
            toast.success('Temporizador iniciado');
        } catch (error) {
            console.error('Error starting timer:', error);
            toast.error('Error al iniciar el temporizador');
        }
    };

    const handlePause = async () => {
        try {
            await pauseTimer();
            toast.success('Temporizador pausado');
        } catch (error) {
            console.error('Error pausing timer:', error);
            toast.error('Error al pausar el temporizador');
        }
    };

    const handleReset = async () => {
        try {
            await resetTimer();
            toast.success('Temporizador reiniciado');
        } catch (error) {
            console.error('Error resetting timer:', error);
            toast.error('Error al reiniciar el temporizador');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteTimer();
            toast.success('Temporizador eliminado');
        } catch (error) {
            console.error('Error deleting timer:', error);
            toast.error('Error al eliminar el temporizador');
        }
    };

    const handleInputChange = (field: keyof CountdownInputs, value: number) => {
        setInputs(prev => ({
            ...prev,
            [field]: Math.max(0, Math.min(field === 'minutes' ? 60 : 59, value))
        }));
    };

    const canStart = timer && !countdownState.isRunning && countdownState.timeRemaining > 0;
    const canPause = timer && countdownState.isRunning;
    const canReset = timer && (countdownState.isRunning || countdownState.isPaused || countdownState.isFinished);
    const canDelete = timer && countdownState.totalDuration > 0;

    return (
        <div className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-lg shadow-lg">
            {/* Header */}
            <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded ? 'true' : 'false'}
                aria-controls="facilitator-controls-content"
            >
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        Controles de Facilitador
                    </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        id="facilitator-controls-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200 dark:border-gray-700"
                    >
                        <div className="p-4 space-y-4">

                            {/* Timer Configuration */}
                            {(!timer || countdownState.totalDuration === 0) && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <Settings className="w-4 h-4" />
                                        Configurar Tiempo
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={inputs.minutes}
                                                onChange={(e) => handleInputChange('minutes', parseInt(e.target.value) || 0)}
                                                className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="5"
                                            />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">min</span>
                                        </div>

                                        <span className="text-gray-400">:</span>

                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={inputs.seconds}
                                                onChange={(e) => handleInputChange('seconds', parseInt(e.target.value) || 0)}
                                                className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="00"
                                            />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">seg</span>
                                        </div>

                                        <Button
                                            onClick={handleCreateTimer}
                                            disabled={isCreating || loading}
                                            variant="primary"
                                            size="sm"
                                            className="ml-2"
                                        >
                                            {isCreating ? 'Creando...' : 'Crear'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Timer Controls */}
                            {timer && countdownState.totalDuration > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <Settings className="w-4 h-4" />
                                        Controlar Temporizador
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canStart && (
                                            <Button
                                                onClick={handleStart}
                                                disabled={loading}
                                                variant="primary"
                                                size="sm"
                                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                                            >
                                                <Play className="w-4 h-4" />
                                                Iniciar
                                            </Button>
                                        )}

                                        {canPause && (
                                            <Button
                                                onClick={handlePause}
                                                disabled={loading}
                                                variant="secondary"
                                                size="sm"
                                                className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700"
                                            >
                                                <Pause className="w-4 h-4" />
                                                Pausar
                                            </Button>
                                        )}

                                        {canReset && (
                                            <Button
                                                onClick={handleReset}
                                                disabled={loading}
                                                variant="secondary"
                                                size="sm"
                                                className="flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                Reiniciar
                                            </Button>
                                        )}

                                        {canDelete && (
                                            <Button
                                                onClick={handleDelete}
                                                disabled={loading}
                                                variant="danger"
                                                size="sm"
                                                className="flex items-center gap-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Eliminar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status Info */}
                            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                                Solo tú puedes ver y controlar este panel como facilitador
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FacilitatorControls;
