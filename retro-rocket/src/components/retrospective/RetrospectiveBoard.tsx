import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock } from 'lucide-react';
import GroupableColumn from './GroupableColumn';
import UnifiedExporter from './UnifiedExporter';
import Loading from '../ui/Loading';
import { TypingProvider } from '../../contexts/TypingProvider';
import { useCards } from '../../hooks/useCards';
import { useCardGroups } from '../../hooks/useCardGroups';
import { useParticipants } from '../../hooks/useParticipants';
import { Retrospective } from '../../types/retrospective';
import { Card as CardType, CreateCardInput, EmojiReaction } from '../../types/card';
import { COLUMNS, COLUMN_ORDER } from '../../utils/constants';

interface RetrospectiveBoardProps {
    retrospective: Retrospective;
    currentUser?: string;
}

const RetrospectiveBoard: React.FC<RetrospectiveBoardProps> = ({
    retrospective,
    currentUser
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

    const {
        participants,
        loading: participantsLoading
    } = useParticipants(retrospective.id);

    // Get current user's name from participants
    const currentParticipant = participants.find(p => p.id === currentUser);
    const currentUsername = currentParticipant?.name ?? 'Usuario';

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
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                {retrospective.title}
                            </h1>
                            {retrospective.description && (
                                <p className="text-gray-600">{retrospective.description}</p>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Export Buttons */}
                            <div className="flex items-center space-x-2">
                                <UnifiedExporter
                                    retrospective={retrospective}
                                    cards={cards}
                                    groups={groups}
                                    participants={participants}
                                    variant="button"
                                    className="hidden sm:flex"
                                />
                            </div>

                            {/* Stats */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                    <Users size={16} />
                                    <span>
                                        {participantsLoading ? '...' : participants.length} participantes
                                    </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Clock size={16} />
                                    <span>
                                        {retrospective.createdAt && new Date(retrospective.createdAt).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Participants list */}
                    {!participantsLoading && participants.length > 0 && (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Participantes:</span>
                            <div className="flex items-center space-x-2">
                                {participants.slice(0, 5).map((participant) => (
                                    <span
                                        key={participant.id}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        {participant.name}
                                    </span>
                                ))}
                                {participants.length > 5 && (
                                    <span className="text-xs text-gray-500">
                                        +{participants.length - 5} más
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
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