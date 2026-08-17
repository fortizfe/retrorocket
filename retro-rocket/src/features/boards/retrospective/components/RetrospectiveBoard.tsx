import React from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import GroupableColumn from '@/features/boards/clustering/components/GroupableColumn';
import ActionItemsColumn from '@/features/boards/retrospective/components/ActionItemsColumn';
import uiPreferencesStore from '@/lib/uiPreferencesStore';
import { TypingProvider } from '@/features/boards/retrospective/contexts/TypingProvider';
import { useOptimizedCards } from '@/features/boards/retrospective/hooks/useOptimizedCards';
import { useCardGroups } from '@/features/boards/clustering/hooks/useCardGroups';
import { useActionItems } from '@/features/boards/retrospective/hooks/useActionItems';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useRetrospectiveColumns, DynamicColumnConfig, type RetrospectiveColumn } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { useBoardGridColumns } from '@/lib/hooks/useBoardGridColumns';
import { useSentiment, useSentimentSetter } from '@/features/boards/sentiment';
import { useBoardDataSetter } from '@/features/boards/retrospective/contexts/useBoardData';
import { Retrospective } from '@/features/boards/types/retrospective';
import { Card as CardType, CreateCardInput, EmojiReaction, CardGroup } from '@/features/boards/types/card';
import { ActionItem, CreateActionItemInput } from '@/features/boards/types/actionItem';
import { Participant } from '@/features/boards/types/participant';
import { getColumns, COLUMN_ORDER } from '@/lib/utils/constants';
import type { TypingStatusEntry } from '@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync';
import type { ColumnGroupingStatesStore } from '@/features/boards/types/columnGrouping';
import type { CountdownTimer, FacilitatorNote, SentimentResult } from '@/features/boards/retrospective/services/backendRetrospectiveClient';

/**
 * Per-role tinted-gradient panel background for a column, per the selected
 * "Layered Depth" direction (feature 033) — each column sits inside a
 * translucent panel whose accent hints at its role, matching the reviewed
 * prototype's `COLUMN_ACCENT` treatment.
 */
const COLUMN_ACCENT: Record<string, string> = {
    positive: 'from-success-bg/80',
    negative: 'from-error-bg/80',
    neutral: 'from-info-bg/80',
    action: 'from-warning-bg/80',
};

interface RetrospectiveBoardProps {
    retrospective: Retrospective;
    currentUser?: string;
    onDataChange?: (cards: CardType[], groups: CardGroup[], actionItems: ActionItem[]) => void;
    participants?: Participant[];
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US2) —
     * replaces this component's own Firestore onSnapshot subscription for cards. */
    cards?: CardType[];
    /** Sourced from useRetrospectiveRealtimeSync's live typingStatuses slice (feature
     * 019, US3). */
    typingStatuses?: TypingStatusEntry[];
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US4) —
     * replaces this component's own Firestore onSnapshot subscription for groups. */
    groups?: CardGroup[];
    /** Sourced from useRetrospectiveRealtimeSync's board state (021, research.md §2) —
     * replaces this component's own Firestore onSnapshot subscription for columns. */
    columns?: RetrospectiveColumn[];
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US4). */
    columnGroupingStates?: ColumnGroupingStatesStore;
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US5) —
     * threaded into BoardDataContext for RetrospectiveTopbar's CountdownTimer/
     * FacilitatorMenu (rendered outside this component's own tree). */
    timer?: CountdownTimer | null;
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US5). */
    myFacilitatorNotes?: FacilitatorNote[];
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US6) —
     * replaces this component's own Firestore onSnapshot subscription for action items. */
    actionItems?: ActionItem[];
    /** Sourced from useRetrospectiveRealtimeSync's board state (feature 019, US7) —
     * loaded once, not live-synced (spec Assumptions). */
    sentimentResults?: SentimentResult[];
}

const RetrospectiveBoard: React.FC<RetrospectiveBoardProps> = ({
    retrospective,
    currentUser,
    onDataChange,
    participants = [],
    cards: boardCards = [],
    typingStatuses = [],
    groups: boardGroups = [],
    columns: boardColumns = [],
    columnGroupingStates,
    timer = null,
    myFacilitatorNotes = [],
    actionItems: boardActionItems = [],
    sentimentResults = [],
}) => {
    // Get language context to trigger re-render when language changes
    const { t: _t } = useLanguage();

    // Dynamic columns, derived synchronously from the board state already fetched by
    // RetrospectivePage (021, research.md §2) — falls back to the default column set below.
    const { columnConfigs, columnOrder } = useRetrospectiveColumns(boardColumns);

    const [showActionColumn, setShowActionColumn] = React.useState<boolean>(() => uiPreferencesStore.getShowActionColumn());

    React.useEffect(() => {
        const unsub = uiPreferencesStore.subscribe((v) => setShowActionColumn(v));
        return unsub;
    }, []);

    // Column count → non-purgeable grid classes (FR-004/FR-005).
    const boardGrid = useBoardGridColumns(showActionColumn ? 4 : 3);

    const {
        cards,
        cardsByColumn,
        error: cardsError,
        createCard,
        updateCard,
        deleteCard,
        voteCard,
        toggleLike,
        addReaction,
        removeReaction,
        reorderCards,
    } = useOptimizedCards(retrospective.id, boardCards);

    // Card action failures (vote/like/edit/delete, incl. a session expiring mid-action)
    // surface as a toast (FR-006) rather than blocking the whole board — loading/
    // not-found/load-failure states for the board itself are already handled upstream
    // by RetrospectivePage's useRetrospectiveRealtimeSync before this component mounts.
    React.useEffect(() => {
        if (cardsError) toast.error(cardsError);
    }, [cardsError]);

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
        currentUser,
        groups: boardGroups
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
    } = useActionItems(retrospective.id, boardActionItems);

    const { fullName, displayName, email, uid } = useCurrentUser();
    const isFacilitatorFlag = uid === retrospective.createdBy;

    const sentimentAnalysis = useSentiment(cards, retrospective.id, sentimentResults);
    const setSentiment = useSentimentSetter();
    const setBoardData = useBoardDataSetter();

    // Register sentiment and board data into shared contexts; clean up on unmount.
    React.useEffect(() => {
        setSentiment(sentimentAnalysis);
        return () => setSentiment(null);
    }, [sentimentAnalysis, setSentiment]);

    React.useEffect(() => {
        setBoardData({ cards, groups, actionItems, columnConfigs, isFacilitator: isFacilitatorFlag, retrospective, participants, timer, myFacilitatorNotes });
        return () => setBoardData(null);
    }, [cards, groups, actionItems, columnConfigs, isFacilitatorFlag, retrospective, participants, timer, myFacilitatorNotes, setBoardData]);

    // Notify parent component about data changes for export functionality
    React.useEffect(() => {
        if (onDataChange && cards && groups && actionItems) {
            onDataChange(cards, groups, actionItems);
        }
    }, [cards, groups, actionItems, onDataChange]);

    // Fallback to default columns if no custom columns are found
    const finalColumnConfigs = Object.keys(columnConfigs).length > 0 ? columnConfigs : getColumns();
    const COLUMN_ORDER_ARRAY = columnOrder.length > 0 ? columnOrder : COLUMN_ORDER;

    const currentUsername = fullName || displayName || email?.split('@')[0] || 'Usuario';
    const isFacilitator = isFacilitatorFlag;


    const handleCardCreate = async (cardInput: CreateCardInput) => {
        try {
            await createCard(cardInput);
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
    const handleConvertToActionItem = (cardId: string, assignedTo?: string, assignedToName?: string, dueDate?: Date | null) => {
        convertCardToActionItem(cardId, assignedTo, assignedToName, dueDate);
    };

    // Handler para crear elemento de acción
    const handleCreateActionItem = (input: CreateActionItemInput) => {
        createActionItem(input);
    };

    // Handler para editar elemento de acción
    const handleEditActionItem = (id: string, updates: Partial<ActionItem>) => {
        updateActionItem(id, updates);
    };

    // Handler para eliminar elemento de acción
    const handleDeleteActionItem = (id: string) => {
        deleteActionItem(id);
    };

    return (
        <TypingProvider
            retrospectiveId={retrospective.id}
            currentUserId={currentUser}
            currentUsername={currentUsername}
            typingStatuses={typingStatuses}
        >
            <div className="h-full flex flex-col">
                {/* Controls row: facilitator-only controls moved to FacilitatorMenu */}
                {/* Board Grid - 3 columnas regulares + 1 columna de acciones.
                    Column count → grid classes come from useBoardGridColumns as
                    literal, non-purgeable strings so all columns share the width
                    without a horizontal scrollbar (FR-004, FR-005). */}
                <div
                    data-testid="board-grid"
                    className={`flex-1 ${boardGrid.className} gap-4 min-h-0`}
                >
                    {/* Columnas regulares de retrospectiva */}
                    {COLUMN_ORDER_ARRAY.map((columnId, index) => {
                        const column = finalColumnConfigs[columnId as keyof typeof finalColumnConfigs];
                        const columnCards = cardsByColumn[columnId] || [];

                        if (!column) {
                            console.warn(`⚠️ DEBUG Column ${columnId} is undefined!`);
                            return null;
                        }

                        const accent = COLUMN_ACCENT[(column as DynamicColumnConfig).role] || 'from-surface-raised/80';

                        return (
                            <motion.div
                                key={columnId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
                                className={`flex flex-col min-h-0 min-w-0 rounded-3xl border border-border-default/30 bg-gradient-to-b ${accent} to-surface-raised/30 backdrop-blur-sm p-3 shadow-sm`}
                            >
                                <GroupableColumn
                                    column={column as DynamicColumnConfig}
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
                                    onSuggestionGenerate={() => findSuggestions(column.id, {
                                        // 0.6 was tuned for the removed blended
                                        // Levenshtein/Jaccard text score; cosine
                                        // similarity between sentence embeddings behaves
                                        // differently, so this is recalibrated to match
                                        // semanticGroupingService.ts's own considered
                                        // default (spec 044, research.md §5) rather than
                                        // carrying over a now-meaningless magic number.
                                        threshold: 0.55,
                                        minGroupSize: 2,
                                        maxGroupSize: 6
                                    })}
                                    currentUser={currentUser}
                                    retrospectiveId={retrospective.id}
                                    columnGroupingStates={columnGroupingStates}
                                    // Props para elementos de acción
                                    participants={participants}
                                    canConvertToAction={isFacilitator}
                                    onConvertToAction={handleConvertToActionItem}
                                />
                            </motion.div>
                        );
                    })}                    {/* Columna de Elementos de Acción */}
                    {showActionColumn && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className={`flex flex-col min-h-0 rounded-3xl border border-border-default/30 bg-gradient-to-b ${COLUMN_ACCENT.action} to-surface-raised/30 backdrop-blur-sm p-3 shadow-sm`}
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
                    )}
                </div>
            </div>
        </TypingProvider>
    );
};

export default RetrospectiveBoard;