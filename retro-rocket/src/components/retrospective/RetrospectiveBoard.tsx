import React from 'react';
import { motion } from 'framer-motion';
import GroupableColumn from './GroupableColumn';
import ActionItemsColumn from './ActionItemsColumn';
import Loading from '../ui/Loading';
import { TypingProvider } from '../../contexts/TypingProvider';
import { useCards } from '../../hooks/useCards';
import { useCardGroups } from '../../hooks/useCardGroups';
import { useActionItems } from '../../hooks/useActionItems';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useLanguage } from '../../hooks/useLanguage';
import { useRetrospectiveColumns } from '../../hooks/useRetrospectiveColumns';
import { Retrospective } from '../../types/retrospective';
import { Card as CardType, CreateCardInput, EmojiReaction, CardGroup } from '../../types/card';
import { ActionItem } from '../../types/actionItem';
import { getColumns, COLUMN_ORDER } from '../../utils/constants';

interface RetrospectiveBoardProps {
    retrospective: Retrospective;
    currentUser?: string;
    onDataChange?: (cards: CardType[], groups: CardGroup[], actionItems: ActionItem[]) => void;
    participants?: any[]; // Necesitamos los participantes para el menú de conversión
}

const RetrospectiveBoard: React.FC<RetrospectiveBoardProps> = ({
    retrospective,
    currentUser,
    onDataChange,
    participants = []
}) => {
    // Get language context to trigger re-render when language changes
    useLanguage();

    // Get dynamic columns from Firestore or fallback to default
    const {
        columnConfigs,
        columnOrder,
        loading: columnsLoading,
        error: columnsError
    } = useRetrospectiveColumns(retrospective.id);

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

    // Hook para elementos de acción
    const {
        actionItems,
        loading: actionItemsLoading,
        error: actionItemsError,
        createActionItem,
        updateActionItem,
        deleteActionItem,
        convertCardToActionItem
    } = useActionItems(retrospective.id);

    // Get current user's name using useCurrentUser hook for more reliable data
    const { fullName, displayName, email, uid } = useCurrentUser();

    // Notify parent component about data changes for export functionality
    React.useEffect(() => {
        if (onDataChange && cards && groups && actionItems) {
            onDataChange(cards, groups, actionItems);
        }
    }, [cards, groups, actionItems, onDataChange]);

    // Fallback to default columns if no custom columns are found
    const finalColumnConfigs = Object.keys(columnConfigs).length > 0 ? columnConfigs : getColumns();
    const COLUMN_ORDER_ARRAY = columnOrder.length > 0 ? columnOrder : COLUMN_ORDER;

    // DEBUG: Log column information
    console.log('🔍 DEBUG RetrospectiveBoard:', {
        retrospectiveId: retrospective.id,
        columnsLoading,
        columnsError,
        columnConfigsKeys: Object.keys(columnConfigs),
        columnOrder,
        finalColumnConfigsKeys: Object.keys(finalColumnConfigs),
        COLUMN_ORDER_ARRAY
    });

    // Show loading state while columns are being fetched
    if (columnsLoading) {
        return <Loading />;
    }

    // Show error state if columns failed to load, but continue with fallback
    if (columnsError) {
        console.error('Failed to load columns:', columnsError);
    }

    const currentUsername = fullName || displayName || email?.split('@')[0] || 'Usuario';

    // Check if current user is facilitator (owner of the retrospective)
    const isFacilitator = uid === retrospective.createdBy;

    const handleCardCreate = async (cardInput: CreateCardInput) => {
        console.log('🔍 DEBUG handleCardCreate called with:', cardInput);
        try {
            await createCard(cardInput);
            console.log('✅ DEBUG Card created successfully');
        } catch (error) {
            console.error('❌ DEBUG Error creating card:', error);
            throw error;
        }
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

    // Handler para convertir tarjeta a elemento de acción
    const handleConvertToActionItem = (cardContent: string, assignedTo?: string, assignedToName?: string) => {
        if (uid) {
            convertCardToActionItem(cardContent, uid, assignedTo, assignedToName);
        }
    };

    // Handler para crear elemento de acción
    const handleCreateActionItem = (input: any) => {
        createActionItem(input);
    };

    // Handler para editar elemento de acción
    const handleEditActionItem = (id: string, updates: any) => {
        updateActionItem(id, updates);
    };

    // Handler para eliminar elemento de acción
    const handleDeleteActionItem = (id: string) => {
        deleteActionItem(id);
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
                </div>

                {/* Board Grid - 3 columnas regulares + 1 columna de acciones */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                    {/* Columnas regulares de retrospectiva */}
                    {COLUMN_ORDER_ARRAY.map((columnId, index) => {
                        const column = finalColumnConfigs[columnId as keyof typeof finalColumnConfigs];
                        const columnCards = cardsByColumn[columnId] || [];

                        console.log(`🔍 DEBUG Column ${columnId}:`, {
                            columnId,
                            column,
                            hasColumn: !!column,
                            columnCardsCount: columnCards.length
                        });

                        if (!column) {
                            console.warn(`⚠️ DEBUG Column ${columnId} is undefined!`);
                            return null;
                        }

                        return (
                            <motion.div
                                key={columnId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className="flex flex-col min-h-0"
                            >
                                <GroupableColumn
                                    column={column as any} // Type assertion needed for compatibility
                                    cards={columnCards}
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
                                    // Props para elementos de acción
                                    participants={participants}
                                    canConvertToAction={isFacilitator}
                                    onConvertToAction={handleConvertToActionItem}
                                />
                            </motion.div>
                        );
                    })}                    {/* Columna de Elementos de Acción */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className="flex flex-col min-h-0"
                    >
                        <ActionItemsColumn
                            actionItems={actionItems}
                            participants={participants}
                            canEdit={isFacilitator}
                            onCreateActionItem={handleCreateActionItem}
                            onEditActionItem={handleEditActionItem}
                            onDeleteActionItem={handleDeleteActionItem}
                            loading={actionItemsLoading}
                            error={actionItemsError}
                            retrospectiveId={retrospective.id}
                            facilitatorId={uid || ''}
                        />
                    </motion.div>
                </div>
            </div>
        </TypingProvider>
    );
};

export default RetrospectiveBoard;