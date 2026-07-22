import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, Trash2, AlertTriangle, Crown, UserPlus, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Button from '@/lib/components/ui/Button';
import Card from '@/lib/components/ui/Card';
import EditRetrospectiveModal from '@/features/dashboard/components/EditRetrospectiveModal';
import { OptimizedRetrospectiveService } from '@/lib/services/OptimizedRetrospectiveService';
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
    /** Optional override for delete behavior. If provided, BoardCard will call this
     * function to perform deletion. If omitted, it will use the service's soft delete.
     */
    onDelete?: (boardId: string, userId: string) => Promise<void>;
    onBoardUpdated?: (boardId: string, updates: { title: string }) => void;
}

const BoardCard: React.FC<BoardCardProps> = ({ board, currentUserId, onBoardDeleted, onDelete, onBoardUpdated }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const isOwner = board.createdBy === currentUserId;

    const handleViewBoard = () => {
        navigate(`/retro/${board.id}`);
    };

    const handleDelete = async () => {
        if (!currentUserId) return;

        setIsDeleting(true);
        try {
            // If a custom delete strategy is provided, use it (allows callers to
            // decide between soft vs hard delete). Otherwise fall back to soft delete.
            if (onDelete) {
                await onDelete(board.id, currentUserId);
            } else {
                await OptimizedRetrospectiveService.softDeleteRetrospective(board.id, currentUserId);
            }
            setShowDeleteConfirm(false);
            toast.success(t('retrospective.deleteSuccess') || 'Retrospective moved to trash');
            onBoardDeleted(board.id);
        } catch (error: unknown) {
            console.error('Error deleting retrospective:', error);
            const message = error instanceof Error ? error.message : undefined;
            toast.error(message || t('retrospective.deleteError') || 'Failed to delete retrospective');
        } finally {
            setIsDeleting(false);
        }
    }; const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    return (
        <>
            {showDeleteConfirm ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                >
                    <Card className="p-6 border-2 border-error-fg bg-error-bg">
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <AlertTriangle className="h-12 w-12 text-error-fg" />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-error-fg mb-2">
                                    {t('dashboard.boardCard.deleteBoard')}
                                </h3>
                                <p className="text-sm text-error-fg mb-1">
                                    <strong>"{board.title}"</strong>
                                </p>
                                <p className="text-xs text-error-fg">
                                    {t('dashboard.boardCard.deleteConfirmation')}
                                </p>
                            </div>

                            <div className="flex gap-3 justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={handleDelete}
                                    loading={isDeleting}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('dashboard.boardCard.deleteButton')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="relative group"
                >
                    <Card className="p-6 h-full flex flex-col hover:shadow-medium transition-all duration-300 border border-border-default hover:border-info-fg">
                        {/* Header with title and action buttons */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 mr-2">
                                <div className="flex items-start gap-2">
                                    <h3
                                        className="text-lg font-semibold text-text-primary line-clamp-2 flex-1"
                                        title={board.title}
                                        aria-label={board.title}
                                    >
                                        {board.title}
                                    </h3>
                                    {/* Role indicator */}
                                    {board.isCreator === false && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-info-bg text-info-fg mt-0.5">
                                            <UserPlus className="w-3 h-3 mr-1" />
                                            {t('dashboard.boardCard.joined')}
                                        </span>
                                    )}
                                    {board.isCreator === true && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-bg text-warning-fg mt-0.5">
                                            <Crown className="w-3 h-3 mr-1" />
                                            {t('dashboard.boardCard.creator')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {isOwner && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(true)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                                 p-1.5 rounded-lg hover:bg-info-bg
                                                 text-text-muted hover:text-info-fg"
                                        title={t('dashboard.boardCard.editTitle')}
                                        aria-label={t('dashboard.boardCard.editTitle')}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                                 p-1.5 rounded-lg hover:bg-error-bg
                                                 text-text-muted hover:text-error-fg"
                                        title={t('dashboard.boardCard.deleteTitle')}
                                        aria-label={t('dashboard.boardCard.deleteTitle')}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {board.description && (
                            <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                                {board.description}
                            </p>
                        )}

                        {/* Metadata */}
                        <div className="flex-1 flex flex-col justify-end space-y-3">
                            <div className="flex items-center justify-between text-xs text-text-muted">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(board.createdAt)}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{board.participantCount} {t('dashboard.boardCard.participants')}</span>
                                </div>
                            </div>

                            {/* Action button */}
                            <Button
                                onClick={handleViewBoard}
                                variant="primary"
                                size="sm"
                                className="w-full"
                            >
                                {t('dashboard.boardCard.openBoard')}
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            )}

            <EditRetrospectiveModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                board={board}
                onBoardUpdated={(boardId, updates) => {
                    onBoardUpdated?.(boardId, updates);
                    setShowEditModal(false);
                }}
            />
        </>
    );
};

export default BoardCard;
