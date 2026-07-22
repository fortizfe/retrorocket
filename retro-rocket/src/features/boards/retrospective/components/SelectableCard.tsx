import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Card, EmojiReaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import DraggableCard from '@/features/boards/retrospective/components/DraggableCard';

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
    // Props para elementos de acción
    participants?: Participant[];
    canConvertToAction?: boolean;
    onConvertToAction?: (cardContent: string, assignedTo?: string, assignedToName?: string) => void;
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
    onSelect,
    participants,
    canConvertToAction,
    onConvertToAction,
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
                        ? 'border-info-fg bg-info-bg'
                        : 'border-transparent hover:border-info-fg hover:bg-info-bg'
                        }`}
                >
                    {/* Selection Indicator */}
                    <div className="absolute top-2 right-2">
                        <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                                ? 'bg-info-fg border-info-fg'
                                : 'bg-surface border-border-default hover:border-info-fg'
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
                participants={participants}
                canConvertToAction={canConvertToAction}
                onConvertToAction={onConvertToAction}
            />
        </motion.div>
    );
};

export default SelectableCard;
