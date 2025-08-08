import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Trash2, Check, X, User } from 'lucide-react';
import { ActionItem } from '../../types/actionItem';
import { Participant } from '../../types/participant';
import Button from '../ui/Button';
import LinkifyText from '../ui/LinkifyText';

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
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(actionItem.content);
    const [selectedAssignee, setSelectedAssignee] = useState(actionItem.assignedTo || '');
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
                assignedToName: selectedParticipant?.name || null
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
    };

    const handleDelete = () => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este elemento de acción?')) {
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`group relative bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 
                  rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
        >
            {/* Header con indicador de elemento de acción */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">🎯</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        ACCIÓN
                    </span>
                </div>

                {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsEditing(true)}
                            disabled={isEditing || isDeleting}
                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 
                       text-amber-600 dark:text-amber-400 transition-colors"
                            title="Editar elemento de acción"
                        >
                            <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isEditing || isDeleting}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-800/30 
                       text-red-500 dark:text-red-400 transition-colors"
                            title="Eliminar elemento de acción"
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
                        className="space-y-3"
                    >
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 text-sm border border-amber-200 dark:border-amber-700 
                       rounded resize-none bg-white dark:bg-slate-800 
                       text-slate-900 dark:text-slate-100 
                       focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            rows={3}
                            placeholder="Describe la acción a implementar..."
                            autoFocus
                        />

                        {/* Selector de responsable */}
                        <div>
                            <label htmlFor={`assignee-${actionItem.id}`} className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                                Responsable (opcional)
                            </label>
                            <select
                                id={`assignee-${actionItem.id}`}
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
                                onClick={handleSave}
                                disabled={!editContent.trim() || isSaving}
                                loading={isSaving}
                                size="sm"
                                className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <Check className="w-3 h-3 mr-1" />
                                Guardar
                            </Button>
                            <Button
                                onClick={handleCancel}
                                disabled={isSaving}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-xs"
                            >
                                <X className="w-3 h-3 mr-1" />
                                Cancelar
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
                            className="text-sm text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap"
                        />

                        {/* Responsable asignado */}
                        {assignedParticipant && (
                            <div className="flex items-center gap-2 p-2 bg-amber-100 dark:bg-amber-800/20 
                            rounded border border-amber-200 dark:border-amber-700">
                                <User className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                    Responsable: {assignedParticipant.name}
                                </span>
                            </div>
                        )}

                        {/* Timestamp */}
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Creado: {actionItem.createdAt.toLocaleDateString('es-ES', {
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
                <div className="absolute inset-0 bg-red-50/80 dark:bg-red-900/20 
                       rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent 
                         rounded-full animate-spin" />
                </div>
            )}
        </motion.div>
    );
};

export default ActionItemCard;
