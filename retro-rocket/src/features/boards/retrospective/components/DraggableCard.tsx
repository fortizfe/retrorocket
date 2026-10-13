import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GripVertical } from 'lucide-react';
import Card from '@/lib/components/ui/Card';
import TextareaWithEmoji from '@/lib/components/ui/TextareaWithEmoji';
import CardContent from '@/features/boards/retrospective/components/CardContent';
import CardHeader from '@/features/boards/retrospective/components/CardHeader';
import CardVoteControl from '@/features/boards/retrospective/components/CardVoteControl';
import CardFooter from '@/features/boards/retrospective/components/CardFooter';
import LikeButton from '@/features/boards/retrospective/components/LikeButton';
import EmojiReactions from '@/features/boards/retrospective/components/EmojiReactions';
import CardMenu from '@/features/boards/retrospective/components/CardMenu';
import OwnerActionMenu from '@/features/boards/retrospective/components/OwnerActionMenu';
import { SentimentBadge, useSentimentContext } from '@/features/boards/sentiment';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Card as CardType, EmojiReaction, CardColor } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';
import { groupReactions, hasUserLiked, resolveDisplayName } from '@/lib/utils/cardHelpers';
import { getCardStyling, validateColor, getColorConfig } from '@/lib/utils/cardColors';
import { getPostDeleteFocusTarget } from '@/features/boards/retrospective/utils/postDeleteFocus';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

/** dnd-kit wiring for a dedicated drag handle (see SortableCard). */
export interface DragHandleProps {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
    setActivatorNodeRef: (element: HTMLElement | null) => void;
}

interface DraggableCardProps {
    card: CardType;
    /** When present, renders an operable drag handle wired to dnd-kit. */
    dragHandleProps?: DragHandleProps;
    onUpdate?: (cardId: string, updates: Partial<CardType>) => Promise<void>;
    onDelete?: (cardId: string) => Promise<void>;
    onVote?: (cardId: string, increment: boolean) => Promise<void>;
    onLike?: (cardId: string, userId: string, username: string) => Promise<void>;
    onReaction?: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onReactionRemove?: (cardId: string, userId: string) => Promise<void>;
    currentUser?: string;
    canEdit?: boolean;
    isDragging?: boolean;
    /** From `SortableCard`'s `useSortable().isDragging` (058-card-owner-action-hub,
     * T014/T015) — forwarded to `OwnerActionMenu` as `isDragging`, a separate signal
     * from `isDragging` above, which styles this drag-overlay copy of the card. */
    isSortableDragging?: boolean;
    // Props para elementos de acción
    participants?: Participant[];
    canConvertToAction?: boolean;
    onConvertToAction?: (cardId: string, assignedTo?: string, assignedToName?: string) => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
    card,
    dragHandleProps,
    onUpdate,
    onDelete,
    onVote,
    onLike,
    onReaction,
    onReactionRemove,
    currentUser = 'anonymous',
    canEdit = true,
    isDragging = false,
    isSortableDragging = false,
    participants = [],
    canConvertToAction = false,
    onConvertToAction,
}) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(card.content);
    // Optimistic colour (research.md §5, data-model.md "DraggableCard
    // additions"): shown immediately on selection, cleared once `card.color`
    // catches up (success) or reverted + toasted on rejection.
    const [pendingColor, setPendingColor] = useState<CardColor | null>(null);
    // Set when edit mode ends (Save/Cancel) so the remounted hub trigger
    // takes focus once, then cleared (research.md §7 "Edit return").
    const [restoreTriggerFocus, setRestoreTriggerFocus] = useState(false);
    // Polite live region announcing a colour change — lives on the card
    // itself (not inside the hub's panel, which unmounts on select).
    const [colorAnnouncement, setColorAnnouncement] = useState('');
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Focus the textarea when it mounts in response to an explicit user action
    // (clicking edit), not via the autoFocus prop (jsx-a11y/no-autofocus).
    useEffect(() => {
        if (isEditing) {
            editTextareaRef.current?.focus();
        }
    }, [isEditing]);

    // Clear the optimistic pin once the real-time sync delivers the same
    // value on `card.color` — avoids a flash back to the old colour before
    // sync arrives, and avoids masking a later, unrelated sync update.
    useEffect(() => {
        if (pendingColor !== null && card.color === pendingColor) {
            setPendingColor(null);
        }
    }, [card.color, pendingColor]);
    const { enabled, ready, getSentiment, shouldShowBadge, overrideSentiment } = useSentimentContext();
    const { isFacilitator, retrospective } = useBoardData();
    // spec 051-anonymous-board-mode, US2 (FR-003, SC-002): while the board is
    // anonymous, no participant's identity may be shown on any card — CardHeader
    // stays a dumb renderer of whatever string it's given (see its own tests), so
    // the gating lives here, at its only caller. `retrospective` is null only
    // before the board has loaded / for boards that predate isAnonymous, both of
    // which must keep today's behavior (author shown).
    const isAnonymousBoard = retrospective?.isAnonymous === true;
    const sentimentResult = (enabled && ready) ? getSentiment(card.id) : undefined;

    // Calculate reactions directly from card data
    const likesCount = card.likes?.length ?? 0;
    const isLiked = hasUserLiked(card.likes ?? [], currentUser);
    const groupedReactions = groupReactions(card.reactions ?? [], participants, t('retrospective.grouping.unknownAuthor'));

    // Get card color styling with validation — `pendingColor` (optimistic,
    // research.md §5) takes priority over the synced `card.color` until it
    // clears (see the effect above).
    const cardColor = pendingColor ?? validateColor(card.color);
    const cardStyling = getCardStyling(cardColor);

    const handleSaveEdit = async () => {
        if (editContent.trim() && editContent !== card.content && onUpdate) {
            try {
                await onUpdate(card.id, { content: editContent.trim() });
                setIsEditing(false);
                setRestoreTriggerFocus(true);
            } catch (error) {
                console.error('Error updating card:', error);
            }
        } else {
            setIsEditing(false);
            setEditContent(card.content);
            setRestoreTriggerFocus(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(card.content);
        setRestoreTriggerFocus(true);
    };

    const handleVote = async (increment: boolean) => {
        if (onVote) {
            await onVote(card.id, increment);
        }
    };

    const handleToggleLike = async () => {
        if (onLike) {
            await onLike(card.id, currentUser, currentUser);
        }
    };

    const handleAddReaction = async (emoji: EmojiReaction) => {
        if (onReaction) {
            await onReaction(card.id, currentUser, currentUser, emoji);
        }
    };

    const handleRemoveReaction = async () => {
        if (onReactionRemove) {
            await onReactionRemove(card.id, currentUser);
        }
    };

    // Wrapper functions for EmojiReactions component
    const handleEmojiReaction = (emoji: EmojiReaction) => {
        handleAddReaction(emoji);
    };

    const handleEmojiRemoveReaction = () => {
        handleRemoveReaction();
    };

    // Optimistic colour update (research.md §5): the card repaints immediately
    // via `pendingColor`; a rejection reverts it and shows a localized toast.
    const handleColorChangeViaHub = async (color: CardColor) => {
        setPendingColor(color);
        setColorAnnouncement(
            t('retrospective.card.ownerActions.colorChanged', { color: t(getColorConfig(color).nameKey) })
        );
        try {
            await onUpdate?.(card.id, { color });
        } catch (error) {
            console.error('Error updating card color:', error);
            setPendingColor(null);
            toast.error(t('retrospective.card.ownerActions.colorError'));
        }
    };

    // Resolves the post-delete focus target from the live DOM *before*
    // awaiting the delete (while the card is still there), and focuses it
    // only once the delete actually resolves (research.md §7). A rejection
    // propagates to `OwnerActionMenu`'s own catch, which shows the error
    // toast and returns to `confirmingDelete` — this handler does not swallow it.
    const handleDeleteViaHub = async (): Promise<void> => {
        const focusTarget = rootRef.current ? getPostDeleteFocusTarget(rootRef.current) : null;
        await onDelete?.(card.id);
        focusTarget?.focus();
    };

    const isOwner = currentUser === card.createdBy;
    const canEditCard = canEdit && isOwner;

    // Sentiment badge — shown via the SINGLE confidence rule (F3), so a badge on the
    // board is counted identically by the sentiment counts and the team-mood report.
    const sentimentBadge = React.useMemo(() => {
        if (!sentimentResult || card.column === 'actions' || !shouldShowBadge(sentimentResult)) {
            return null;
        }
        return (
            <SentimentBadge
                sentiment={sentimentResult.sentiment}
                confidence={sentimentResult.confidence}
                size="sm"
                showTooltip={true}
                isOverride={sentimentResult.isOverride === true}
                canOverride={isFacilitator}
                onOverride={(next) => overrideSentiment(card.id, next)}
            />
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sentimentResult?.sentiment, sentimentResult?.confidence, card.column, shouldShowBadge, isFacilitator, overrideSentiment]);

    return (
        // AnimatePresence lives at the list boundary (DragDropColumn.tsx), not here —
        // wrapping a single always-present child does nothing, and misleadingly implies
        // this component owns the exit-animation boundary when it doesn't (spec 028 audit).
        <motion.div
            ref={rootRef}
            layout
            data-testid="draggable-card"
            tabIndex={-1}
            data-card-focus-target
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            // Strong ease-out (research.md §4): a card arriving — whether just
            // submitted by this participant or synced in live from another —
            // should read as settling into place, not the weak default tween.
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className={`group relative min-w-0 rounded-2xl transition-[transform,box-shadow,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-focus ${isDragging ? 'rotate-2 shadow-2xl border-info-fg' : 'mb-2 shadow-md hover:shadow-lg'} ${cardStyling}`}
        >
            {/* Polite live region (data-model.md "DraggableCard additions") —
                stays mounted on the card itself, not inside OwnerActionMenu's
                panel, which unmounts as soon as a colour is picked. */}
            <div aria-live="polite" className="sr-only">{colorAnnouncement}</div>
            <Card
                variant="elevated"
                hover={!isEditing && !isDragging}
                customBackground={true}
                className={`p-2 group relative rounded-2xl transition-[box-shadow,border-color] duration-200 ${isDragging ? 'shadow-2xl border-info-fg' : ''} ${cardStyling}`}
            >
                    {/* Drag handle. The drag activator is a dedicated,
                        keyboard-focusable handle (not the whole card) — see
                        DragHandleProps. The owner colour control moved into
                        the footer's OwnerActionMenu hub (058-card-owner-
                        action-hub) — this corner now holds only the drag
                        handle, which keeps its hover/`focus-within` reveal
                        (it has no touch equivalent to provide and remains a
                        deliberate, precedented exception; spec 037's
                        always-visible-trigger rule applies to the owner hub
                        now, not to this handle). */}
                    {!isEditing && (canEdit || dragHandleProps) && (
                        <div className="absolute top-1 right-1 flex items-center gap-1">
                            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                {dragHandleProps ? (
                                    <button
                                        type="button"
                                        ref={dragHandleProps.setActivatorNodeRef}
                                        {...dragHandleProps.attributes}
                                        {...dragHandleProps.listeners}
                                        aria-label={t('retrospective.card.dragHandle')}
                                        className="cursor-grab active:cursor-grabbing text-text-muted rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                    >
                                        <GripVertical size={14} />
                                    </button>
                                ) : (
                                    <div className="cursor-grab active:cursor-grabbing">
                                        <GripVertical size={14} className="text-text-muted" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Header autor y sentimiento */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <CardHeader
                            author={isAnonymousBoard ? '' : resolveDisplayName(card.createdBy, card.createdByName, participants, t('retrospective.grouping.unknownAuthor'))}
                            badge={sentimentBadge}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                            {(card.votes !== undefined && card.votes > 0) && (
                                <CardVoteControl votes={card.votes} onVote={handleVote} />
                            )}
                        </div>
                    </div>

                    {/* Content compacto */}
                    <div className="mb-1">
                        {isEditing ? (
                            <TextareaWithEmoji
                                ref={editTextareaRef}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                placeholder={t('retrospective.card.editPlaceholder')}
                                rows={2}
                                className="w-full text-sm"
                                showEmojiPicker={true}
                            />
                        ) : (
                            <CardContent content={card.content} />
                        )}
                    </div>

                    {/* Interacciones compactas */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <LikeButton
                                likesCount={likesCount}
                                isLiked={isLiked}
                                onToggleLike={handleToggleLike}
                                disabled={!onLike}
                                likes={card.likes || []}
                                participants={participants}
                            />
                            <EmojiReactions
                                cardId={card.id}
                                groupedReactions={groupedReactions}
                                currentUserId={currentUser}
                                onReaction={handleEmojiReaction}
                                onRemoveReaction={handleEmojiRemoveReaction}
                                disabled={!onReaction}
                            />
                        </div>
                    </div>

                    {/* Footer compacto */}
                    <CardFooter
                        createdAt={card.createdAt}
                        canEdit={canEditCard}
                        isEditing={isEditing}
                        canSave={!!editContent.trim()}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                        actions={!isEditing && (canEditCard || (canConvertToAction && onConvertToAction)) ? (
                            // Always visible — never hover-only (research.md §3, FR-012),
                            // same defect class already fixed in CardFooter's edit/delete row.
                            // Order: OwnerActionMenu (058-card-owner-action-hub, contracts
                            // §4) before the facilitator's convert-to-action CardMenu —
                            // the two controls are independent and never merged (US2).
                            <div className="flex items-center gap-1">
                                {canEditCard && (
                                    <OwnerActionMenu
                                        cardId={card.id}
                                        color={cardColor}
                                        onEdit={() => setIsEditing(true)}
                                        onColorChange={handleColorChangeViaHub}
                                        onDelete={handleDeleteViaHub}
                                        isDragging={isSortableDragging}
                                        restoreFocus={restoreTriggerFocus}
                                        onFocusRestored={() => setRestoreTriggerFocus(false)}
                                    />
                                )}
                                {canConvertToAction && onConvertToAction && (
                                    <CardMenu
                                        card={card}
                                        participants={participants}
                                        canConvertToAction={canConvertToAction}
                                        onConvertToAction={onConvertToAction}
                                    />
                                )}
                            </div>
                        ) : undefined}
                    />
            </Card>
        </motion.div>
    );
};

export default DraggableCard;