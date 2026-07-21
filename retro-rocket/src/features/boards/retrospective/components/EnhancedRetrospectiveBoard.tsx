import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GroupableColumn from '@/features/boards/clustering/components/GroupableColumn';
import ActionItemsColumn from '@/features/boards/retrospective/components/ActionItemsColumn';
import MobileColumnNavigation, { SwipeableColumnContainer } from '@/lib/components/mobile/MobileColumnNavigation';
import { RetrospectiveBoardSkeleton } from '@/lib/components/ui/Skeleton';
import { TypingProvider } from '@/features/boards/retrospective/contexts/TypingProvider';
import { useOptimizedCards } from '@/features/boards/retrospective/hooks/useOptimizedCards';
import { useCardGroups } from '@/features/boards/clustering/hooks/useCardGroups';
import { useActionItems } from '@/features/boards/retrospective/hooks/useActionItems';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useRetrospectiveColumns } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { useSentiment } from '@/features/boards/sentiment/hooks/useSentiment';
import { Retrospective } from '@/features/boards/types/retrospective';
import { Card as CardType, CreateCardInput, EmojiReaction, CardGroup } from '@/features/boards/types/card';
import { ActionItem } from '@/features/boards/types/actionItem';
import { getColumns, COLUMN_ORDER } from '@/lib/utils/constants';
import { layout } from '@/lib/utils/designSystem';

interface RetrospectiveBoardProps {
    retrospective: Retrospective;
    currentUser?: string;
    onDataChange?: (cards: CardType[], groups: CardGroup[], actionItems: ActionItem[]) => void;
    participants?: any[];
    onSentimentAnalysisReady?: (sentimentAnalysis: any) => void;
}

const EnhancedRetrospectiveBoard: React.FC<RetrospectiveBoardProps> = ({
    retrospective,
    currentUser,
    onDataChange,
    participants = [],
    onSentimentAnalysisReady
}) => {
    useLanguage(); // For reactivity to language changes
    const [activeColumnId, setActiveColumnId] = useState<string>('');
    const [isInitialLoading, setIsInitialLoading] = useState(true);

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
    } = useOptimizedCards(retrospective.id);

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
        actionItems,
        loading: actionItemsLoading,
        error: actionItemsError,
        createActionItem,
        updateActionItem,
        deleteActionItem,
        convertCardToActionItem
    } = useActionItems(retrospective.id);

    const sentimentAnalysis = useSentiment(cards, retrospective.id);

    const { fullName, displayName, email, uid } = useCurrentUser();

    // Enhanced column preparation with mobile navigation support
    const { finalColumnConfigs, columnOrderArray, mobileNavigationTabs } = useMemo(() => {
        const configs = Object.keys(columnConfigs).length > 0 ? columnConfigs : getColumns();
        const order = columnOrder.length > 0 ? columnOrder : COLUMN_ORDER;

        // Prepare mobile navigation tabs
        const navTabs = order.map(columnId => ({
            id: columnId,
            title: configs[columnId as keyof typeof configs]?.title || columnId,
            icon: configs[columnId as keyof typeof configs]?.icon || '📝',
            count: (cardsByColumn[columnId] || []).length
        }));

        return {
            finalColumnConfigs: configs,
            columnOrderArray: order,
            mobileNavigationTabs: navTabs
        };
    }, [columnConfigs, columnOrder, cardsByColumn]);

    // Set initial active column for mobile
    React.useEffect(() => {
        if (!activeColumnId && columnOrderArray.length > 0) {
            setActiveColumnId(columnOrderArray[0]);
        }
    }, [activeColumnId, columnOrderArray]);

    // Handle initial loading state
    React.useEffect(() => {
        if (!columnsLoading && !cardsLoading) {
            const timer = setTimeout(() => setIsInitialLoading(false), 300);
            return () => clearTimeout(timer);
        }
    }, [columnsLoading, cardsLoading]);

    // Expose sentiment analysis
    React.useEffect(() => {
        if (onSentimentAnalysisReady) {
            onSentimentAnalysisReady({
                ...sentimentAnalysis,
                columnConfigs
            });
        }
    }, [onSentimentAnalysisReady, sentimentAnalysis, columnConfigs]);

    // Notify data changes
    React.useEffect(() => {
        if (onDataChange && cards && groups && actionItems) {
            onDataChange(cards, groups, actionItems);
        }
    }, [cards, groups, actionItems, onDataChange]);

    const currentUsername = fullName || displayName || email?.split('@')[0] || 'Usuario';
    const isFacilitator = uid === retrospective.createdBy;

    // Enhanced handlers with optimistic updates
    const handleCardCreate = async (cardInput: CreateCardInput) => {
        try {
            await createCard(cardInput);
        } catch (error) {
            console.error('❌ Error creating card:', error);
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

    const handleConvertToActionItem = (cardContent: string, assignedTo?: string, assignedToName?: string, dueDate?: Date | null) => {
        if (uid) {
            convertCardToActionItem(cardContent, uid, assignedTo, assignedToName, dueDate);
        }
    };

    const handleCreateActionItem = (input: any) => {
        createActionItem(input);
    };

    const handleEditActionItem = (id: string, updates: any) => {
        updateActionItem(id, updates);
    };

    const handleDeleteActionItem = (id: string) => {
        deleteActionItem(id);
    };

    // Mobile column navigation handlers
    const handleColumnChange = (columnId: string) => {
        setActiveColumnId(columnId);
    };

    const handleSwipe = (direction: 'left' | 'right') => {
        const currentIndex = columnOrderArray.indexOf(activeColumnId);
        if (direction === 'right' && currentIndex > 0) {
            setActiveColumnId(columnOrderArray[currentIndex - 1]);
        } else if (direction === 'left' && currentIndex < columnOrderArray.length - 1) {
            setActiveColumnId(columnOrderArray[currentIndex + 1]);
        }
    };

    // Show enhanced loading state
    if (isInitialLoading) {
        return <RetrospectiveBoardSkeleton />;
    }

    if (columnsError) {
        console.error('Failed to load columns:', columnsError);
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
                {/* Mobile Navigation */}
                <MobileColumnNavigation
                    columns={mobileNavigationTabs}
                    activeColumnId={activeColumnId}
                    onColumnChange={handleColumnChange}
                    className="lg:hidden"
                />

                {/* Desktop Grid Layout */}
                <div className={`hidden lg:grid ${layout.grid.retrospective} flex-1`}>
                    {columnOrderArray.map((columnId, index) => {
                        const column = finalColumnConfigs[columnId as keyof typeof finalColumnConfigs];
                        const columnCards = cardsByColumn[columnId] || [];

                        if (!column) {
                            console.warn(`⚠️ Column ${columnId} is undefined!`);
                            return null;
                        }

                        return (
                            <motion.div
                                key={columnId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.1,
                                    ease: 'easeOut'
                                }}
                                className="flex flex-col min-h-0"
                            >
                                <GroupableColumn
                                    column={column as any}
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
                                    participants={participants}
                                    canConvertToAction={isFacilitator}
                                    onConvertToAction={handleConvertToActionItem}
                                />
                            </motion.div>
                        );
                    })}

                    {/* Desktop Action Items Column */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.4,
                            delay: columnOrderArray.length * 0.1,
                            ease: 'easeOut'
                        }}
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

                {/* Mobile Single Column Layout */}
                <div className="lg:hidden flex-1 flex flex-col min-h-0">
                    <AnimatePresence mode="wait">
                        {columnOrderArray.map((columnId) => {
                            const column = finalColumnConfigs[columnId as keyof typeof finalColumnConfigs];
                            const columnCards = cardsByColumn[columnId] || [];

                            if (!column) return null;

                            return (
                                <SwipeableColumnContainer
                                    key={columnId}
                                    columnId={columnId}
                                    isActive={columnId === activeColumnId}
                                    onSwipe={handleSwipe}
                                    className="flex-1 flex flex-col min-h-0 px-4"
                                >
                                    <GroupableColumn
                                        column={column as any}
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
                                        participants={participants}
                                        canConvertToAction={isFacilitator}
                                        onConvertToAction={handleConvertToActionItem}
                                    />
                                </SwipeableColumnContainer>
                            );
                        })}

                        {/* Mobile Action Items - shown as separate "column" */}
                        <SwipeableColumnContainer
                            key="action-items"
                            columnId="action-items"
                            isActive={activeColumnId === 'action-items'}
                            onSwipe={handleSwipe}
                            className="flex-1 flex flex-col min-h-0 px-4"
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
                        </SwipeableColumnContainer>
                    </AnimatePresence>

                    {/* Enhanced mobile navigation with action items */}
                    <div className="fixed bottom-4 left-4 right-4 lg:hidden z-20">
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-2">
                            <div className="flex justify-center space-x-2">
                                {[...mobileNavigationTabs, {
                                    id: 'action-items',
                                    title: 'Acciones',
                                    icon: '✅',
                                    count: actionItems.length
                                }].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleColumnChange(tab.id)}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                            ${tab.id === activeColumnId
                                                ? 'bg-blue-500 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }
                                        `}
                                    >
                                        <span>{tab.icon}</span>
                                        <span className="hidden sm:inline">{tab.title}</span>
                                        {tab.count > 0 && (
                                            <span className={`
                                                px-2 py-0.5 text-xs rounded-full min-w-[20px] text-center
                                                ${tab.id === activeColumnId
                                                    ? 'bg-blue-400 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                                                }
                                            `}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TypingProvider>
    );
};

export default EnhancedRetrospectiveBoard;
