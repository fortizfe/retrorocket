import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, X, Edit2, Check, AlertCircle, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { useFacilitatorNotes } from '../../hooks/useFacilitatorNotes';
import { FacilitatorNote } from '../../types/facilitatorNotes';

interface FacilitatorNotesProps {
    readonly retrospectiveId: string;
    readonly facilitatorId: string;
}

interface EditingNote {
    id: string;
    content: string;
}

export function FacilitatorNotes({ retrospectiveId, facilitatorId }: FacilitatorNotesProps) {
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
        if (window.confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
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
                <StickyNote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notas del Facilitador
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
                        className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                <Button
                                    onClick={clearError}
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-6 px-2 text-xs text-red-600 dark:text-red-400"
                                >
                                    Cerrar
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
                        className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                    >
                        <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Escribe tu nota aquí..."
                            className="w-full p-2 text-sm border border-gray-200 dark:border-gray-600 rounded resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                Guardar
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
                                Cancelar
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <Button
                        onClick={() => setIsCreating(true)}
                        variant="ghost"
                        size="sm"
                        className="w-full mb-4 h-8 text-sm text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir nota
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
                            className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
                        >
                            {editingNote?.id === note.id ? (
                                <div>
                                    <textarea
                                        value={editingNote.content}
                                        onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                        placeholder="Editar nota..."
                                        className="w-full p-2 text-sm border border-yellow-300 dark:border-yellow-600 rounded resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                                            Guardar
                                        </Button>
                                        <Button
                                            onClick={handleCancelEdit}
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {note.content}
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(note.timestamp)}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleStartEdit(note)}
                                                className="h-7 px-2 text-xs rounded border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-center font-medium"
                                                title="Editar nota"
                                                type="button"
                                            >
                                                <Edit2 className="w-4 h-4 mr-1" strokeWidth={2} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="h-7 px-2 text-xs rounded border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-800/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center justify-center font-medium"
                                                title="Eliminar nota"
                                                type="button"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" strokeWidth={2} />
                                                Borrar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {notes.length === 0 && !loading && (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                        <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay notas aún</p>
                        <p className="text-xs mt-1">Añade notas para hacer seguimiento de la retrospectiva</p>
                    </div>
                )}

                {loading && notes.length === 0 && (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm">Cargando notas...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
