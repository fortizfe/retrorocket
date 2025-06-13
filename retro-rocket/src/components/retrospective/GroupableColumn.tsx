import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Users,
    Check,
    X
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import ColorPicker from '../ui/ColorPicker';
import { GroupCard } from './GroupCard';
import { GroupSuggestionModal } from './GroupSuggestionModal';
import ColumnHeaderMenu from './ColumnHeaderMenu';
import GroupedCardList from './GroupedCardList';
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
    const [isGroupingMode, setIsGroupingMode] = useState(false);
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

    // Initialize grouping hook
    const { getColumnState, setGroupingCriteria, processCards, restorePreviousState } = useColumnGrouping();

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
        setIsCreating(false);
        setNewCardContent('');
        setSelectedColor(getSuggestedColorForColumn(column.title));
    };

    const handleToggleGroupingMode = () => {
        if (isGroupingMode) {
            // If exiting grouping mode without creating a group, restore previous state
            restorePreviousState(column.id);
        }
        setIsGroupingMode(!isGroupingMode);
        setSelectedCards(new Set());
    };

    const handleCardSelect = (cardId: string) => {
        if (!isGroupingMode) return;

        const newSelected = new Set(selectedCards);
        if (newSelected.has(cardId)) {
            newSelected.delete(cardId);
        } else {
            newSelected.add(cardId);
        }
        setSelectedCards(newSelected);
    };

    const handleCreateGroup = async () => {
        if (selectedCards.size < 2) {
            console.warn('Cannot create group with less than 2 cards');
            return;
        }

        const cardIds = Array.from(selectedCards);
        const [headCardId, ...memberCardIds] = cardIds;

        console.log('GroupableColumn.handleCreateGroup called with:', {
            headCardId,
            memberCardIds,
            selectedCards: cardIds
        });

        try {
            console.log('Calling onGroupCreate...');
            await onGroupCreate(headCardId, memberCardIds);
            console.log('Group created successfully, resetting state');
            setSelectedCards(new Set());
            setIsGroupingMode(false);
        } catch (error) {
            console.error('Error creating group in GroupableColumn:', error);
            // Add user-visible error feedback
            alert(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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
                        <p className="text-sm text-gray-600">{column.description}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
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
                                if (criteria === 'custom') {
                                    setIsGroupingMode(true);
                                } else if (criteria === 'suggestions') {
                                    handleGenerateSuggestions();
                                } else {
                                    setIsGroupingMode(false);
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

                {/* Grouping Mode Controls */}
                <AnimatePresence>
                    {isGroupingMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 pt-3 border-t border-gray-200"
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    {selectedCards.size > 0 ? (
                                        <span>
                                            {selectedCards.size} tarjetas seleccionadas
                                        </span>
                                    ) : (
                                        <span>Selecciona 2 o más tarjetas para agrupar</span>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleToggleGroupingMode}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={handleCreateGroup}
                                        disabled={selectedCards.size < 2}
                                        className="flex items-center space-x-1"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Crear Grupo</span>
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                                    <span className="text-xs text-gray-500 italic">
                                        Vista previa del color
                                    </span>
                                    <ColorPicker
                                        selectedColor={selectedColor}
                                        onColorChange={setSelectedColor}
                                        size="sm"
                                    />
                                </div>

                                <Textarea
                                    value={newCardContent}
                                    onChange={(e) => setNewCardContent(e.target.value)}
                                    placeholder={`¿Qué ${column.title.toLowerCase()}?`}
                                    rows={3}
                                    autoFocus
                                    className="mb-3 bg-transparent border-none focus:ring-0 resize-none"
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
                    isGroupingMode={isGroupingMode}
                    selectedCards={selectedCards}
                    onCardSelect={handleCardSelect}
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
                            <p className="text-gray-500 text-sm mb-3">
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
