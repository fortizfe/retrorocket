import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    X,
    Settings,
    Play,
    Pause,
    RotateCcw,
    Trash2
} from 'lucide-react';
import Button from '../ui/Button';
import { useCountdown } from '../../hooks/useCountdown';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface FacilitatorMenuProps {
    retrospectiveId: string;
}

const FacilitatorMenu: React.FC<FacilitatorMenuProps> = ({ retrospectiveId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
    const [inputs, setInputs] = useState({ minutes: 0, seconds: 0 });
    const [isCreating, setIsCreating] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const {
        timer,
        countdownState,
        loading,
        createTimer,
        startTimer,
        pauseTimer,
        resetTimer,
        deleteTimer,
    } = useCountdown(retrospectiveId);

    // Bloquear scroll cuando el menú esté abierto
    useBodyScrollLock(isOpen);

    // Update trigger position when opening
    const handleToggle = useCallback(() => {
        if (!isOpen && buttonRef.current) {
            setTriggerRect(buttonRef.current.getBoundingClientRect());
        }
        setIsOpen(!isOpen);
    }, [isOpen]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    // Calculate position for the dropdown
    const getPositionStyles = () => {
        if (!triggerRect) return {};

        const dropdownWidth = 320; // w-80 = 320px
        const spacing = 8;

        // Always position to the left of the trigger
        const left = Math.max(spacing, triggerRect.right - dropdownWidth);
        const top = triggerRect.bottom + spacing;

        return {
            left: `${left}px`,
            top: `${top}px`,
        };
    };

    const handleInputChange = (field: 'minutes' | 'seconds', value: number) => {
        setInputs(prev => ({ ...prev, [field]: Math.max(0, value) }));
    };

    const handleCreateTimer = async () => {
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

    const handleStart = () => startTimer();
    const handlePause = () => pauseTimer();
    const handleReset = () => resetTimer();
    const handleDelete = () => deleteTimer();

    // Calculate timer states
    const canStart = timer && !countdownState.isRunning && !countdownState.isFinished;
    const canPause = timer && countdownState.isRunning;
    const canReset = timer && (countdownState.isRunning || countdownState.isPaused);
    const canDelete = timer;

    return (
        <div className="relative">
            {/* Hamburger Menu Button */}
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
                title="Controles de Facilitador"
                aria-label="Abrir controles de facilitador"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {isOpen ? (
                    <X className="w-5 h-5" />
                ) : (
                    <Menu className="w-5 h-5" />
                )}
            </button>

            {/* Portal Dropdown Menu */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[99999] w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg"
                        style={triggerRect ? getPositionStyles() : {}}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    Controles de Facilitador
                                </span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                title="Cerrar"
                                aria-label="Cerrar menú"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {/* Timer Configuration */}
                            {(!timer || countdownState.totalDuration === 0) && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
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
                                                className="w-16 px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                placeholder="0"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-400">min</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={inputs.seconds}
                                                onChange={(e) => handleInputChange('seconds', parseInt(e.target.value) || 0)}
                                                className="w-16 px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                placeholder="0"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-400">seg</span>
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
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <Settings className="w-4 h-4" />
                                        Controlar Temporizador
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
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
                            <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                                Solo tú puedes ver y controlar este panel como facilitador
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default FacilitatorMenu;
