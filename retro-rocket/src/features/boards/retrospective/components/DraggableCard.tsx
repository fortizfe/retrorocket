import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import Card from '@/lib/components/ui/Card';
import TextareaWithEmoji from '@/lib/components/ui/TextareaWithEmoji';
import ColorPicker from '@/lib/components/ui/ColorPicker';
import CardContent from '@/features/boards/retrospective/components/CardContent';
import CardHeader from '@/features/boards/retrospective/components/CardHeader';
import CardVoteControl from '@/features/boards/retrospective/components/CardVoteControl';
import CardFooter from '@/features/boards/retrospective/components/CardFooter';
import LikeButton from '@/features/boards/retrospective/components/LikeButton';
import EmojiReactions from '@/features/boards/retrospective/components/EmojiReactions';
import CardMenu from '@/features/boards/retrospective/components/CardMenu';
import { SentimentBadge, useSentimentContext } from '@/features/boards/sentiment';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Card as CardType, EmojiReaction, CardColor } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

import { useBoardData } from '@/features/boards/retrospective/contexts/BoardDataContext';
import { groupReactions, hasUserLiked } from '@/lib/utils/cardHelpers';
import { getCardStyling, validateColor } from '@/lib/utils/cardColors';
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
    // Props para elementos de acción
    participants?: Participant[];
    canConvertToAction?: boolean;
    onConvertToAction?: (cardContent: string, assignedTo?: string, assignedToName?: string) => void;
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
    participants = [],
    canConvertToAction = false,
    onConvertToAction,
}) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(card.content);
    const [isDeleting, setIsDeleting] = useState(false);
    const { enabled, ready, getSentiment, shouldShowBadge, overrideSentiment } = useSentimentContext();
    const { isFacilitator } = useBoardData();
    const sentimentResult = (enabled && ready) ? getSentiment(card.id) : undefined;

    // Calculate reactions directly from card data
    const likesCount = card.likes?.length ?? 0;
    const isLiked = hasUserLiked(card.likes ?? [], currentUser);
    const groupedReactions = groupReactions(card.reactions ?? []);

    // Get card color styling with validation
    const cardColor = validateColor(card.color);
    const cardStyling = getCardStyling(cardColor);

    const handleSaveEdit = async () => {
        if (editContent.trim() && editContent !== card.content && onUpdate) {
            try {
                await onUpdate(card.id, { content: editContent.trim() });
                setIsEditing(false);
            } catch (error) {
                console.error('Error updating card:', error);
            }
        } else {
            setIsEditing(false);
            setEditContent(card.content);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(card.content);
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setIsDeleting(true);
        try {
            await onDelete(card.id);
        } catch (error) {
            console.error('Error deleting card:', error);
            setIsDeleting(false);
        }
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

    const handleColorChange = async (color: CardColor) => {
        if (onUpdate) {
            try {
                await onUpdate(card.id, { color });
            } catch (error) {
                console.error('Error updating card color:', error);
            }
        }
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
        <AnimatePresence>
            <motion.div
                layout
                data-testid="draggable-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.18 }}
                className={`group relative min-w-0 transition-all duration-200 ${isDragging ? 'rotate-2 shadow-xl border-info-fg' : 'mb-2'} ${cardStyling}`}
            >
                <Card
                    variant="elevated"
                    hover={!isEditing && !isDragging}
                    customBackground={true}
                    className={`p-2 group relative transition-all duration-200 ${isDragging ? 'shadow-lg border-info-fg' : ''} ${cardStyling}`}
                >
                    {/* Drag handle y Color picker compactos. The drag activator is a
                        dedicated, keyboard-focusable handle (not the whole card) — see
                        DragHandleProps. `focus-within` reveals it for keyboard users. */}
                    {!isEditing && (canEdit || dragHandleProps) && (
                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {canEdit && (
                                <ColorPicker
                                    selectedColor={cardColor}
                                    onColorChange={handleColorChange}
                                    size="sm"
                                />
                            )}
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
                    )}

                    {/* Header autor y sentimiento */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <CardHeader
                            author={card.createdBy}
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
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                placeholder={t('retrospective.card.editPlaceholder')}
                                rows={2}
                                autoFocus
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
                                cardId={card.id}
                                likesCount={likesCount}
                                isLiked={isLiked}
                                onToggleLike={handleToggleLike}
                                disabled={!onLike}
                                likes={card.likes || []}
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
                        isDeleting={isDeleting}
                        canSave={!!editContent.trim()}
                        onEdit={() => setIsEditing(true)}
                        onDelete={handleDelete}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                        actions={canConvertToAction && onConvertToAction && !isEditing ? (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <CardMenu
                                    card={card}
                                    participants={participants}
                                    canConvertToAction={canConvertToAction}
                                    onConvertToAction={onConvertToAction}
                                />
                            </div>
                        ) : undefined}
                    />
                </Card>
            </motion.div>
        </AnimatePresence>
    );
};

export default DraggableCard;