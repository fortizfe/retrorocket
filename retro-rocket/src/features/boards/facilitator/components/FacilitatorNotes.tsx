import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, X, Edit2, Check, AlertCircle, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import Button from '@/lib/components/ui/Button';
import { useFacilitatorNotes } from '@/features/boards/facilitator/hooks/useFacilitatorNotes';
import { FacilitatorNote } from '@/features/boards/types/facilitatorNotes';

interface FacilitatorNotesProps {
    readonly retrospectiveId: string;
    readonly facilitatorId: string;
}

interface EditingNote {
    id: string;
    content: string;
}

export function FacilitatorNotes({ retrospectiveId, facilitatorId }: FacilitatorNotesProps) {
    const { t } = useLanguage();
    const { notes, loading, error, createNote, updateNote, deleteNote, clearError } = useFacilitatorNotes(
        retrospectiveId,
        facilitatorId
    );

    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingNote, setEditingNote] = useState<EditingNote | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateNote = async () => {
        if (!newNoteContent.trim()) return;

        await createNote(newNoteContent);
        setNewNoteContent('');
        setIsCreating(false);
    };

    const handleStartEdit = (note: FacilitatorNote) => {
        setEditingNote({
            id: note.id,
            content: note.content
        });
    };

    const handleUpdateNote = async () => {
        if (!editingNote?.content.trim()) return;

        await updateNote(editingNote.id, editingNote.content);
        setEditingNote(null);
    };

    const handleCancelEdit = () => {
        setEditingNote(null);
    };

    const handleDeleteNote = async (noteId: string) => {
        if (window.confirm(t('retrospective.facilitator.notes.deleteConfirm'))) {
            await deleteNote(noteId);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-5 h-5 text-warning-fg" />
                <h3 className="text-sm font-medium text-text-secondary">
                    {t('retrospective.facilitator.notes.title')}
                </h3>
                {/* Debug: Test icons */}
                <div className="flex gap-1 ml-2">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    <Trash2 className="w-4 h-4 text-red-600" />
                </div>
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 p-2 bg-error-bg border border-error-fg rounded-md"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-error-fg mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-error-fg">{error}</p>
                                <Button
                                    onClick={clearError}
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-6 px-2 text-xs text-error-fg"
                                >
                                    {t('retrospective.facilitator.notes.close')}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Note Creation */}
            <AnimatePresence>
                {isCreating ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 border border-border-default rounded-md bg-surface-raised"
                    >
                        <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder={t('retrospective.facilitator.notes.placeholder')}
                            className="w-full p-2 text-sm border border-border-default rounded resize-none bg-surface-raised text-text-primary placeholder-text-muted focus:ring-2 focus:ring-focus focus:border-transparent"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                            <Button
                                onClick={handleCreateNote}
                                disabled={!newNoteContent.trim() || loading}
                                size="sm"
                                className="h-7 px-3 text-xs"
                            >
                                <Check className="w-3 h-3 mr-1" />
                                {t('retrospective.facilitator.notes.save')}
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewNoteContent('');
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-xs"
                            >
                                <X className="w-3 h-3 mr-1" />
                                {t('retrospective.facilitator.notes.cancel')}
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <Button
                        onClick={() => setIsCreating(true)}
                        variant="ghost"
                        size="sm"
                        className="w-full mb-4 h-8 text-sm text-text-muted border border-dashed border-border-strong hover:border-border-strong"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('retrospective.facilitator.notes.add')}
                    </Button>
                )}
            </AnimatePresence>

            {/* Notes List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
                <AnimatePresence>
                    {notes.map((note) => (
                        <motion.div
                            key={note.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-3 bg-warning-bg border border-warning-fg rounded-md hover:bg-warning-bg transition-colors"
                        >
                            {editingNote?.id === note.id ? (
                                <div>
                                    <textarea
                                        value={editingNote.content}
                                        onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                        placeholder={t('retrospective.facilitator.notes.editPlaceholder')}
                                        className="w-full p-2 text-sm border border-warning-fg rounded resize-none bg-surface-raised text-text-primary"
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            onClick={handleUpdateNote}
                                            disabled={!editingNote.content.trim() || loading}
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                        >
                                            <Check className="w-3 h-3 mr-1" />
                                            {t('retrospective.facilitator.notes.save')}
                                        </Button>
                                        <Button
                                            onClick={handleCancelEdit}
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            {t('retrospective.facilitator.notes.cancel')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                                        {note.content}
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-text-muted">
                                            {formatDate(note.timestamp)}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleStartEdit(note)}
                                                className="h-7 px-2 text-xs rounded border border-info-fg bg-info-bg hover:bg-info-bg text-info-fg hover:text-info-fg transition-colors flex items-center justify-center font-medium"
                                                title={t('retrospective.facilitator.notes.editTitle')}
                                                type="button"
                                            >
                                                <Edit2 className="w-4 h-4 mr-1" strokeWidth={2} />
                                                {t('retrospective.facilitator.notes.edit')}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="h-7 px-2 text-xs rounded border border-error-fg bg-error-bg hover:bg-error-bg text-error-fg hover:text-error-fg transition-colors flex items-center justify-center font-medium"
                                                title={t('retrospective.facilitator.notes.deleteTitle')}
                                                type="button"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" strokeWidth={2} />
                                                {t('retrospective.facilitator.notes.delete')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {notes.length === 0 && !loading && (
                    <div className="text-center py-6 text-text-muted">
                        <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('retrospective.facilitator.notes.noNotes')}</p>
                        <p className="text-xs mt-1">{t('retrospective.facilitator.notes.noNotesSubtitle')}</p>
                    </div>
                )}

                {loading && notes.length === 0 && (
                    <div className="text-center py-6 text-text-muted">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm">{t('retrospective.facilitator.notes.loading')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
