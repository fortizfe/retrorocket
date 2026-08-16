import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Sparkles,
    Users,
    Check,
    Info,
    Eye,
    EyeOff,
    AlertTriangle
} from 'lucide-react';
import { GroupSuggestion, Card } from '@/features/boards/types/card';
import DraggableCard from '@/features/boards/retrospective/components/DraggableCard';
import Button from '@/lib/components/ui/Button';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface GroupSuggestionModalProps {
    onClose: () => void;
    suggestions: GroupSuggestion[];
    cards: Card[];
    onAcceptSuggestion: (suggestion: GroupSuggestion) => void;
    onRejectSuggestion: (suggestionId: string) => void;
    loading?: boolean;
    /** Set when AI-based grouping analysis failed (FR-008) — rendered as a distinct
     * "unavailable" state, never silently falling back to a different computation. */
    error?: string | null;
}

/**
 * Content for the grouping-suggestions panel (spec 044). Rendered by
 * `ColumnHeaderMenu.tsx` inside its own anchored, positioned, and animated floating
 * panel — this component owns only the header/body/footer visuals, not the panel's
 * positioning, entrance/exit animation, portal, or Escape/outside-click dismissal,
 * which are `useBoardMenuOverlay`'s responsibility, matching every other popup in the
 * app. Mounting/unmounting (previously this component's own `isOpen` prop) is now the
 * caller's decision, so `AnimatePresence` for the panel itself also lives upstream.
 */
export const GroupSuggestionModal: React.FC<GroupSuggestionModalProps> = ({
    onClose,
    suggestions,
    cards,
    onAcceptSuggestion,
    onRejectSuggestion,
    loading = false,
    error = null
}) => {
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<{ [key: string]: boolean }>({});
    // spec 047: per-suggestion inline title edits, keyed by suggestion.id so editing
    // or rejecting one suggestion never affects another's title (FR-006/FR-007).
    const [titleEdits, setTitleEdits] = useState<{ [suggestionId: string]: string }>({});

    const { t } = useLanguage();

    const getCardById = (cardId: string) => cards.find(card => card.id === cardId);

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.8) return 'text-success-fg bg-success-bg';
        if (similarity >= 0.6) return 'text-info-fg bg-info-bg';
        return 'text-warning-fg bg-warning-bg';
    };

    const getSimilarityLabel = (similarity: number) => {
        if (similarity >= 0.8) return t('groupSuggestion.similarityHigh');
        if (similarity >= 0.6) return t('groupSuggestion.similarityMedium');
        return t('groupSuggestion.similarityLow');
    };

    const togglePreview = (suggestionId: string) => {
        setPreviewMode(prev => ({
            ...prev,
            [suggestionId]: !prev[suggestionId]
        }));
    };

    // The current title shown for a suggestion — the user's in-progress edit if any,
    // otherwise the original AI-suggested title (FR-004).
    const titleFor = (suggestion: GroupSuggestion): string =>
        titleEdits[suggestion.id] ?? suggestion.suggestedTitle;

    const handleTitleChange = (suggestionId: string, value: string) => {
        setTitleEdits(prev => ({ ...prev, [suggestionId]: value }));
    };

    const clearTitleEdit = (suggestionId: string) => {
        setTitleEdits(prev => {
            const { [suggestionId]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const handleAccept = (suggestion: GroupSuggestion) => {
        // Carries the current (edited-or-original) title along on the suggestion
        // object itself — the caller (GroupableColumn) reads suggestion.suggestedTitle
        // to resolve what the created group's title should be (FR-004/FR-005).
        onAcceptSuggestion({ ...suggestion, suggestedTitle: titleFor(suggestion) });
        clearTitleEdit(suggestion.id);
        setSelectedSuggestion(null);
    };

    const handleReject = (suggestionId: string) => {
        onRejectSuggestion(suggestionId);
        clearTitleEdit(suggestionId);
        setSelectedSuggestion(null);
    };

    return (
        <div className="bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40 w-[420px] max-w-[90vw] max-h-[70vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-default shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-info-bg rounded-lg">
                            <Sparkles className="w-6 h-6 text-info-fg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-text-primary">
                                {t('groupSuggestion.title')}
                            </h2>
                            <p className="text-sm text-text-secondary">
                                {t('groupSuggestion.subtitle', { count: suggestions.length })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-surface-raised rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                        title={t('common.close')}
                        aria-label={t('common.close')}
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
                {error ? (
                    <div className="text-center py-12" role="alert">
                        <AlertTriangle className="w-12 h-12 text-warning-fg mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary mb-2">
                            {t('groupSuggestion.unavailableTitle')}
                        </h3>
                        <p className="text-text-muted">
                            {t('groupSuggestion.unavailableBody')}
                        </p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-info-fg"></div>
                        <span className="ml-3 text-text-secondary">{t('groupSuggestion.analyzing')}</span>
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="text-center py-12">
                        <Info className="w-12 h-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary mb-2">
                            {t('groupSuggestion.noSuggestionsTitle')}
                        </h3>
                        <p className="text-text-muted">
                            {t('groupSuggestion.noSuggestionsBody')}
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
                                    className={`border rounded-xl overflow-hidden ${isSelected ? 'border-info-fg bg-info-bg' : 'border-border-default bg-surface-raised'
                                        }`}
                                >
                                    {/* Suggestion Header */}
                                    <div className="p-4 border-b border-border-default">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-2">
                                                    <Users className="w-5 h-5 text-text-secondary" />
                                                    <span className="font-medium text-text-primary">
                                                        {t('groupSuggestion.group')} {index + 1}
                                                    </span>
                                                    <span className="text-sm text-text-muted">
                                                        ({t('groupSuggestion.cardsInGroup', { count: suggestion.cardIds.length })})
                                                    </span>
                                                </div>

                                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(suggestion.similarity)}`}>
                                                    {getSimilarityLabel(suggestion.similarity)} - {Math.round(suggestion.similarity * 100)}%
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => togglePreview(suggestion.id)}
                                                    className="p-2 hover:bg-surface-raised rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                                                    title={isPreviewMode ? t('groupSuggestion.hideCards') : t('groupSuggestion.showCards')}
                                                    aria-label={isPreviewMode ? t('groupSuggestion.hideCards') : t('groupSuggestion.showCards')}
                                                >
                                                    {isPreviewMode ? (
                                                        <EyeOff className="w-4 h-4 text-text-muted" />
                                                    ) : (
                                                        <Eye className="w-4 h-4 text-text-muted" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Inline-editable suggested title (spec 047, FR-001/FR-002/FR-003) */}
                                        <div className="mt-3">
                                            <label htmlFor={`suggestion-title-${suggestion.id}`} className="sr-only">
                                                {t('groupSuggestion.titleInputLabel')}
                                            </label>
                                            <input
                                                id={`suggestion-title-${suggestion.id}`}
                                                data-testid={`suggestion-title-input-${suggestion.id}`}
                                                type="text"
                                                value={titleFor(suggestion)}
                                                onChange={(e) => handleTitleChange(suggestion.id, e.target.value)}
                                                maxLength={35}
                                                aria-label={t('groupSuggestion.titleInputLabel')}
                                                placeholder={t('groupSuggestion.titleInputPlaceholder')}
                                                className="w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded-lg px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                            />
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
                                                <div className="p-4 bg-surface space-y-3">
                                                    {suggestionCards.map((card, cardIndex) => (
                                                        <div
                                                            key={card.id}
                                                            className={`${cardIndex === 0 ? 'ring-2 ring-info-fg/40' : ''}`}
                                                        >
                                                            {cardIndex === 0 && (
                                                                <div className="mb-2">
                                                                    <span className="inline-flex items-center space-x-1 text-xs font-medium text-info-fg bg-info-bg px-2 py-1 rounded-full">
                                                                        <Sparkles className="w-3 h-3" />
                                                                        <span>{t('groupSuggestion.suggestedHeadCard')}</span>
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
                                    <div className="p-4 bg-surface border-t border-border-default">
                                        <div className="flex items-center justify-between">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleReject(suggestion.id)}
                                                className="text-text-secondary hover:text-text-primary"
                                            >
                                                {t('groupSuggestion.discard')}
                                            </Button>

                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleAccept(suggestion)}
                                                className="flex items-center space-x-2"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>{t('groupSuggestion.createGroup')}</span>
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
                <div className="px-6 py-4 border-t border-border-default bg-surface shrink-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-text-secondary">
                            {t('groupSuggestion.footerHint')}
                        </p>
                        <Button variant="ghost" onClick={onClose}>
                            {t('common.close')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
