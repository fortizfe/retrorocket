import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, Crown, UserPlus, Layout, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/lib/components/ui/Button';
import Card from '@/lib/components/ui/Card';
import EditRetrospectiveModal from '@/features/dashboard/components/EditRetrospectiveModal';
import { OptimizedRetrospectiveService } from '@/lib/services/OptimizedRetrospectiveService';
import toast from 'react-hot-toast';
import { BOARD_TEMPLATES } from '@/features/create-board/boardTemplates';

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
    templateId?: string;
}

interface BoardListItemProps {
    board: Board;
    currentUserId: string;
    onBoardDeleted?: (boardId: string) => void;
    onDelete?: (boardId: string, userId: string) => Promise<void>;
    onBoardUpdated?: (boardId: string, updates: { title: string }) => void;
}

const BoardListItem: React.FC<BoardListItemProps> = ({ board, currentUserId, onBoardDeleted, onDelete, onBoardUpdated }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const handleViewBoard = () => navigate(`/retro/${board.id}`);

    const formatDate = (date: Date) => new Intl.DateTimeFormat('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);

    const getTemplateName = (templateId?: string) => {
        if (!templateId) return t('dashboard.templateDefault');
        const template = BOARD_TEMPLATES[templateId as keyof typeof BOARD_TEMPLATES];
        return template ? t(template.i18nNameKey) : t('dashboard.templateDefault');
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
        >
            {showDeleteConfirm ? (
                <Card className="p-4 border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
                    <div className="text-center space-y-3">
                        <div className="flex justify-center">
                            <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-red-900 dark:text-red-100">{t('dashboard.boardCard.deleteBoard')}</h4>
                            <p className="text-sm text-red-700 dark:text-red-300"><strong>"{board.title}"</strong></p>
                            <p className="text-xs text-red-600 dark:text-red-400">{t('dashboard.boardCard.deleteConfirmation')}</p>
                        </div>
                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>{t('common.cancel')}</Button>
                            <Button variant="danger" size="sm" onClick={async () => {
                                if (!currentUserId) return;
                                setIsDeleting(true);
                                try {
                                    if (onDelete) {
                                        await onDelete(board.id, currentUserId);
                                    } else {
                                        await OptimizedRetrospectiveService.softDeleteRetrospective(board.id, currentUserId);
                                    }
                                    setShowDeleteConfirm(false);
                                    toast.success(t('retrospective.deleteSuccess') || 'Retrospective moved to trash');
                                    onBoardDeleted?.(board.id);
                                } catch (error: unknown) {
                                    console.error('Error deleting retrospective:', error);
                                    const message = error instanceof Error ? error.message : undefined;
                                    toast.error(message || t('retrospective.deleteError') || 'Failed to delete retrospective');
                                } finally {
                                    setIsDeleting(false);
                                }
                            }} loading={isDeleting}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('dashboard.boardCard.deleteButton')}
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="flex items-center justify-between">
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate mb-1" title={board.title} aria-label={board.title}>
                                    {board.title}
                                </h3>
                                {board.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1 mb-2">
                                        {board.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                            {/* Template */}
                            <div className="flex items-center gap-1">
                                <Layout className="h-4 w-4" />
                                <span>{getTemplateName(board.templateId)}</span>
                            </div>

                            {/* Creation date */}
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(board.createdAt)}</span>
                            </div>

                            {/* Participants */}
                            <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{board.participantCount} {t('dashboard.boardCard.participants')}</span>
                            </div>

                            {/* Role indicator */}
                            {board.isCreator === false && (
                                <div className="flex items-center gap-1">
                                    <UserPlus className="h-4 w-4 text-blue-500" />
                                    <span className="text-blue-600 dark:text-blue-400">{t('dashboard.boardCard.joined')}</span>
                                </div>
                            )}
                            {board.isCreator === true && (
                                <div className="flex items-center gap-1">
                                    <Crown className="h-4 w-4 text-amber-500" />
                                    <span className="text-amber-600 dark:text-amber-400">{t('dashboard.boardCard.creator')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                        {board.createdBy === currentUserId && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(true)}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
                                    title={t('dashboard.boardCard.editTitle')}
                                    aria-label={t('dashboard.boardCard.editTitle')}
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                                    title={t('dashboard.boardCard.deleteTitle')}
                                    aria-label={t('dashboard.boardCard.deleteTitle')}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        )}

                        <Button
                            onClick={handleViewBoard}
                            variant="primary"
                            size="sm"
                            className="px-4 py-2 text-sm"
                        >
                            <span>{t('dashboard.boardCard.openBoard')}</span>
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
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
        </motion.div>
    );
};

export default BoardListItem;
