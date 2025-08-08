import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, AlertCircle } from 'lucide-react';
import ActionItemCard from './ActionItemCard';
import Button from '../ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import { ActionItem, CreateActionItemInput } from '../../types/actionItem';
import { Participant } from '../../types/participant';

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
            assignedToName: selectedParticipant?.name || null
        });

        // Reset form
        setNewContent('');
        setSelectedAssignee('');
        setIsCreating(false);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setNewContent('');
        setSelectedAssignee('');
    };

    return (
        <div className="flex flex-col h-full bg-amber-50/30 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
            {/* Header */}
            <div className="p-4 border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3 mb-2">
                    <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                        {t('retrospective.actionItems.title')}
                    </h3>
                    <div className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 
                         text-xs px-2 py-1 rounded-full font-medium">
                        {actionItems.length}
                    </div>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t('retrospective.actionItems.description')}
                </p>

                {!canEdit && (
                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 italic">
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
                        className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Action Item Form (only for facilitator) */}
            {canEdit && (
                <div className="p-4 border-b border-amber-200 dark:border-amber-800">
                    <AnimatePresence>
                        {isCreating ? (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3"
                            >
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="Describe la acción a implementar..."
                                    className="w-full p-3 text-sm border border-amber-200 dark:border-amber-700 
                           rounded resize-none bg-white dark:bg-slate-800 
                           text-slate-900 dark:text-slate-100 
                           placeholder-slate-500 dark:placeholder-slate-400
                           focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    rows={3}
                                    autoFocus
                                />

                                <div>
                                    <label htmlFor="new-action-assignee" className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                                        Responsable (opcional)
                                    </label>
                                    <select
                                        id="new-action-assignee"
                                        value={selectedAssignee}
                                        onChange={(e) => setSelectedAssignee(e.target.value)}
                                        title="Seleccionar responsable"
                                        className="w-full p-2 text-sm border border-amber-200 dark:border-amber-700 
                             rounded bg-white dark:bg-slate-800 
                             text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    >
                                        <option value="">Sin asignar</option>
                                        {participants.map((participant) => (
                                            <option key={participant.id} value={participant.userId}>
                                                {participant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleCreate}
                                        disabled={!newContent.trim() || loading}
                                        loading={loading}
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Crear
                                    </Button>
                                    <Button
                                        onClick={handleCancel}
                                        disabled={loading}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <Button
                                onClick={() => setIsCreating(true)}
                                variant="ghost"
                                size="sm"
                                className="w-full border border-dashed border-amber-300 dark:border-amber-700 
                         hover:border-amber-400 dark:hover:border-amber-600 
                         text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Añadir elemento de acción
                            </Button>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Action Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                    <div className="text-center py-8 text-amber-600 dark:text-amber-400">
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
                    <div className="text-center py-8 text-amber-600 dark:text-amber-400">
                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm">{t('retrospective.facilitator.loadingActionItems')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionItemsColumn;
