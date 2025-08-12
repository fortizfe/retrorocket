import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, Crown, UserPlus, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { BOARD_TEMPLATES } from '../../templates/boardTemplates';

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
}

const BoardListItem: React.FC<BoardListItemProps> = ({ board, currentUserId }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleViewBoard = () => {
        navigate(`/retro/${board.id}`);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    };

    const getTemplateName = (templateId?: string) => {
        if (!templateId) {
            return t('dashboard.templateDefault');
        }

        const template = BOARD_TEMPLATES[templateId as keyof typeof BOARD_TEMPLATES];
        return template ? t(template.i18nNameKey) : t('dashboard.templateDefault');
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
        >
            <div className="flex items-center justify-between">
                {/* Main content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate mb-1">
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

                {/* Action button */}
                <div className="ml-4 flex-shrink-0">
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
        </motion.div>
    );
};

export default BoardListItem;
