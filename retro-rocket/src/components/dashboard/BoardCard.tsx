import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, Trash2, AlertTriangle, Crown, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { deleteRetrospectiveCompletely } from '../../services/retrospectiveService';
import toast from 'react-hot-toast';

interface Board {
    id: string;
    title: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
    createdBy: string;
    isCreator?: boolean;
}

interface BoardCardProps {
    board: Board;
    currentUserId: string;
    onBoardDeleted: (boardId: string) => void;
}

const BoardCard: React.FC<BoardCardProps> = ({ board, currentUserId, onBoardDeleted }) => {
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = board.createdBy === currentUserId;

    const handleViewBoard = () => {
        navigate(`/retro/${board.id}`);
    };

    const handleDeleteBoard = async () => {
        if (!isOwner) return;

        setIsDeleting(true);
        try {
            await deleteRetrospectiveCompletely(board.id, currentUserId);
            toast.success('Tablero eliminado correctamente');
            onBoardDeleted(board.id);
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Error deleting board:', error);
            toast.error('Error al eliminar el tablero');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    if (showDeleteConfirm) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
            >
                <Card className="p-6 border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400" />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                                ¿Eliminar tablero?
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mb-1">
                                <strong>"{board.title}"</strong>
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">
                                Esta acción no se puede deshacer. Se eliminarán todas las tarjetas y datos del tablero.
                            </p>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleDeleteBoard}
                                loading={isDeleting}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="relative group"
        >
            <Card className="p-6 h-full flex flex-col hover:shadow-medium transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600">
                {/* Header with title and delete button */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 mr-2">
                        <div className="flex items-start gap-2">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 flex-1">
                                {board.title}
                            </h3>
                            {/* Role indicator */}
                            {board.isCreator === false && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-0.5">
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    Unido
                                </span>
                            )}
                            {board.isCreator === true && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mt-0.5">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Creador
                                </span>
                            )}
                        </div>
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                     p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 
                                     text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                            title="Eliminar tablero"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Description */}
                {board.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                        {board.description}
                    </p>
                )}

                {/* Metadata */}
                <div className="flex-1 flex flex-col justify-end space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(board.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{board.participantCount} participantes</span>
                        </div>
                    </div>

                    {/* Action button */}
                    <Button
                        onClick={handleViewBoard}
                        variant="primary"
                        size="sm"
                        className="w-full"
                    >
                        Abrir tablero
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
};

export default BoardCard;
