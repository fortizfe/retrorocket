import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Trash2, Check, X, User, Calendar } from 'lucide-react';
import { ActionItem } from '@/features/boards/types/actionItem';
import { Participant } from '@/features/boards/types/participant';
import Button from '@/lib/components/ui/Button';
import LinkifyText from '@/lib/components/ui/LinkifyText';
import DatePicker from '@/lib/components/ui/DatePicker';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface ActionItemCardProps {
    actionItem: ActionItem;
    participants: Participant[];
    canEdit: boolean; // Solo el facilitador puede editar
    onEdit: (id: string, updates: Partial<ActionItem>) => void;
    onDelete: (id: string) => void;
    className?: string;
}

const ActionItemCard: React.FC<ActionItemCardProps> = ({
    actionItem,
    participants,
    canEdit,
    onEdit,
    onDelete,
    className = ''
}) => {
    const { t, currentLanguage } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(actionItem.content);
    const [selectedAssignee, setSelectedAssignee] = useState(actionItem.assignedTo || '');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(actionItem.dueDate || null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSave = () => {
        if (!editContent.trim()) return;

        setIsSaving(true);
        try {
            const selectedParticipant = participants.find(p => p.userId === selectedAssignee);
            onEdit(actionItem.id, {
                content: editContent.trim(),
                assignedTo: selectedAssignee || null,
                assignedToName: selectedParticipant?.name || null,
                dueDate: selectedDueDate
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving action item:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditContent(actionItem.content);
        setSelectedAssignee(actionItem.assignedTo || '');
        setSelectedDueDate(actionItem.dueDate || null);
    };

    const handleDelete = () => {
        if (!window.confirm(t('retrospective.actionItemCard.confirmDelete'))) {
            return;
        }

        setIsDeleting(true);
        try {
            onDelete(actionItem.id);
        } catch (error) {
            console.error('Error deleting action item:', error);
            setIsDeleting(false);
        }
    };

    const assignedParticipant = participants.find(p => p.userId === actionItem.assignedTo);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`group relative bg-warning-bg border border-warning-fg rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-150 ${className}`}
        >
            {/* Header con indicador de elemento de acción */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1">
                    <span className="text-warning-fg text-base font-bold">🎯</span>
                    <span className="text-xs text-warning-fg font-bold">
                        {t('retrospective.actionItems.actionLabel')}
                    </span>
                </div>

                {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsEditing(true)}
                            disabled={isEditing || isDeleting}
                            className="p-1 rounded hover:bg-warning-bg text-warning-fg transition-colors"
                            title={t('retrospective.actionItemCard.editAction')}
                        >
                            <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isEditing || isDeleting}
                            className="p-1 rounded hover:bg-error-bg text-error-fg transition-colors"
                            title={t('retrospective.actionItemCard.deleteAction')}
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Contenido del elemento de acción */}
            <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.div
                        key="editing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                    >
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 text-xs border border-warning-fg rounded resize-none bg-surface-raised text-text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            rows={2}
                            placeholder={t('retrospective.actionItemCard.placeholder')}
                            autoFocus
                        />
                        <div>
                            <label htmlFor={`assignee-${actionItem.id}`} className="block text-xs font-medium text-warning-fg mb-1">
                                {t('retrospective.actionItems.responsible')}
                            </label>
                            <select
                                id={`assignee-${actionItem.id}`}
                                value={selectedAssignee}
                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                title={t('retrospective.actionItems.responsibleSelect')}
                                className="w-full p-2 text-xs border border-warning-fg rounded bg-surface-raised text-text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            >
                                <option value="">{t('retrospective.actionItemCard.unassigned')}</option>
                                {participants.map((participant) => (
                                    <option key={participant.id} value={participant.userId}>
                                        {participant.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <DatePicker
                                label={t('retrospective.actionItems.dueDate')}
                                value={selectedDueDate}
                                onChange={setSelectedDueDate}
                                placeholder={t('retrospective.actionItems.dueDatePlaceholder')}
                                minDate={new Date()}
                                className="text-xs"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                disabled={!editContent.trim() || isSaving}
                                loading={isSaving}
                                size="sm"
                                className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <Check className="w-3 h-3 mr-1" />
                                {t('retrospective.actionItemCard.save')}
                            </Button>
                            <Button
                                onClick={handleCancel}
                                disabled={isSaving}
                                variant="ghost"
                                size="sm"
                                className="px-2 py-1 text-xs"
                            >
                                <X className="w-3 h-3 mr-1" />
                                {t('retrospective.actionItemCard.cancel')}
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="viewing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LinkifyText
                            text={actionItem.content}
                            className="text-xs text-text-secondary mb-2 whitespace-pre-wrap"
                        />
                        {assignedParticipant && (
                            <div className="flex items-center gap-1 p-1 bg-warning-bg rounded border border-warning-fg">
                                <User className="w-3 h-3 text-warning-fg" />
                                <span className="text-xs text-warning-fg font-medium">
                                    {t('retrospective.actionItemCard.responsible')}: {assignedParticipant.name}
                                </span>
                            </div>
                        )}
                        {actionItem.dueDate && (
                            <div className="flex items-center gap-1 p-1 bg-info-bg rounded border border-info-fg">
                                <Calendar className="w-3 h-3 text-info-fg" />
                                <span className="text-xs text-info-fg font-medium">
                                    {t('retrospective.actionItems.dueDateDisplay', {
                                        date: actionItem.dueDate.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })
                                    })}
                                </span>
                            </div>
                        )}
                        <div className="mt-1 text-xs text-text-muted">
                            {t('retrospective.actionItemCard.created')}: {actionItem.createdAt.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Indicador de carga si se está eliminando */}
            {isDeleting && (
                <div className="absolute inset-0 bg-error-bg/90 
                       rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent 
                         rounded-full animate-spin" />
                </div>
            )}
        </motion.div>
    );
};

export default ActionItemCard;
