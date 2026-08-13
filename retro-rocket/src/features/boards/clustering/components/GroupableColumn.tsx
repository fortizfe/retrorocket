import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Users
} from 'lucide-react';
import Button from '@/lib/components/ui/Button';
import TextareaWithEmoji from '@/lib/components/ui/TextareaWithEmoji';
import ColorPicker from '@/lib/components/ui/ColorPicker';
import TypingPreview from '@/lib/components/ui/TypingPreview';
import { GroupCard } from '@/features/boards/clustering/components/GroupCard';
import ColumnHeaderMenu from '@/features/boards/clustering/components/ColumnHeaderMenu';
import GroupedCardList from '@/features/boards/clustering/components/GroupedCardList';
import { useTypingContext } from '@/features/boards/retrospective/contexts/useTypingContext';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Card as CardType, CreateCardInput, EmojiReaction, CardColor, CardGroup, GroupSuggestion } from '@/features/boards/types/card';
import { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { getCardStyling, getDefaultColor } from '@/lib/utils/cardColors';
import { useColumnGrouping } from '@/features/boards/clustering/hooks/useColumnGrouping';
import { GroupingCriteria, ColumnGroupingStatesStore } from '@/features/boards/types/columnGrouping';
import { Participant } from '@/features/boards/types/participant';

interface GroupableColumnProps {
    column: DynamicColumnConfig; // Changed from ColumnConfig to DynamicColumnConfig
    cards: CardType[];
    groups: CardGroup[];
    onCardCreate: (cardInput: CreateCardInput) => Promise<void>;
    onCardUpdate: (cardId: string, updates: Partial<CardType>) => Promise<void>;
    onCardDelete: (cardId: string) => Promise<void>;
    onCardVote: (cardId: string, increment: boolean) => Promise<void>;
    onCardLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onCardReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onCardReactionRemove: (cardId: string, userId: string) => Promise<void>;
    onCardsReorder: (updates: Array<{ cardId: string; order: number; column?: string }>) => Promise<void>;
    onGroupCreate: (headCardId: string, memberCardIds: string[], customTitle?: string) => Promise<string>;
    onGroupDisband: (groupId: string) => Promise<void>;
    onGroupToggleCollapse: (groupId: string) => Promise<void>;
    onCardRemoveFromGroup: (cardId: string) => Promise<void>;
    onSuggestionGenerate: () => Promise<GroupSuggestion[]>;
    currentUser?: string;
    retrospectiveId: string;
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US4). */
    columnGroupingStates?: ColumnGroupingStatesStore;
    // Props para elementos de acción
    participants?: Participant[];
    canConvertToAction?: boolean;
    onConvertToAction?: (cardId: string, assignedTo?: string, assignedToName?: string) => void;
}

const GroupableColumn: React.FC<GroupableColumnProps> = ({
    column,
    cards,
    groups,
    onCardCreate,
    onCardUpdate,
    onCardDelete,
    onCardVote,
    onCardLike,
    onCardReaction,
    onCardReactionRemove,
    onCardsReorder,
    onGroupCreate,
    onGroupDisband,
    onGroupToggleCollapse,
    onCardRemoveFromGroup,
    onSuggestionGenerate,
    currentUser,
    retrospectiveId,
    columnGroupingStates,
    participants = [],
    canConvertToAction = false,
    onConvertToAction,
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newCardContent, setNewCardContent] = useState('');
    const [selectedColor, setSelectedColor] = useState<CardColor>(() => getDefaultColor());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
    const newCardTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus the new-card textarea when the form is mounted in response to an explicit
    // user action (clicking "Add") — imperative, not the `autoFocus` prop, so it's not
    // flagged by jsx-a11y/no-autofocus while preserving the same UX (research.md §4).
    useEffect(() => {
        if (isCreating) {
            newCardTextareaRef.current?.focus();
        }
    }, [isCreating]);

    // Get typing context
    const { startTyping, stopTyping, getTypingUsersForColumn } = useTypingContext();

    // Get language context
    const { t } = useLanguage();

    // Get typing users for this column
    const typingUsers = getTypingUsersForColumn(column.id);

    // Initialize grouping hook
    const { getColumnState, setGroupingCriteria, processCards, restorePreviousState } = useColumnGrouping(retrospectiveId, columnGroupingStates);

    // Filter cards and groups for this column
    const columnCards = cards.filter(card => card.column === column.id);
    const columnGroups = groups.filter(group => group.column === column.id);
    const ungroupedCards = columnCards.filter(card => !card.groupId);

    // Get current column grouping state
    const columnState = getColumnState(column.id);

    // Process ungrouped cards with grouping - using useMemo to trigger re-render when state changes
    const processedUngroupedCards = React.useMemo(() => {
        return processCards(ungroupedCards, column.id, participants);
    }, [processCards, ungroupedCards, column.id, participants]);

    const handleCreateCard = async () => {
        if (!newCardContent.trim() || !currentUser) {
            return;
        }

        // Stop typing when submitting
        stopTyping(column.id);

        setIsSubmitting(true);
        try {
            const cardInput: CreateCardInput = {
                content: newCardContent.trim(),
                column: column.id,
                createdBy: currentUser,
                retrospectiveId,
                color: selectedColor
            };

            await onCardCreate(cardInput);
            setNewCardContent('');
            setSelectedColor(getDefaultColor());
            setIsCreating(false);
        } catch (error) {
            console.error('❌ DEBUG Error creating card in GroupableColumn:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelCreate = () => {
        // Stop typing when canceling
        stopTyping(column.id);
        setIsCreating(false);
        setNewCardContent('');
        setSelectedColor(getDefaultColor());
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNewCardContent(value);

        // Start typing when user begins typing
        if (value.length > 0) {
            startTyping(column.id);
        } else {
            stopTyping(column.id);
        }
    };

    const handleTextareaBlur = () => {
        // Stop typing when textarea loses focus
        setTimeout(() => {
            stopTyping(column.id);
        }, 1000); // Small delay to avoid flickering
    };

    const handleGenerateSuggestions = async () => {
        // Open the panel immediately, in its loading state (FR-007) — AI-based
        // generation is a real async round-trip (worker + model inference), unlike the
        // old synchronous algorithm, so the panel must not wait for it to resolve
        // before appearing at all.
        setSuggestions([]);
        setSuggestionsError(null);
        setShowSuggestions(true);
        setIsGeneratingSuggestions(true);
        try {
            const newSuggestions = await onSuggestionGenerate();
            setSuggestions(newSuggestions);
        } catch (error) {
            // AI analysis unavailable (FR-008) — the panel stays open, showing a
            // distinct unavailable state (ColumnHeaderMenu/GroupSuggestionModal) rather
            // than silently falling back to any other computation.
            console.error('Error generating suggestions:', error);
            setSuggestionsError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion: GroupSuggestion) => {
        try {
            const [headCardId, ...memberCardIds] = suggestion.cardIds;
            await onGroupCreate(headCardId, memberCardIds);

            // Remove accepted suggestion from list
            setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

            // Clear suggestions state if all accepted
            if (suggestions.length <= 1) {
                setShowSuggestions(false);
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Error accepting suggestion:', error);
        }
    };

    const handleRejectSuggestion = (suggestionId: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    };

    const handleCloseSuggestions = () => {
        // If closing suggestions without accepting any, restore previous state
        restorePreviousState(column.id);
        setShowSuggestions(false);
        setSuggestions([]);
        setSuggestionsError(null);
    };

    const totalItems = ungroupedCards.length + columnGroups.length;

    return (
        <div className="flex flex-col h-full min-w-0">
            {/* Column Header — no background of its own: this column already sits
                inside RetrospectiveBoard.tsx's translucent, role-tinted gradient
                panel (feature 033, "Layered Depth"), so a second opaque card here
                would fight it rather than compose with it. */}
            <div className="mb-3 px-1 space-y-1">
                {/* Row 1: title + card count — the one piece of information this header
                    exists to convey, so it alone gets to be the flexible/growable element;
                    every sibling here is `shrink-0` (feature 034, US2 — previously shared a
                    row with the group/add controls, which made the title the first thing to
                    get crowded out under space pressure). */}
                <div data-testid="column-header-row-title" className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{column.icon}</span>
                    <h2 className="text-sm font-semibold text-text-primary truncate min-w-0 flex-1">
                        {column.title}
                    </h2>
                    <span className="text-xs font-medium text-text-secondary bg-surface-raised/70 rounded-full px-2 py-0.5 shadow-sm shrink-0">
                        {totalItems}
                    </span>
                    {columnGroups.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-text-muted shrink-0">
                            <Users className="w-3 h-3" />
                            {t('retrospective.columns.groupsCount', { count: columnGroups.length })}
                        </span>
                    )}
                </div>

                {/* Row 2: subtitle/description — omitted entirely (not just hidden) when the
                    column has none, so no empty gap is reserved. */}
                {column.description && (
                    <p data-testid="column-header-row-subtitle" className="text-xs text-text-muted truncate">
                        {column.description}
                    </p>
                )}

                {/* Row 3: group + add controls — moved off the title row so neither control
                    competes with the title for space. */}
                <div data-testid="column-header-row-controls" className="flex items-center gap-1">
                    <ColumnHeaderMenu
                        currentGrouping={columnState.criteria}
                        onGroupingChange={(criteria: GroupingCriteria) => {
                            setGroupingCriteria(column.id, criteria);

                            // Handle special grouping modes
                            if (criteria === 'suggestions') {
                                handleGenerateSuggestions();
                            }
                        }}
                        hasCards={true}
                        disabled={!currentUser}
                        suggestionsOpen={showSuggestions}
                        suggestions={suggestions}
                        suggestionCards={ungroupedCards}
                        suggestionsLoading={isGeneratingSuggestions}
                        suggestionsError={suggestionsError}
                        onAcceptSuggestion={handleAcceptSuggestion}
                        onRejectSuggestion={handleRejectSuggestion}
                        onCloseSuggestions={handleCloseSuggestions}
                    />

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsCreating(true)}
                        disabled={isCreating || !currentUser}
                        className="flex items-center space-x-1"
                        aria-label={t('retrospective.columns.add')}
                    >
                        <Plus size={14} />
                        <span className="hidden xl:inline">{t('retrospective.columns.add')}</span>
                    </Button>
                </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 space-y-0 overflow-y-auto">
                {/* New Card Form */}
                <AnimatePresence>
                    {isCreating && (
                        <motion.div
                            key="new-card-form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                            className="mb-3"
                        >
                            <div
                                className={`rounded-2xl bg-surface-raised/70 backdrop-blur-sm shadow-sm p-3 transition-[background-color,border-color] duration-300 ${getCardStyling(selectedColor)}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-text-muted italic">
                                        {t('retrospective.columns.colorPreview')}
                                    </span>
                                    <ColorPicker
                                        selectedColor={selectedColor}
                                        onColorChange={setSelectedColor}
                                        size="sm"
                                    />
                                </div>

                                <TextareaWithEmoji
                                    ref={newCardTextareaRef}
                                    value={newCardContent}
                                    onChange={handleTextareaChange}
                                    onBlur={handleTextareaBlur}
                                    placeholder={t(`retrospective.columns.placeholders.${column.id}`, {
                                        defaultValue: t('retrospective.columns.placeholder', { columnTitle: column.title.toLowerCase() })
                                    })}
                                    rows={3}
                                    className="mb-3 bg-transparent border-none focus:ring-0 resize-none"
                                    showEmojiPicker={true}
                                />
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => {
                                            handleCreateCard();
                                        }}
                                        loading={isSubmitting}
                                        disabled={!newCardContent.trim()}
                                    >
                                        {t('retrospective.columns.createCard')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelCreate}
                                        disabled={isSubmitting}
                                    >
                                        {t('retrospective.columns.cancel')}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Typing Preview — always rendered (even with zero typists) so its
                    accessible live region (feature 026, FR-009) is already present in
                    the DOM before the first typing event, not mounted alongside it. */}
                <TypingPreview
                    typingUsers={typingUsers}
                    className="mb-3"
                />

                {/* Groups — AnimatePresence must directly parent this list for a disbanded
                    group to exit-animate (design audit finding, spec 028; same class as
                    DAF-001). */}
                <AnimatePresence>
                    {columnGroups.map(group => {
                        const groupCards = cards.filter(card =>
                            card.id === group.headCardId || group.memberCardIds.includes(card.id)
                        );

                        return (
                            <div key={group.id} className="mb-3">
                                <GroupCard
                                    group={group}
                                    cards={groupCards}
                                    onToggleCollapse={onGroupToggleCollapse}
                                    onDisbandGroup={onGroupDisband}
                                    onRemoveCardFromGroup={onCardRemoveFromGroup}
                                    onCardUpdate={onCardUpdate}
                                    onCardVote={onCardVote}
                                    onCardLike={onCardLike}
                                    onCardReaction={onCardReaction}
                                    onCardReactionRemove={onCardReactionRemove}
                                    currentUserId={currentUser}
                                    isReadOnly={false}
                                />
                            </div>
                        );
                    })}
                </AnimatePresence>

                {/* Ungrouped Cards with New Grouping */}
                <GroupedCardList
                    groupedCards={processedUngroupedCards}
                    groupBy={columnState.criteria}
                    onCardUpdate={onCardUpdate}
                    onCardDelete={onCardDelete}
                    onCardVote={onCardVote}
                    onCardLike={onCardLike}
                    onCardReaction={onCardReaction}
                    onCardReactionRemove={onCardReactionRemove}
                    onCardsReorder={onCardsReorder}
                    currentUser={currentUser}
                    participants={participants}
                    canConvertToAction={canConvertToAction}
                    onConvertToAction={onConvertToAction}
                />

                {/* Empty State */}
                <AnimatePresence>
                    {totalItems === 0 && !isCreating && (
                        <motion.div
                            key="empty-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-8"
                        >
                            <div className="text-4xl mb-2">{column.icon}</div>
                            <p className="text-text-muted text-sm mb-3">
                                {t('retrospective.columns.noCards')}
                            </p>
                            {currentUser && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsCreating(true)}
                                    className="flex items-center space-x-1 mx-auto"
                                >
                                    <Plus size={14} />
                                    <span>{t('retrospective.columns.addFirstCard')}</span>
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default GroupableColumn;
