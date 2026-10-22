import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Users, Sparkles, X } from 'lucide-react';
import { CardGroup, Card, EmojiReaction } from '@/features/boards/types/card';
import DraggableCard from '@/features/boards/retrospective/components/DraggableCard';
import type { DragHandleProps } from '@/features/boards/retrospective/components/DraggableCard';
import { getColorConfig } from '@/lib/utils/cardColors';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useItemDragFeedback, useOptionalColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { GroupTitleEditor } from './GroupTitleEditor';

/**
 * 059-drag-to-group-cards, US3 (T065) — armed group feedback (`animate` + `apple-design`;
 * contracts B3/B5b). Same visual language as SortableCard's armed card (see the decision
 * block there) so a card and a group read as the same kind of drop target: `ring-2
 * ring-action` with `ring-offset-2 ring-offset-surface` (the offset keeps the 3:1 margin in
 * dark mode), a frosted `bg-surface-raised/80 backdrop-blur-md` veil over the content and a
 * solid `bg-action text-text-inverse` "Drop to group" chip. The veil is aria-hidden: the
 * live region already speaks "Over group ...", and the text chip means colour is never the
 * only cue. Purpose: state indication, once per deliberate 180 ms dwell, so a small quick
 * entrance. Motion: the root is already a framer `motion.div` (it owns `transform`; the
 * dnd-kit transform lives on the wrapper in ColumnItemList), so the 1.02 scale is a
 * property of its `animate` target: the same 180 ms strong ease-out as the card's CSS
 * scale; framer retargets from the live value when the pointer leaves (interruptible).
 * Not a spring: 2% of scale has no room for a visible overshoot. Reduced motion: no scale
 * (`useReducedMotion`); ring, veil and chip stay. Veil/chip entrance reuse the cards'
 * `animate-drop-arm-in` / `animate-drop-badge-in` keyframes; removal is instant.
 * A new member (B5b) enters through the member list's existing AnimatePresence + layout
 * (review-animations: its stagger is already capped at 60 ms/item, 300 ms total, within
 * the 30-80 ms guideline, so nothing changes there).
 */
/**
 * 059-drag-to-group-cards, US6 (T069) — drag handles for the head and member cards
 * (`apple-design` + `emil-design-eng`; contracts D1/D7). Decisions:
 *  - Reuse DraggableCard's existing handle (the same 44px touch target, `min-h-11 min-w-11
 *    md:min-h-6 md:min-w-6`, the shared focus ring, revealed on hover AND focus-within, the
 *    project's deliberate precedent for the sortable cards' handle) so a grouped card is grabbed
 *    exactly like an ungrouped one: one gesture vocabulary (consistency), nothing new to learn.
 *  - No new chrome inside the group (deference): the group's dashed frame and connector
 *    lines already say "these belong together"; an always-visible grip on every member would
 *    add noise to the content. The handle is a real button, so keyboard and screen-reader users
 *    reach it with Tab (Space/Enter lifts, same K1-K5 flow).
 *  - Source feedback: the card dims to 50% opacity while dragged, like SortableCard's source, and
 *    the DragOverlay shows the lifted copy (spatial consistency: it visibly leaves the group).
 *    Opacity only (cheap, not layout-affecting); no new motion, so no reduced-motion branch.
 *  - Hooks cannot be conditional: each card renders through MemberDraggable, which always calls
 *    useDraggable and passes `disabled` when grouping is off or the group is read-only (D7), in
 *    which case no handle is rendered at all.
 */
const MemberDraggable: React.FC<{
    card: Card;
    groupId: string;
    enabled: boolean;
    children: (props: {
        dragHandleProps: DragHandleProps | undefined;
        isDragging: boolean;
    }) => React.ReactNode;
}> = ({ card, groupId, enabled, children }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
        id: `member:${card.id}`,
        // `card` lets the DragOverlay render the dragged member (groups carry no card objects).
        data: { type: 'member', groupId, card },
        disabled: !enabled,
    });
    return (
        <div ref={setNodeRef} className={isDragging ? 'opacity-50' : undefined}>
            {children({
                dragHandleProps: enabled ? { attributes, listeners, setActivatorNodeRef } : undefined,
                isDragging,
            })}
        </div>
    );
};

interface GroupCardProps {
    group: CardGroup;
    cards: Card[];
    onToggleCollapse: (groupId: string) => void;
    onDisbandGroup: (groupId: string) => void;
    onRemoveCardFromGroup: (cardId: string) => void;
    onCardUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onCardVote?: (cardId: string, increment: boolean) => Promise<void>;
    onCardLike?: (cardId: string, userId: string, username: string) => Promise<void>;
    onCardReaction?: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onCardReactionRemove?: (cardId: string, userId: string) => Promise<void>;
    currentUserId?: string;
    isReadOnly?: boolean;
    /**
     * Inline title editing wiring (spec 059). `autoEditTitle` opens the title in edit mode
     * (this client only: set from the drop's `createdGroupId`); `onAutoEditConsumed` is called
     * once it has. Rendered by GroupTitleEditor.
     */
    autoEditTitle?: boolean;
    onAutoEditConsumed?: () => void;
    onRenameGroup?: (groupId: string, title: string | null) => Promise<void>;
}

export const GroupCard: React.FC<GroupCardProps> = ({
    group,
    cards,
    onToggleCollapse,
    onDisbandGroup,
    onRemoveCardFromGroup,
    onCardUpdate,
    onCardVote,
    onCardLike,
    onCardReaction,
    onCardReactionRemove,
    currentUserId,
    isReadOnly = false,
    autoEditTitle = false,
    onAutoEditConsumed,
    onRenameGroup,
}) => {
    const { t } = useLanguage();
    const reducedMotion = useReducedMotion();
    const grouping = useOptionalColumnGroupingContext();
    const { isArmed, isBusy } = useItemDragFeedback(`group:${group.id}`);
    const canDrag = !!grouping?.groupingEnabled && !isReadOnly;
    const canRename = !!onRenameGroup && !isReadOnly;

    // Find head card and member cards
    const headCard = cards.find(card => card.id === group.headCardId);
    const memberCards = cards.filter(card =>
        group.memberCardIds.includes(card.id)
    ).sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));

    if (!headCard) {
        return null;
    }

    const totalCards = 1 + memberCards.length;
    const displayTitle = group.title?.trim() || t('retrospective.groupCard.defaultGroupTitle');

    // Get the primary color from the head card. Routed through
    // getColorConfig (which internally calls resolveCardColor) rather than
    // indexing CARD_COLORS directly, so a pre-curation value still stored
    // on an existing group's head card (spec 037, FR-013a) resolves to its
    // closest equivalent instead of throwing on a removed catalog member.
    const colorConfig = getColorConfig(headCard.color ?? 'pastelWhite');

    const handleDisbandGroup = () => {
        if (window.confirm(t('retrospective.groupCard.confirmUngroupCards', { totalCards }))) {
            onDisbandGroup(group.id);
        }
    };

    const handleRemoveCard = async (cardId: string) => {
        if (cardId === group.headCardId) {
            // If removing head card, disband the entire group
            handleDisbandGroup();
        } else {
            onRemoveCardFromGroup(cardId);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: isArmed && !reducedMotion ? 1.02 : 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={`relative rounded-2xl border-2 border-dashed border-border-strong bg-gradient-to-br ${colorConfig.background} ${colorConfig.border} overflow-hidden shadow-sm ${isArmed ? 'ring-2 ring-action ring-offset-2 ring-offset-surface' : ''}`}
            data-group-target={isArmed ? 'armed' : undefined}
            aria-busy={isBusy ? true : undefined}
        >
            {/* Group Header */}
            <div className="p-3 border-b border-border-default bg-surface-raised/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                        <button
                            onClick={() => onToggleCollapse(group.id)}
                            aria-expanded={!group.isCollapsed}
                            aria-label={t('retrospective.groupCard.toggleGroup', { title: displayTitle })}
                            className="flex items-center space-x-2 rounded text-text-secondary hover:text-text-primary transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            disabled={isReadOnly}
                        >
                            {group.isCollapsed ? (
                                <ChevronRight className="w-4 h-4 group-hover:text-info-fg" />
                            ) : (
                                <ChevronDown className="w-4 h-4 group-hover:text-info-fg" />
                            )}
                            <Users className="w-4 h-4" />
                        </button>

                        <div className="flex-1">
                            <h3 className="min-w-0">
                                <GroupTitleEditor
                                    title={group.title}
                                    isReadOnly={!canRename}
                                    autoEdit={autoEditTitle}
                                    onAutoEditConsumed={onAutoEditConsumed}
                                    onCommit={(next) => onRenameGroup!(group.id, next)}
                                />
                            </h3>
                            <div className="flex items-center space-x-3 text-xs text-text-muted mt-1">
                                <span className="flex items-center space-x-1">
                                    <span>📝</span>
                                    <span>{t('retrospective.groupCard.cardsCount', { count: totalCards, totalCards })}</span>
                                </span>
                                {group.totalVotes && group.totalVotes > 0 && (
                                    <span className="flex items-center space-x-1">
                                        <span>👍</span>
                                        <span>{t('retrospective.groupCard.votesCount', { count: group.totalVotes })}</span>
                                    </span>
                                )}
                                {group.totalLikes && group.totalLikes > 0 && (
                                    <span className="flex items-center space-x-1">
                                        <span>❤️</span>
                                        <span>{t('retrospective.groupCard.likesCount', { count: group.totalLikes })}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions — always rendered, never hover-gated: a hover-only mount
                        (the previous `isHovered &&` guard) put this control outside the
                        DOM entirely for keyboard/touch users, unreachable no matter how
                        they tabbed (a stricter violation than opacity-0 alone; research.md
                        §3, FR-012). */}
                    {!isReadOnly && (
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={handleDisbandGroup}
                                className="p-1.5 rounded-lg bg-error-bg text-error-fg hover:bg-error-bg/80 transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                                title={t('retrospective.groupCard.ungroupCards')}
                                aria-label={t('retrospective.groupCard.ungroupCards')}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Group Content */}
            <AnimatePresence>
                {!group.isCollapsed && (
                    <motion.div
                        layout
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        // Strong ease-out (animate skill, research.md §4): member cards
                        // entering/exiting view on expand/collapse, not a weak default tween.
                        // `height` is the sanctioned accordion exception (no transform
                        // equivalent exists for this reveal).
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-3">
                            {/* Head Card */}
                            <div className="relative">
                                {totalCards > 1 && (
                                    <div className="absolute -top-2 -left-2 z-10">
                                        <div className="bg-action text-text-inverse text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                                            <Sparkles className="w-3 h-3" />
                                            <span>{t('retrospective.groupCard.primaryCard')}</span>
                                        </div>
                                    </div>
                                )}
                                <MemberDraggable card={headCard} groupId={group.id} enabled={canDrag}>
                                    {({ dragHandleProps, isDragging }) => (
                                <DraggableCard
                                    card={headCard}
                                    dragHandleProps={dragHandleProps}
                                    isSortableDragging={isDragging}
                                    onUpdate={onCardUpdate}
                                    onDelete={() => handleRemoveCard(headCard.id)}
                                    onVote={onCardVote}
                                    onLike={onCardLike}
                                    onReaction={onCardReaction}
                                    onReactionRemove={onCardReactionRemove}
                                    currentUser={currentUserId}
                                    canEdit={!isReadOnly}
                                    isDragging={false}
                                />
                                    )}
                                </MemberDraggable>
                            </div>

                            {/* Member Cards — AnimatePresence must directly parent this list for a
                                removed member card to exit-animate (design audit finding, spec 028;
                                same class as DAF-001). Stagger delay capped at 80ms/item per the
                                30-80ms stagger guideline (was 100ms/item, uncapped). */}
                            <AnimatePresence>
                                {memberCards.map((card, index) => (
                                    <motion.div
                                        key={card.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: Math.min(index * 0.04, 0.12), duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                        className="ml-4 relative"
                                    >
                                        {/* Connection line */}
                                        <div className="absolute -left-2 top-4 w-2 h-0.5 bg-border-default"></div>
                                        <div className="absolute -left-2 top-0 w-0.5 h-full bg-border-default"></div>

                                        <MemberDraggable card={card} groupId={group.id} enabled={canDrag}>
                                            {({ dragHandleProps, isDragging }) => (
                                        <DraggableCard
                                            card={card}
                                            dragHandleProps={dragHandleProps}
                                            isSortableDragging={isDragging}
                                            onUpdate={onCardUpdate}
                                            onDelete={() => handleRemoveCard(card.id)}
                                            onVote={onCardVote}
                                            onLike={onCardLike}
                                            onReaction={onCardReaction}
                                            onReactionRemove={onCardReactionRemove}
                                            currentUser={currentUserId}
                                            canEdit={!isReadOnly}
                                            isDragging={false}
                                        />
                                            )}
                                        </MemberDraggable>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collapsed State Summary */}
            {group.isCollapsed && (
                <div className="p-4">
                    <div className="flex items-center justify-between text-sm text-text-secondary">
                        <span className="flex items-center space-x-2">
                            <span>📝</span>
                            <span>{headCard.content.substring(0, 50)}{headCard.content.length > 50 ? '...' : ''}</span>
                        </span>
                        <span className="text-xs bg-surface text-text-secondary px-2 py-1 rounded-full">
                            {t('retrospective.groupCard.moreCards', { count: memberCards.length })}
                        </span>
                    </div>
                </div>
            )}
            {isArmed && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-surface-raised/80 backdrop-blur-md animate-drop-arm-in"
                >
                    <span className="rounded-full bg-action px-3 py-1 text-sm font-medium text-text-inverse shadow-sm motion-safe:animate-drop-badge-in">
                        {t('retrospective.dragGroup.dropToGroup')}
                    </span>
                </div>
            )}
        </motion.div>
    );
};
