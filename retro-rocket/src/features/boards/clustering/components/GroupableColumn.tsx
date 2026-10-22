import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Plus,
    Users
} from 'lucide-react';
import Button from '@/lib/components/ui/Button';
import TextareaWithEmoji from '@/lib/components/ui/TextareaWithEmoji';
import ColorPicker from '@/lib/components/ui/ColorPicker';
import TypingPreview from '@/lib/components/ui/TypingPreview';
import { GroupCard } from '@/features/boards/clustering/components/GroupCard';
import ColumnItemList from '@/features/boards/clustering/components/ColumnItemList';
import ColumnDndProvider from '@/features/boards/clustering/dnd/ColumnDndProvider';
import { ColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import type { ColumnGroupingContextValue } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { buildColumnItems, computeOrder as computeColumnOrder } from '@/features/boards/clustering/dnd/columnOrder';
import type { ColumnItem, Placement } from '@/features/boards/clustering/dnd/columnOrder';
import ColumnHeaderMenu from '@/features/boards/clustering/components/ColumnHeaderMenu';
import GroupedCardList from '@/features/boards/clustering/components/GroupedCardList';
import { useTypingContext } from '@/features/boards/retrospective/contexts/useTypingContext';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Card as CardType, CreateCardInput, EmojiReaction, CardColor, CardGroup, GroupSuggestion, MoveTarget, MoveCardResult } from '@/features/boards/types/card';
import { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { getCardStyling, getDefaultColor } from '@/lib/utils/cardColors';
import { useColumnGrouping } from '@/features/boards/clustering/hooks/useColumnGrouping';
import { GroupingCriteria, ColumnGroupingStatesStore } from '@/features/boards/types/columnGrouping';
import { Participant } from '@/features/boards/types/participant';
import { GroupingConflictError } from '@/features/boards/clustering/hooks/useCardGroups';
import type { ColumnOrderEntry } from '@/features/boards/clustering/hooks/useCardGroups';
import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';

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
    /** Single-write move (reorder now; group/ungroup in the grouping stories). Spec 059. */
    onCardMove: (cardId: string, target: MoveTarget) => Promise<MoveCardResult | void>;
    /** Inline group-title rename (`null` clears back to the default title). Spec 059. */
    onGroupRename: (groupId: string, title: string | null) => Promise<void>;
    /** Precision-guard renormalisation of the whole column's order (spec 059, research §14). */
    onColumnRenormalize: (columnId: string, items: ColumnOrderEntry[]) => Promise<void>;
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
    onCardMove,
    onGroupRename,
    onColumnRenormalize,
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

    // spec 051-anonymous-board-mode, US2 (FR-004/FR-010, SC-003): GroupableColumn is
    // a descendant of the same BoardDataContext.Provider DraggableCard reads from
    // (research.md §6), so it reads the board's anonymity the same way rather than
    // needing a new prop threaded from RetrospectiveBoard.tsx.
    const { retrospective } = useBoardData();
    const isAnonymousBoard = retrospective?.isAnonymous === true;

    // Filter cards and groups for this column
    const columnCards = cards.filter(card => card.column === column.id);
    const columnGroups = groups.filter(group => group.column === column.id);
    const ungroupedCards = columnCards.filter(card => !card.groupId);

    // Get current column grouping state
    const columnState = getColumnState(column.id);

    // Display-time-only override (research.md §5): while the board is anonymous, a
    // column persisted at 'user' grouping must render as an ungrouped list — but the
    // persisted criteria itself must never be touched via setGroupingCriteria, so the
    // saved 'user' choice reappears automatically the moment anonymity is turned back
    // off. Never call setGroupingCriteria for this — it would persist to Firestore.
    const displayGroupingCriteria: GroupingCriteria =
        isAnonymousBoard && columnState.criteria === 'user' ? 'none' : columnState.criteria;

    // Process ungrouped cards with grouping - using useMemo to trigger re-render when state changes
    const processedUngroupedCards = React.useMemo(() => {
        if (displayGroupingCriteria !== columnState.criteria) {
            // Anonymity override in effect: mirror what 'none' grouping would produce,
            // without asking the hook to re-derive from the (still 'user') persisted
            // criteria.
            return { ungrouped: ungroupedCards };
        }
        return processCards(ungroupedCards, column.id, participants);
    }, [processCards, ungroupedCards, column.id, participants, displayGroupingCriteria, columnState.criteria]);

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
            // spec 047 FR-004/FR-005: suggestion.suggestedTitle is already the current
            // (edited-or-original) title as shown in the panel (GroupSuggestionModal
            // resolves that before calling onAcceptSuggestion). If it was cleared to
            // blank, fall back to a numbered "Group N" label, matching the panel's own
            // existing "Group 1"/"Group 2" numbering convention (research.md §5).
            const trimmedTitle = suggestion.suggestedTitle.trim();
            const resolvedTitle = trimmedTitle.length > 0
                ? trimmedTitle
                : `${t('groupSuggestion.group')} ${columnGroups.length + 1}`;
            await onGroupCreate(headCardId, memberCardIds, resolvedTitle);

            // Remove accepted suggestion from list
            setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

            // Clear suggestions state if all accepted
            if (suggestions.length <= 1) {
                setShowSuggestions(false);
                setSuggestions([]);
            }
        } catch (error) {
            // spec 046, FR-007a: surface a visible error rather than silently losing
            // the suggestion — the suggestion stays in the list (not removed above)
            // so the facilitator can retry.
            console.error('Error accepting suggestion:', error);
            toast.error(t('groupSuggestion.acceptError'));
        }
    };

    const handleRejectSuggestion = (suggestionId: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    };

    // spec 047, US2 (FR-008/FR-009/FR-011): when a column's mode changes away from
    // 'suggestions', every group in that column formed by accepting a suggestion must
    // be dissolved so its cards fall back to individual, ungrouped cards and get
    // re-sorted per the newly selected mode — and any pending, un-actioned suggestions
    // must be discarded along with it. Reuses the existing disband operation
    // (onGroupDisband) as its only mechanism; no new persistence path.
    const handleGroupingModeTeardown = async () => {
        setShowSuggestions(false);
        setSuggestions([]);
        setSuggestionsError(null);

        if (columnGroups.length === 0) return;

        const results = await Promise.allSettled(columnGroups.map(group => onGroupDisband(group.id)));
        const anyFailed = results.some(result => result.status === 'rejected');
        if (anyFailed) {
            results.forEach(result => {
                if (result.status === 'rejected') console.error('Failed to disband group on mode switch:', result.reason);
            });
            toast.error(t('retrospective.grouping.disbandOnSwitchError'));
        }
    };

    const handleCloseSuggestions = () => {
        // If closing suggestions without accepting any, restore previous state
        restorePreviousState(column.id);
        setShowSuggestions(false);
        setSuggestions([]);
        setSuggestionsError(null);
    };

    const totalItems = ungroupedCards.length + columnGroups.length;

    // --- Drag/grouping orchestration (spec 059, T033) -------------------------------------
    // Grouping is a mode-`none`/`suggestions` capability: in `user` mode cards stay in their
    // author sections and only reorder inside them (B8, FR-010).
    const groupingEnabled = displayGroupingCriteria !== 'user';
    const columnItems = React.useMemo(
        () => buildColumnItems(cards, groups, column.id),
        [cards, groups, column.id],
    );
    const [pendingEditGroupId, setPendingEditGroupId] = useState<string | null>(null);
    const consumePendingEdit = React.useCallback(() => setPendingEditGroupId(null), []);

    // A started-but-unfinished renormalisation; requestMove awaits it so the placement is
    // always written AFTER the column has been respaced (B9).
    const renormalizeRef = useRef<Promise<void> | null>(null);

    const computeOrder = React.useCallback((placement: Placement): number => {
        const result = computeColumnOrder(columnItems, placement);
        if ('order' in result) return result.order;

        const pending = Promise.resolve(onColumnRenormalize(column.id, result.renormalize));
        pending.catch(() => { /* surfaced to the caller through requestMove's await */ });
        renormalizeRef.current = pending;

        // The midpoint is computed on the respaced column the server will hold.
        const respaced = new Map(result.renormalize.map(entry => [`${entry.kind}:${entry.id}`, entry.order]));
        const renormalized: ColumnItem[] = columnItems.map((item): ColumnItem => {
            const order = respaced.get(item.id);
            if (order === undefined) return item;
            return item.kind === 'card'
                ? { ...item, card: { ...item.card, order } }
                : { ...item, group: { ...item.group, order } };
        });
        const again = computeColumnOrder(renormalized, placement);
        return 'order' in again ? again.order : 0;
    }, [columnItems, onColumnRenormalize, column.id]);

    const requestMove = React.useCallback(async (sourceCardId: string, target: MoveTarget): Promise<MoveCardResult | void> => {
        // B8 backstop: in the displayed mode `user` nothing may be grouped, whatever the
        // caller (drag, menu, stale closure). A plain position move is still allowed.
        if (!groupingEnabled && (target.kind === 'card' || target.kind === 'group')) return;
        const pending = renormalizeRef.current;
        renormalizeRef.current = null;
        if (pending) await pending;
        try {
            const result = await onCardMove(sourceCardId, target);
            // Only a drop that created a group opens its title for editing, and only here:
            // the other clients learn of the group through the board sync, never this state.
            if (result && result.createdGroupId) setPendingEditGroupId(result.createdGroupId);
            return result;
        } catch (error) {
            // X1: someone else changed the card or group first. Non-blocking; the board
            // keeps showing server truth. The provider announces it to screen readers.
            if (error instanceof GroupingConflictError) toast.error(t('retrospective.dragGroup.conflict'));
            throw error;
        }
    }, [onCardMove, t, groupingEnabled]);

    const groupingContext = React.useMemo<ColumnGroupingContextValue>(() => ({
        columnId: column.id,
        groupingEnabled,
        items: columnItems,
        groups: columnGroups,
        ungroupedCards,
        armedTargetId: null,
        insertionLine: null,
        busyTargetId: null,
        pendingEditGroupId,
        consumePendingEdit,
        requestMove,
        computeOrder,
        // columnGroups/ungroupedCards are derived each render from cards/groups/column.id.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [column.id, groupingEnabled, columnItems, groups, cards, pendingEditGroupId, consumePendingEdit, requestMove, computeOrder]);

    return (
        <ColumnGroupingContext.Provider value={groupingContext}>
        <div className="flex flex-col h-full min-w-0" data-card-column>
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
                        currentGrouping={displayGroupingCriteria}
                        excludeUserGrouping={isAnonymousBoard}
                        onGroupingChange={(criteria: GroupingCriteria) => {
                            const previousCriteria = columnState.criteria;

                            // FR-033 safeguard (spec 059, T074): leaving AI suggestions undoes
                            // EVERY group in the column, including hand-made ones, so ask first
                            // and persist nothing on cancel. window.confirm is kept on purpose:
                            // natively keyboard/screen-reader operable and the same idiom as
                            // GroupCard's disband confirm (apple-design: a destructive,
                            // rare, interrupting decision earns a modal; legacy groups without
                            // `origin` are treated as suggestion groups and do not trigger it).
                            if (
                                previousCriteria === 'suggestions' &&
                                criteria !== previousCriteria &&
                                columnGroups.some((g) => g.origin === 'manual') &&
                                !window.confirm(t('retrospective.grouping.confirmTeardown', { count: columnGroups.length }))
                            ) {
                                return;
                            }

                            setGroupingCriteria(column.id, criteria);

                            // Handle special grouping modes
                            if (criteria === 'suggestions') {
                                handleGenerateSuggestions();
                            } else if (previousCriteria === 'suggestions') {
                                handleGroupingModeTeardown();
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
                        data-add-card-trigger
                    >
                        <Plus size={14} />
                        <span className="hidden xl:inline">{t('retrospective.columns.add')}</span>
                    </Button>
                </div>
            </div>

            {/* Cards Container — also the column's catch-all droppable (ColumnDndProvider). */}
            <ColumnDndProvider className="flex-1 space-y-0 overflow-y-auto" onCardsReorder={onCardsReorder}>
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
                    isAnonymous={isAnonymousBoard}
                />

                {displayGroupingCriteria === 'user' ? (
                    <>
                        {/* Mode user: groups above the author sections, as before. AnimatePresence
                            must directly parent this list for a disbanded group to exit-animate
                            (design audit finding, spec 028; same class as DAF-001). */}
                        <AnimatePresence>
                            {[...columnGroups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(group => {
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
                                            autoEditTitle={pendingEditGroupId === group.id}
                                            onAutoEditConsumed={consumePendingEdit}
                                            onRenameGroup={onGroupRename}
                                        />
                                    </div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Author sections: reorder stays confined to each section (B8). */}
                        <GroupedCardList
                            groupedCards={processedUngroupedCards}
                            groupBy={displayGroupingCriteria}
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
                    </>
                ) : (
                    /* Modes none/suggestions: groups and ungrouped cards interleaved in one
                       sortable list (FR-034/FR-035). */
                    <ColumnItemList
                        items={columnItems}
                        cards={columnCards}
                        onCardUpdate={onCardUpdate}
                        onCardDelete={onCardDelete}
                        onCardVote={onCardVote}
                        onCardLike={onCardLike}
                        onCardReaction={onCardReaction}
                        onCardReactionRemove={onCardReactionRemove}
                        currentUser={currentUser}
                        participants={participants}
                        canConvertToAction={canConvertToAction}
                        onConvertToAction={onConvertToAction}
                        onGroupToggleCollapse={onGroupToggleCollapse}
                        onGroupDisband={onGroupDisband}
                        onCardRemoveFromGroup={onCardRemoveFromGroup}
                        onRenameGroup={onGroupRename}
                    />
                )}

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
            </ColumnDndProvider>
        </div>
        </ColumnGroupingContext.Provider>
    );
};

export default GroupableColumn;
