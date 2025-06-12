import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Card, EmojiReaction } from '../../types/card';
import DraggableCard from './DraggableCard';

interface SelectableCardProps {
    card: Card;
    onUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onDelete: (cardId: string) => Promise<void>;
    onVote: (cardId: string, increment: boolean) => Promise<void>;
    onLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onReactionRemove: (cardId: string, userId: string) => Promise<void>;
    currentUser?: string;
    canEdit?: boolean;
    isDragging?: boolean;
    isGroupingMode?: boolean;
    isSelected?: boolean;
    onSelect?: (cardId: string) => void;
}

const SelectableCard: React.FC<SelectableCardProps> = ({
    card,
    onUpdate,
    onDelete,
    onVote,
    onLike,
    onReaction,
    onReactionRemove,
    currentUser,
    canEdit = true,
    isDragging = false,
    isGroupingMode = false,
    isSelected = false,
    onSelect
}) => {
    const handleCardClick = (e: React.MouseEvent) => {
        if (isGroupingMode && onSelect) {
            e.preventDefault();
            e.stopPropagation();
            onSelect(card.id);
        }
    };

    return (
        <motion.div
            className={`relative ${isGroupingMode ? 'cursor-pointer' : ''}`}
            onClick={handleCardClick}
            whileHover={isGroupingMode ? { scale: 1.02 } : undefined}
            transition={{ duration: 0.1 }}
        >
            {/* Selection Overlay */}
            {isGroupingMode && (
                <div
                    className={`absolute inset-0 z-10 rounded-lg border-2 transition-all duration-200 ${isSelected
                            ? 'border-blue-500 bg-blue-50 bg-opacity-20'
                            : 'border-transparent hover:border-blue-300 hover:bg-blue-50 hover:bg-opacity-10'
                        }`}
                >
                    {/* Selection Indicator */}
                    <div className="absolute top-2 right-2">
                        <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-300 hover:border-blue-400'
                                }`}
                        >
                            {isSelected && (
                                <Check className="w-4 h-4 text-white" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Card Component */}
            <DraggableCard
                card={card}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onVote={onVote}
                onLike={onLike}
                onReaction={onReaction}
                onReactionRemove={onReactionRemove}
                currentUser={currentUser}
                canEdit={canEdit && !isGroupingMode} // Disable editing in grouping mode
                isDragging={isDragging}
            />
        </motion.div>
    );
};

export default SelectableCard;
