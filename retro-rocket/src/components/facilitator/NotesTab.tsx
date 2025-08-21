import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    StickyNote,
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    AlertCircle,
    FileText,
    Clock
} from 'lucide-react';
import Button from '../ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import { useFacilitatorNotes } from '../../hooks/useFacilitatorNotes';
import { FacilitatorNote } from '../../types/facilitatorNotes';

interface NotesTabProps {
    retrospectiveId: string;
    facilitatorId: string;
}

interface EditingNote {
    id: string;
    content: string;
}

const NotesTab: React.FC<NotesTabProps> = ({ retrospectiveId, facilitatorId }) => {
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
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                        <StickyNote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            {t('retrospective.facilitator.notes.title')}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {notes.length} {notes.length === 1 ? t('notes.count.singular') : t('notes.count.plural')}
                        </p>
                    </div>
                </div>

                {!isCreating && (
                    <Button
                        onClick={() => setIsCreating(true)}
                        variant="primary"
                        size="sm"
                        className="h-8"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('notes.new')}
                    </Button>
                )}
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                <Button
                                    onClick={clearError}
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-6 px-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
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
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">{t('notes.creating')}</span>
                            </div>
                            <textarea
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                placeholder={t('retrospective.facilitator.notes.placeholder')}
                                className="w-full p-3 text-sm border border-yellow-200 dark:border-yellow-700 rounded-lg resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent min-h-[80px]"
                                rows={3}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCreateNote}
                                    disabled={!newNoteContent.trim() || loading}
                                    variant="primary"
                                    size="sm"
                                    className="h-8 bg-yellow-600 hover:bg-yellow-700 border-yellow-600"
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
                                    className="h-8"
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    {t('retrospective.facilitator.notes.cancel')}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notes List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {notes.map((note, index) => (
                        <motion.div
                            key={note.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg transition-all duration-200"
                        >
                            {editingNote?.id === note.id ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                        <Edit2 className="w-4 h-4" />
                                        <span className="text-sm font-medium">{t('notes.editing')}</span>
                                    </div>
                                    <textarea
                                        value={editingNote.content}
                                        onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                        placeholder={t('retrospective.facilitator.notes.editPlaceholder')}
                                        className="w-full p-3 text-sm border border-blue-200 dark:border-blue-700 rounded-lg resize-none bg-blue-50 dark:bg-blue-900/10 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                                        rows={3}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleUpdateNote}
                                            disabled={!editingNote.content.trim() || loading}
                                            variant="primary"
                                            size="sm"
                                            className="h-7"
                                        >
                                            <Check className="w-3 h-3 mr-1" />
                                            {t('retrospective.facilitator.notes.save')}
                                        </Button>
                                        <Button
                                            onClick={handleCancelEdit}
                                            variant="ghost"
                                            size="sm"
                                            className="h-7"
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            {t('retrospective.facilitator.notes.cancel')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-1 leading-relaxed">
                                            {note.content}
                                        </p>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleStartEdit(note)}
                                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                title={t('retrospective.facilitator.notes.editTitle')}
                                                type="button"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                title={t('retrospective.facilitator.notes.deleteTitle')}
                                                type="button"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatDate(note.timestamp)}</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty State */}
                {notes.length === 0 && !loading && !isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <StickyNote className="w-8 h-8 text-slate-400" />
                        </div>
                        <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                            {t('retrospective.facilitator.notes.noNotes')}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                            {t('retrospective.facilitator.notes.noNotesSubtitle')}
                        </p>
                        <Button
                            onClick={() => setIsCreating(true)}
                            variant="outline"
                            size="sm"
                            className="h-8"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('notes.createFirst')}
                        </Button>
                    </motion.div>
                )}

                {/* Loading State */}
                {loading && notes.length === 0 && (
                    <div className="text-center py-12">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('retrospective.facilitator.notes.loading')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesTab;
