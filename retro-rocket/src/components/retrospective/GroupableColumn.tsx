import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Users
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import TextareaWithEmoji from '../ui/TextareaWithEmoji';
import ColorPicker from '../ui/ColorPicker';
import TypingPreview from '../ui/TypingPreview';
import { GroupCard } from './GroupCard';
import { GroupSuggestionModal } from './GroupSuggestionModal';
import ColumnHeaderMenu from './ColumnHeaderMenu';
import GroupedCardList from './GroupedCardList';
import { useTypingContext } from '../../contexts/TypingProvider';
import { Card as CardType, CreateCardInput, EmojiReaction, CardColor, CardGroup, GroupSuggestion } from '../../types/card';
import { ColumnConfig } from '../../types/retrospective';
import { getCardStyling, getSuggestedColorForColumn } from '../../utils/cardColors';
import { useColumnGrouping } from '../../hooks/useColumnGrouping';
import { GroupingCriteria } from '../../types/columnGrouping';

interface GroupableColumnProps {
    column: ColumnConfig;
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
    onSuggestionGenerate: () => GroupSuggestion[];
    currentUser?: string;
    retrospectiveId: string;
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
    retrospectiveId
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newCardContent, setNewCardContent] = useState('');
    const [selectedColor, setSelectedColor] = useState<CardColor>(() => getSuggestedColorForColumn(column.title));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

    // Get typing context
    const { startTyping, stopTyping, getTypingUsersForColumn } = useTypingContext();

    // Get typing users for this column
    const typingUsers = getTypingUsersForColumn(column.id);

    // Initialize grouping hook
    const { getColumnState, setGroupingCriteria, processCards, restorePreviousState } = useColumnGrouping(retrospectiveId);

    // Filter cards and groups for this column
    const columnCards = cards.filter(card => card.column === column.id);
    const columnGroups = groups.filter(group => group.column === column.id);
    const ungroupedCards = columnCards.filter(card => !card.groupId);

    // Get current column grouping state
    const columnState = getColumnState(column.id);

    // Process ungrouped cards with grouping - using useMemo to trigger re-render when state changes
    const processedUngroupedCards = React.useMemo(() => {
        return processCards(ungroupedCards, column.id);
    }, [processCards, ungroupedCards, columnState.criteria, column.id]);

    const handleCreateCard = async () => {
        if (!newCardContent.trim() || !currentUser) return;

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
            setSelectedColor(getSuggestedColorForColumn(column.title));
            setIsCreating(false);
        } catch (error) {
            console.error('Error creating card:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelCreate = () => {
        // Stop typing when canceling
        stopTyping(column.id);
        setIsCreating(false);
        setNewCardContent('');
        setSelectedColor(getSuggestedColorForColumn(column.title));
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
        setIsGeneratingSuggestions(true);
        try {
            const newSuggestions = onSuggestionGenerate();
            setSuggestions(newSuggestions);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Error generating suggestions:', error);
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
    };

    const totalItems = ungroupedCards.length + columnGroups.length;

    return (
        <div className="flex flex-col h-full">
            {/* Column Header */}
            <Card variant="outlined" padding="sm" className={`mb-4 ${column.color}`}>
                <div className="flex items-center space-x-2">
                    <span className="text-lg">{column.icon}</span>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {column.title}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{column.description}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>
                            {totalItems} {totalItems === 1 ? 'elemento' : 'elementos'}
                        </span>
                        {columnGroups.length > 0 && (
                            <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{columnGroups.length} grupos</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-1">
                        {/* New Grouping Menu */}
                        <ColumnHeaderMenu
                            currentGrouping={columnState.criteria}
                            onGroupingChange={(criteria: GroupingCriteria) => {
                                setGroupingCriteria(column.id, criteria);

                                // Handle special grouping modes
                                if (criteria === 'suggestions') {
                                    handleGenerateSuggestions();
                                }
                            }}
                            hasCards={ungroupedCards.length > 0}
                            disabled={!currentUser}
                        />

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsCreating(true)}
                            disabled={isCreating || !currentUser}
                            className="flex items-center space-x-1"
                        >
                            <Plus size={14} />
                            <span>Agregar</span>
                        </Button>
                    </div>
                </div>
            </Card>

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
                            className="mb-3"
                        >
                            <Card
                                variant="outlined"
                                customBackground={true}
                                className={`border-dashed border-2 transition-all duration-300 ${getCardStyling(selectedColor)}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                                        Vista previa del color
                                    </span>
                                    <ColorPicker
                                        selectedColor={selectedColor}
                                        onColorChange={setSelectedColor}
                                        size="sm"
                                    />
                                </div>

                                <TextareaWithEmoji
                                    value={newCardContent}
                                    onChange={handleTextareaChange}
                                    onBlur={handleTextareaBlur}
                                    placeholder={`¿Qué ${column.title.toLowerCase()}?`}
                                    rows={3}
                                    autoFocus
                                    className="mb-3 bg-transparent border-none focus:ring-0 resize-none"
                                    showEmojiPicker={true}
                                />
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={handleCreateCard}
                                        loading={isSubmitting}
                                        disabled={!newCardContent.trim()}
                                    >
                                        Crear tarjeta
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelCreate}
                                        disabled={isSubmitting}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Typing Preview */}
                {typingUsers.length > 0 && (
                    <TypingPreview
                        typingUsers={typingUsers}
                        className="mb-3"
                    />
                )}

                {/* Groups */}
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
                                onCardDelete={onCardDelete}
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
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
                                No hay tarjetas aún
                            </p>
                            {currentUser && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsCreating(true)}
                                    className="flex items-center space-x-1 mx-auto"
                                >
                                    <Plus size={14} />
                                    <span>Agregar primera tarjeta</span>
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Group Suggestions Modal */}
            <GroupSuggestionModal
                isOpen={showSuggestions}
                onClose={handleCloseSuggestions}
                suggestions={suggestions}
                cards={ungroupedCards}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                loading={isGeneratingSuggestions}
            />
        </div>
    );
};

export default GroupableColumn;
