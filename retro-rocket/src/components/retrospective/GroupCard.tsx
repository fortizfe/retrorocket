import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Users, Sparkles, X } from 'lucide-react';
import { CardGroup, Card, EmojiReaction } from '../../types/card';
import DraggableCard from './DraggableCard';
import { CARD_COLORS } from '../../utils/cardColors';

interface GroupCardProps {
    group: CardGroup;
    cards: Card[];
    onToggleCollapse: (groupId: string) => void;
    onDisbandGroup: (groupId: string) => void;
    onRemoveCardFromGroup: (cardId: string) => void;
    onCardUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onCardDelete: (cardId: string) => Promise<void>;
    onCardVote?: (cardId: string, increment: boolean) => Promise<void>;
    onCardLike?: (cardId: string, userId: string, username: string) => Promise<void>;
    onCardReaction?: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onCardReactionRemove?: (cardId: string, userId: string) => Promise<void>;
    currentUserId?: string;
    isReadOnly?: boolean;
}

export const GroupCard: React.FC<GroupCardProps> = ({
    group,
    cards,
    onToggleCollapse,
    onDisbandGroup,
    onRemoveCardFromGroup,
    onCardUpdate,
    onCardDelete,
    onCardVote,
    onCardLike,
    onCardReaction,
    onCardReactionRemove,
    currentUserId,
    isReadOnly = false
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Find head card and member cards
    const headCard = cards.find(card => card.id === group.headCardId);
    const memberCards = cards.filter(card =>
        group.memberCardIds.includes(card.id)
    ).sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));

    if (!headCard) {
        return null;
    }

    const totalCards = 1 + memberCards.length;
    const hasCustomTitle = group.title && group.title.trim() !== '';

    // Get the primary color from the head card
    const headCardColor = headCard.color ?? 'pastelWhite';
    const colorConfig = CARD_COLORS[headCardColor];

    const handleDisbandGroup = () => {
        if (window.confirm(`¿Estás seguro de que quieres desagrupar estas ${totalCards} tarjetas?`)) {
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
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br ${colorConfig.background} ${colorConfig.border} overflow-hidden shadow-sm`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Group Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                        <button
                            onClick={() => onToggleCollapse(group.id)}
                            className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group"
                            disabled={isReadOnly}
                        >
                            {group.isCollapsed ? (
                                <ChevronRight className="w-4 h-4 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                            )}
                            <Users className="w-4 h-4" />
                        </button>

                        <div className="flex-1">
                            {hasCustomTitle ? (
                                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {group.title}
                                </h3>
                            ) : (
                                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Grupo de {totalCards} tarjetas
                                </h3>
                            )}
                            <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <span className="flex items-center space-x-1">
                                    <span>📝</span>
                                    <span>{totalCards} tarjetas</span>
                                </span>
                                {group.totalVotes && group.totalVotes > 0 && (
                                    <span className="flex items-center space-x-1">
                                        <span>👍</span>
                                        <span>{group.totalVotes} votos</span>
                                    </span>
                                )}
                                {group.totalLikes && group.totalLikes > 0 && (
                                    <span className="flex items-center space-x-1">
                                        <span>❤️</span>
                                        <span>{group.totalLikes} likes</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {!isReadOnly && isHovered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center space-x-1"
                        >
                            <button
                                onClick={handleDisbandGroup}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                title="Desagrupar tarjetas"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
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
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-3">
                            {/* Head Card */}
                            <div className="relative">
                                {totalCards > 1 && (
                                    <div className="absolute -top-2 -left-2 z-10">
                                        <div className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                                            <Sparkles className="w-3 h-3" />
                                            <span>Principal</span>
                                        </div>
                                    </div>
                                )}
                                <DraggableCard
                                    card={headCard}
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
                            </div>

                            {/* Member Cards */}
                            {memberCards.map((card, index) => (
                                <motion.div
                                    key={card.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="ml-4 relative"
                                >
                                    {/* Connection line */}
                                    <div className="absolute -left-2 top-4 w-2 h-0.5 bg-slate-300 dark:bg-slate-600"></div>
                                    <div className="absolute -left-2 top-0 w-0.5 h-full bg-slate-300 dark:bg-slate-600"></div>

                                    <DraggableCard
                                        card={card}
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
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collapsed State Summary */}
            {group.isCollapsed && (
                <div className="p-4">
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                        <span className="flex items-center space-x-2">
                            <span>📝</span>
                            <span>{headCard.content.substring(0, 50)}{headCard.content.length > 50 ? '...' : ''}</span>
                        </span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">
                            +{memberCards.length} más
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};
