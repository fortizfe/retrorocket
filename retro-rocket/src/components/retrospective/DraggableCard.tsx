import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ThumbsUp, Edit2, User, GripVertical } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import TextareaWithEmoji from '../ui/TextareaWithEmoji';
import ColorPicker from '../ui/ColorPicker';
import LinkifyText from '../ui/LinkifyText';
import LikeButton from './LikeButton';
import EmojiReactions from './EmojiReactions';
import CardMenu from './CardMenu';
import SentimentBadge from '../sentiment/SentimentBadge';
import { Card as CardType, EmojiReaction, CardColor } from '../../types/card';
import { Participant } from '../../types/participant';
import { SentimentResult } from '../../types/sentiment';
import { groupReactions, hasUserLiked } from '../../utils/cardHelpers';
import { getCardStyling, validateColor } from '../../utils/cardColors';

interface DraggableCardProps {
    card: CardType;
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
    // Sentiment analysis
    sentimentResult?: SentimentResult;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
    card,
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
    sentimentResult
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(card.content);
    const [isDeleting, setIsDeleting] = useState(false);

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

    return (
        <AnimatePresence>
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={isDragging ? 'rotate-2 shadow-xl' : ''}
            >
                <Card
                    variant="elevated"
                    hover={!isEditing && !isDragging}
                    customBackground={true}
                    className={`mb-3 group relative transition-all duration-300 ${isDragging ? 'shadow-lg border-blue-300' : ''} ${cardStyling}`}
                >
                    {/* Drag handle and Color picker */}
                    {canEdit && !isEditing && (
                        <div className="absolute top-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ColorPicker
                                selectedColor={cardColor}
                                onColorChange={handleColorChange}
                                size="sm"
                            />
                            <div className="cursor-grab active:cursor-grabbing">
                                <GripVertical size={16} className="text-slate-400 dark:text-slate-500" />
                            </div>
                        </div>
                    )}

                    {/* Header with author */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                            <User size={14} />
                            <span>{card.createdBy}</span>

                            {/* Sentiment Badge */}
                            {sentimentResult && card.column !== 'actions' && (
                                <SentimentBadge
                                    sentiment={sentimentResult.sentiment}
                                    confidence={sentimentResult.confidence}
                                    size="sm"
                                    showTooltip={true}
                                />
                            )}
                        </div>
                        <div className="flex items-center space-x-1">
                            {/* Legacy vote buttons - show only when votes > 0 */}
                            {(card.votes !== undefined && card.votes > 0) && (
                                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-1">
                                    <button
                                        onClick={() => handleVote(true)}
                                        className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        aria-label="Vote up"
                                    >
                                        <ThumbsUp size={14} />
                                    </button>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {card.votes ?? 0}
                                    </span>
                                    <button
                                        onClick={() => handleVote(false)}
                                        className="text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        aria-label="Vote down"
                                        disabled={!card.votes || card.votes === 0}
                                    >
                                        <ThumbsUp size={14} className="rotate-180" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-3">
                        {isEditing ? (
                            <TextareaWithEmoji
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                placeholder="Escribe tu comentario..."
                                rows={3}
                                autoFocus
                                className="w-full"
                                showEmojiPicker={true}
                            />
                        ) : (
                            <LinkifyText
                                text={card.content}
                                className="text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap"
                            />
                        )}
                    </div>

                    {/* Interactions Section */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2 flex-wrap">
                            {/* Like Button */}
                            <LikeButton
                                cardId={card.id}
                                likesCount={likesCount}
                                isLiked={isLiked}
                                onToggleLike={handleToggleLike}
                                disabled={!onLike}
                                likes={card.likes || []}
                            />

                            {/* Emoji Reactions */}
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

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                            {card.createdAt && new Date(card.createdAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>

                        <div className="flex items-center space-x-1">
                            {/* Botones de edición para el propietario */}
                            {canEditCard && (
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={handleSaveEdit}
                                                disabled={!editContent.trim()}
                                            >
                                                Guardar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleCancelEdit}
                                            >
                                                Cancelar
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setIsEditing(true)}
                                                aria-label="Edit card"
                                            >
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleDelete}
                                                loading={isDeleting}
                                                aria-label="Delete card"
                                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Card Menu para convertir a elemento de acción - disponible para facilitadores */}
                            {canConvertToAction && onConvertToAction && !isEditing && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CardMenu
                                        card={card}
                                        participants={participants}
                                        canConvertToAction={canConvertToAction}
                                        onConvertToAction={onConvertToAction}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
};

export default DraggableCard;