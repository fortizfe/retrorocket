import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
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
import Button from '@/lib/components/ui/Button';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useFacilitatorNotes } from '@/features/boards/facilitator/hooks/useFacilitatorNotes';
import { FacilitatorNote } from '@/features/boards/types/facilitatorNotes';

interface NotesTabProps {
    retrospectiveId: string;
    facilitatorId: string;
    /** Sourced from useRetrospectiveRealtimeSync's board state via BoardDataContext
     * (feature 019, US5) — never another facilitator's notes (FR-013). */
    notes: FacilitatorNote[];
}

interface EditingNote {
    id: string;
    content: string;
}

const NotesTab: React.FC<NotesTabProps> = ({ retrospectiveId, facilitatorId, notes: liveNotes }) => {
    const { t } = useLanguage();
    const { notes, loading, error, createNote, updateNote, deleteNote, clearError } = useFacilitatorNotes(
        retrospectiveId,
        facilitatorId,
        liveNotes
    );

    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingNote, setEditingNote] = useState<EditingNote | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
    const editNoteTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus the relevant textarea when it mounts in response to an explicit user
    // action (clicking "add"/"edit"), not via the autoFocus prop (jsx-a11y/no-autofocus).
    useEffect(() => {
        if (isCreating) {
            newNoteTextareaRef.current?.focus();
        }
    }, [isCreating]);

    useEffect(() => {
        if (editingNote?.id) {
            editNoteTextareaRef.current?.focus();
        }
    }, [editingNote?.id]);

    const handleCreateNote = async () => {
        const content = newNoteContent.trim();
        if (!content) return;

        // Close the form (and clear its content) before awaiting the network call, not
        // after: `notes` is driven by realtime sync (useFacilitatorNotes), which can
        // deliver the newly created note back into this component before createNote()'s
        // own request/response round-trip resolves. Errors still surface via the
        // separate `error` banner above, independent of isCreating.
        //
        // The content must be cleared in its OWN commit, strictly before isCreating
        // flips to false, not merely before the network call — AnimatePresence freezes
        // an exiting child's *last-rendered* element for the length of its exit
        // transition, and if both state updates below landed in the same batch, the
        // conditional `{isCreating && (...)}` would already be false in that same
        // render, so the cleared content would never actually reach the tree before
        // AnimatePresence captured the pre-clear instance (still showing the just-saved
        // text) to animate out. `flushSync` forces that clear to commit on its own,
        // so the frozen exit snapshot is always an empty textarea — never the
        // just-saved text — regardless of how fast the realtime note arrives
        // (research.md §3, feature 034; this is what broke
        // e2e/retrospective-board.spec.ts's "a facilitator note is never visible to
        // another participant's session").
        flushSync(() => {
            setNewNoteContent('');
        });
        setIsCreating(false);
        await createNote(content);
    };

    const handleStartEdit = (note: FacilitatorNote) => {
        setEditingNote({
            id: note.id,
            content: note.content
        });
    };

    const handleUpdateNote = async () => {
        const content = editingNote?.content.trim();
        if (!content || !editingNote) return;

        // Same reasoning as handleCreateNote: close the edit form before
        // awaiting, so it can't remain mounted alongside the realtime-updated
        // note content.
        const noteId = editingNote.id;
        setEditingNote(null);
        await updateNote(noteId, content);
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
                    <div className="p-2 bg-warning-bg rounded-lg">
                        <StickyNote className="w-5 h-5 text-warning-fg" />
                    </div>
                    <div>
                        <h3 className="font-medium text-text-primary">
                            {t('retrospective.facilitator.notes.title')}
                        </h3>
                        <p className="text-sm text-text-secondary">
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
                        className="p-3 bg-error-bg border border-error-fg rounded-lg"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-error-fg mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-error-fg">{error}</p>
                                <Button
                                    onClick={clearError}
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-6 px-2 text-xs text-error-fg hover:bg-error-bg"
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
                        className="bg-warning-bg border border-warning-fg/40 rounded-2xl p-4"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-warning-fg">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">{t('notes.creating')}</span>
                            </div>
                            <textarea
                                ref={newNoteTextareaRef}
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                placeholder={t('retrospective.facilitator.notes.placeholder')}
                                className="w-full p-3 text-sm border border-warning-fg rounded-lg resize-none bg-surface-raised text-text-primary placeholder-text-muted focus:ring-2 focus:ring-focus focus:border-transparent min-h-[80px]"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCreateNote}
                                    disabled={!newNoteContent.trim() || loading}
                                    variant="primary"
                                    size="sm"
                                    className="h-8"
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
                            className="bg-surface-raised/90 backdrop-blur-sm border border-border-default/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            {editingNote?.id === note.id ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-info-fg">
                                        <Edit2 className="w-4 h-4" />
                                        <span className="text-sm font-medium">{t('notes.editing')}</span>
                                    </div>
                                    <textarea
                                        ref={editNoteTextareaRef}
                                        value={editingNote.content}
                                        onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                        placeholder={t('retrospective.facilitator.notes.editPlaceholder')}
                                        className="w-full p-3 text-sm border border-info-fg rounded-lg resize-none bg-info-bg text-text-primary focus:ring-2 focus:ring-focus focus:border-transparent min-h-[80px]"
                                        rows={3}
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
                                        <p className="text-sm text-text-secondary whitespace-pre-wrap flex-1 leading-relaxed">
                                            {note.content}
                                        </p>
                                        {/* Always visible — never hover-only (research.md §3, FR-012),
                                            same defect class already fixed elsewhere in this feature. */}
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleStartEdit(note)}
                                                className="p-1.5 text-info-fg hover:bg-info-bg rounded transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                                                title={t('retrospective.facilitator.notes.editTitle')}
                                                aria-label={t('retrospective.facilitator.notes.editTitle')}
                                                type="button"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="p-1.5 text-error-fg hover:bg-error-bg rounded transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                                                title={t('retrospective.facilitator.notes.deleteTitle')}
                                                aria-label={t('retrospective.facilitator.notes.deleteTitle')}
                                                type="button"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 text-xs text-text-muted">
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
                        <div className="w-16 h-16 mx-auto mb-4 bg-surface rounded-full flex items-center justify-center">
                            <StickyNote className="w-8 h-8 text-slate-400" />
                        </div>
                        <h4 className="text-sm font-medium text-text-secondary mb-1">
                            {t('retrospective.facilitator.notes.noNotes')}
                        </h4>
                        <p className="text-xs text-text-muted mb-4">
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
                        <p className="text-sm text-text-muted">
                            {t('retrospective.facilitator.notes.loading')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesTab;
