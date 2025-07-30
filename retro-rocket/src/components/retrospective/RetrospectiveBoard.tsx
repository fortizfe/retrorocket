import React from 'react';
import { motion } from 'framer-motion';
import GroupableColumn from './GroupableColumn';
import Loading from '../ui/Loading';
import { TypingProvider } from '../../contexts/TypingProvider';
import { useCards } from '../../hooks/useCards';
import { useCardGroups } from '../../hooks/useCardGroups';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Retrospective } from '../../types/retrospective';
import { Card as CardType, CreateCardInput, EmojiReaction, CardGroup } from '../../types/card';
import { COLUMNS, COLUMN_ORDER } from '../../utils/constants';

interface RetrospectiveBoardProps {
    retrospective: Retrospective;
    currentUser?: string;
    onDataChange?: (cards: CardType[], groups: CardGroup[]) => void;
}

const RetrospectiveBoard: React.FC<RetrospectiveBoardProps> = ({
    retrospective,
    currentUser,
    onDataChange
}) => {
    const {
        cards,
        cardsByColumn,
        loading: cardsLoading,
        error: cardsError,
        createCard,
        updateCard,
        deleteCard,
        voteCard,
        toggleLike,
        addReaction,
        removeReaction,
        reorderCards
    } = useCards(retrospective.id);

    const {
        groups,
        createGroup,
        disbandGroup,
        removeFromGroup,
        toggleGroupCollapse,
        findSuggestions
    } = useCardGroups({
        retrospectiveId: retrospective.id,
        cards,
        currentUser
    });

    // Get current user's name using useCurrentUser hook for more reliable data
    const { fullName, displayName, email } = useCurrentUser();
    const currentUsername = fullName || displayName || email?.split('@')[0] || 'Usuario';

    const handleCardCreate = async (cardInput: CreateCardInput) => {
        await createCard(cardInput);
    };

    const handleCardUpdate = async (cardId: string, updates: Partial<CardType>) => {
        await updateCard(cardId, updates);
    };

    const handleCardDelete = async (cardId: string) => {
        await deleteCard(cardId);
    };

    const handleCardVote = async (cardId: string, increment: boolean) => {
        await voteCard(cardId, increment);
    };

    const handleCardLike = async (cardId: string, userId: string, username: string) => {
        await toggleLike(cardId, userId, username);
    };

    const handleCardReaction = async (cardId: string, userId: string, username: string, emoji: EmojiReaction) => {
        await addReaction(cardId, userId, username, emoji);
    };

    const handleCardReactionRemove = async (cardId: string, userId: string) => {
        await removeReaction(cardId, userId);
    };

    const handleCardsReorder = async (updates: Array<{ cardId: string; order: number; column?: string }>) => {
        await reorderCards(updates);
    };

    // Notify parent component about data changes for export functionality
    React.useEffect(() => {
        if (onDataChange && cards && groups) {
            onDataChange(cards, groups);
        }
    }, [cards, groups, onDataChange]);

    if (cardsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading size="lg" text="Cargando retrospectiva..." />
            </div>
        );
    }

    if (cardsError) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-red-600 mb-2">Error al cargar las tarjetas</p>
                    <p className="text-gray-500 text-sm">{cardsError}</p>
                </div>
            </div>
        );
    }

    return (
        <TypingProvider
            retrospectiveId={retrospective.id}
            currentUserId={currentUser}
            currentUsername={currentUsername}
        >
            <div className="h-full flex flex-col">
                {/* Header with info */}
                <div className="mb-6">
                </div>

                {/* Board Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
                    {COLUMN_ORDER.map((columnId, index) => (
                        <motion.div
                            key={columnId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="flex flex-col min-h-0"
                        >
                            <GroupableColumn
                                column={COLUMNS[columnId]}
                                cards={cardsByColumn[columnId] || []}
                                groups={groups}
                                onCardCreate={handleCardCreate}
                                onCardUpdate={handleCardUpdate}
                                onCardDelete={handleCardDelete}
                                onCardVote={handleCardVote}
                                onCardLike={handleCardLike}
                                onCardReaction={handleCardReaction}
                                onCardReactionRemove={handleCardReactionRemove}
                                onCardsReorder={handleCardsReorder}
                                onGroupCreate={createGroup}
                                onGroupDisband={disbandGroup}
                                onGroupToggleCollapse={toggleGroupCollapse}
                                onCardRemoveFromGroup={removeFromGroup}
                                onSuggestionGenerate={() => findSuggestions({
                                    threshold: 0.6,
                                    minGroupSize: 2,
                                    maxGroupSize: 6
                                })}
                                currentUser={currentUser}
                                retrospectiveId={retrospective.id}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </TypingProvider>
    );
};

export default RetrospectiveBoard;