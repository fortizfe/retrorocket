import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Sparkles,
    Users,
    Check,
    Info,
    Eye,
    EyeOff
} from 'lucide-react';
import { GroupSuggestion, Card } from '../../types/card';
import DraggableCard from './DraggableCard';
import Button from '../ui/Button';

interface GroupSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestions: GroupSuggestion[];
    cards: Card[];
    onAcceptSuggestion: (suggestion: GroupSuggestion) => void;
    onRejectSuggestion: (suggestionId: string) => void;
    loading?: boolean;
}

export const GroupSuggestionModal: React.FC<GroupSuggestionModalProps> = ({
    isOpen,
    onClose,
    suggestions,
    cards,
    onAcceptSuggestion,
    onRejectSuggestion,
    loading = false
}) => {
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<{ [key: string]: boolean }>({});

    if (!isOpen) return null;

    const getCardById = (cardId: string) => cards.find(card => card.id === cardId);

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.8) return 'text-green-600 bg-green-50';
        if (similarity >= 0.6) return 'text-blue-600 bg-blue-50';
        return 'text-yellow-600 bg-yellow-50';
    };

    const getSimilarityLabel = (similarity: number) => {
        if (similarity >= 0.8) return 'Alta';
        if (similarity >= 0.6) return 'Media';
        return 'Baja';
    };

    const togglePreview = (suggestionId: string) => {
        setPreviewMode(prev => ({
            ...prev,
            [suggestionId]: !prev[suggestionId]
        }));
    };

    const handleAccept = (suggestion: GroupSuggestion) => {
        onAcceptSuggestion(suggestion);
        setSelectedSuggestion(null);
    };

    const handleReject = (suggestionId: string) => {
        onRejectSuggestion(suggestionId);
        setSelectedSuggestion(null);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Sparkles className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Sugerencias de Agrupación
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        {suggestions.length} sugerencias encontradas automáticamente
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Cerrar modal"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Analizando similitudes...</span>
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="text-center py-12">
                                <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No se encontraron sugerencias
                                </h3>
                                <p className="text-gray-500">
                                    No hay suficientes tarjetas similares para crear grupos automáticamente.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {suggestions.map((suggestion, index) => {
                                    const suggestionCards = suggestion.cardIds
                                        .map(getCardById)
                                        .filter(Boolean) as Card[];

                                    const isPreviewMode = previewMode[suggestion.id];
                                    const isSelected = selectedSuggestion === suggestion.id;

                                    return (
                                        <motion.div
                                            key={suggestion.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`border rounded-xl overflow-hidden ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                                                }`}
                                        >
                                            {/* Suggestion Header */}
                                            <div className="p-4 border-b border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex items-center space-x-2">
                                                            <Users className="w-5 h-5 text-gray-600" />
                                                            <span className="font-medium text-gray-900">
                                                                Grupo {index + 1}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                ({suggestion.cardIds.length} tarjetas)
                                                            </span>
                                                        </div>

                                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(suggestion.similarity)}`}>
                                                            {getSimilarityLabel(suggestion.similarity)} - {Math.round(suggestion.similarity * 100)}%
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => togglePreview(suggestion.id)}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                            title={isPreviewMode ? 'Ocultar tarjetas' : 'Mostrar tarjetas'}
                                                        >
                                                            {isPreviewMode ? (
                                                                <EyeOff className="w-4 h-4 text-gray-500" />
                                                            ) : (
                                                                <Eye className="w-4 h-4 text-gray-500" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Suggestion Details */}
                                                <div className="mt-3">
                                                    <p className="text-sm text-gray-700 mb-2">
                                                        <span className="font-medium">Razón:</span> {suggestion.reason}
                                                    </p>
                                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                        <span>Algoritmo: {suggestion.algorithm}</span>
                                                        {suggestion.keywords && suggestion.keywords.length > 0 && (
                                                            <span>
                                                                Palabras clave: {suggestion.keywords.join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Preview */}
                                            <AnimatePresence>
                                                {isPreviewMode && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="p-4 bg-gray-50 space-y-3">
                                                            {suggestionCards.map((card, cardIndex) => (
                                                                <div
                                                                    key={card.id}
                                                                    className={`${cardIndex === 0 ? 'ring-2 ring-blue-200' : ''}`}
                                                                >
                                                                    {cardIndex === 0 && (
                                                                        <div className="mb-2">
                                                                            <span className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                                                                <Sparkles className="w-3 h-3" />
                                                                                <span>Tarjeta principal sugerida</span>
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <DraggableCard
                                                                        card={card}
                                                                        currentUser=""
                                                                        canEdit={false}
                                                                        isDragging={false}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Actions */}
                                            <div className="p-4 bg-gray-50 border-t border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReject(suggestion.id)}
                                                        className="text-gray-600 hover:text-gray-800"
                                                    >
                                                        Descartar
                                                    </Button>

                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleAccept(suggestion)}
                                                        className="flex items-center space-x-2"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        <span>Crear Grupo</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!loading && suggestions.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Puedes aceptar múltiples sugerencias o crear grupos manualmente.
                                </p>
                                <Button variant="ghost" onClick={onClose}>
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
