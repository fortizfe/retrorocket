import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, X, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useJoinRetrospective } from '../../hooks/useJoinRetrospective';

interface JoinRetrospectiveModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const JoinRetrospectiveModal: React.FC<JoinRetrospectiveModalProps> = ({
    isOpen,
    onClose
}) => {
    const [boardId, setBoardId] = useState('');
    const { isJoining, error, joinByIdAndNavigate, clearError } = useJoinRetrospective();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!boardId.trim()) {
            return;
        }

        try {
            await joinByIdAndNavigate(boardId.trim());
            // Modal will close automatically when navigation happens
        } catch (err) {
            // Error is handled by the hook and displayed in the modal
            console.error('Error joining retrospective:', err);
        }
    };

    const handleClose = () => {
        setBoardId('');
        clearError();
        onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBoardId(e.target.value);
        if (error) {
            clearError();
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-strong rounded-xl p-6 w-full max-w-md shadow-medium"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Unirse a Retrospectiva
                        </h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        disabled={isJoining}
                        title="Cerrar modal"
                        aria-label="Cerrar modal"
                    >
                        <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                    Introduce el ID del tablero de retrospectiva al que deseas unirte.
                    El creador del tablero puede proporcionarte este ID.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="boardId"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                        >
                            ID del Tablero
                        </label>
                        <Input
                            id="boardId"
                            type="text"
                            value={boardId}
                            onChange={handleInputChange}
                            placeholder="Ej: abc123def456..."
                            required
                            className="w-full"
                            autoFocus
                            disabled={isJoining}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            El ID es una cadena única que identifica el tablero
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-3"
                        >
                            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-300">
                                {error}
                            </p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            className="flex-1"
                            disabled={isJoining}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!boardId.trim() || isJoining}
                            className="flex-1 bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white"
                        >
                            {isJoining ? 'Uniéndose...' : 'Unirse'}
                        </Button>
                    </div>
                </form>

                {/* Help Text */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        ¿No tienes el ID? Pídele al organizador de la retrospectiva que lo comparta contigo.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default JoinRetrospectiveModal;
