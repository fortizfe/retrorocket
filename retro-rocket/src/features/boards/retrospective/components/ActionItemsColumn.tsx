import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, AlertCircle } from 'lucide-react';
import ActionItemCard from '@/features/boards/retrospective/components/ActionItemCard';
import Button from '@/lib/components/ui/Button';
import DatePicker from '@/lib/components/ui/DatePicker';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { ActionItem, CreateActionItemInput } from '@/features/boards/types/actionItem';
import { Participant } from '@/features/boards/types/participant';

interface ActionItemsColumnProps {
    actionItems: ActionItem[];
    participants: Participant[];
    canEdit: boolean; // Solo el facilitador puede editar
    onCreateActionItem: (input: CreateActionItemInput) => void;
    onEditActionItem: (id: string, updates: Partial<ActionItem>) => void;
    onDeleteActionItem: (id: string) => void;
    loading?: boolean;
    error?: string | null;
    retrospectiveId: string;
    facilitatorId: string;
}

const ActionItemsColumn: React.FC<ActionItemsColumnProps> = ({
    actionItems,
    participants,
    canEdit,
    onCreateActionItem,
    onEditActionItem,
    onDeleteActionItem,
    loading = false,
    error = null,
    retrospectiveId,
    facilitatorId
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);

    // Get language context
    const { t } = useLanguage();

    const handleCreate = () => {
        if (!newContent.trim()) return;

        const selectedParticipant = participants.find(p => p.userId === selectedAssignee);

        onCreateActionItem({
            content: newContent.trim(),
            retrospectiveId,
            createdBy: facilitatorId,
            assignedTo: selectedAssignee || null,
            assignedToName: selectedParticipant?.name || null,
            dueDate: selectedDueDate
        });

        // Reset form
        setNewContent('');
        setSelectedAssignee('');
        setSelectedDueDate(null);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setNewContent('');
        setSelectedAssignee('');
        setSelectedDueDate(null);
    };

    return (
        <div className="flex flex-col h-full min-w-[320px] max-w-full bg-warning-bg/60 rounded-lg border border-warning-fg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-2 border-b border-warning-fg">
                <div className="flex items-center gap-2 mb-1">
                    <Target className="w-5 h-5 text-warning-fg" />
                    <h3 className="font-bold text-warning-fg text-base">
                        {t('retrospective.actionItems.title')}
                    </h3>
                    <div className="bg-warning-bg text-warning-fg text-xs px-2 py-0.5 rounded-full font-medium">
                        {actionItems.length}
                    </div>
                </div>
                <p className="text-xs text-warning-fg">
                    {t('retrospective.actionItems.description')}
                </p>

                {!canEdit && (
                    <div className="mt-2 text-xs text-warning-fg italic">
                        {t('retrospective.facilitator.onlyFacilitatorCanCreateActions')}
                    </div>
                )}
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="m-4 p-3 bg-error-bg border border-error-fg rounded-md"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-error-fg mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-error-fg">{error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Action Item Form (only for facilitator) */}
            {canEdit && (
                <div className="p-2 border-b border-warning-fg">
                    <AnimatePresence>
                        {isCreating ? (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2"
                            >
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder={t('retrospective.actionItems.newAction')}
                                    className="w-full p-2 text-sm border border-warning-fg rounded resize-none bg-surface-raised text-text-primary placeholder-text-muted focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    rows={2}
                                    autoFocus
                                />
                                <div>
                                    <label htmlFor="new-action-assignee" className="block text-xs font-medium text-warning-fg mb-1">
                                        {t('retrospective.actionItems.responsible')}
                                    </label>
                                    <select
                                        id="new-action-assignee"
                                        value={selectedAssignee}
                                        onChange={(e) => setSelectedAssignee(e.target.value)}
                                        title={t('retrospective.actionItems.responsibleSelect')}
                                        className="w-full p-2 text-xs border border-warning-fg rounded bg-surface-raised text-text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    >
                                        <option value="">{t('retrospective.cards.unassigned')}</option>
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
                                        onClick={handleCreate}
                                        disabled={!newContent.trim() || loading}
                                        loading={loading}
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 text-xs"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        {t('retrospective.actionItems.create')}
                                    </Button>
                                    <Button
                                        onClick={handleCancel}
                                        disabled={loading}
                                        variant="ghost"
                                        size="sm"
                                        className="px-2 py-1 text-xs"
                                    >
                                        {t('retrospective.actionItems.cancel')}
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <Button
                                onClick={() => setIsCreating(true)}
                                variant="ghost"
                                size="sm"
                                className="w-full border border-dashed border-warning-fg hover:border-warning-fg text-warning-fg hover:bg-warning-bg px-2 py-1 text-xs"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('retrospective.actionItems.addActionItem')}
                            </Button>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Action Items List */}
            <div className="flex-1 overflow-y-auto p-1 space-y-2">
                <AnimatePresence>
                    {actionItems.map((actionItem) => (
                        <ActionItemCard
                            key={actionItem.id}
                            actionItem={actionItem}
                            participants={participants}
                            canEdit={canEdit}
                            onEdit={onEditActionItem}
                            onDelete={onDeleteActionItem}
                        />
                    ))}
                </AnimatePresence>

                {/* Empty State */}
                {actionItems.length === 0 && !loading && (
                    <div className="text-center py-8 text-warning-fg">
                        <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">{t('retrospective.facilitator.noActionItems')}</p>
                        <p className="text-xs mt-1 opacity-75">
                            {canEdit
                                ? t('retrospective.facilitator.createFirstActionOrConvert')
                                : t('retrospective.facilitator.facilitatorCanCreateActions')
                            }
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {loading && actionItems.length === 0 && (
                    <div className="text-center py-8 text-warning-fg">
                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm">{t('retrospective.facilitator.loadingActionItems')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionItemsColumn;
