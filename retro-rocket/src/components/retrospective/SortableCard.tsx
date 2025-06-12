import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, EmojiReaction } from '../../types/card';
import SelectableCard from './SelectableCard';

interface SortableCardProps {
    card: Card;
    onUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onDelete: (cardId: string) => Promise<void>;
    onVote: (cardId: string, increment: boolean) => Promise<void>;
    onLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onReactionRemove: (cardId: string, userId: string) => Promise<void>;
    currentUser?: string;
    canEdit?: boolean;
    isGroupingMode?: boolean;
    isSelected?: boolean;
    onSelect?: (cardId: string) => void;
}

const SortableCard: React.FC<SortableCardProps> = ({
    card,
    onUpdate,
    onDelete,
    onVote,
    onLike,
    onReaction,
    onReactionRemove,
    currentUser,
    canEdit = true,
    isGroupingMode = false,
    isSelected = false,
    onSelect
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: card.id,
        data: {
            type: 'card',
            card,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
        >
            <SelectableCard
                card={card}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onVote={onVote}
                onLike={onLike}
                onReaction={onReaction}
                onReactionRemove={onReactionRemove}
                currentUser={currentUser}
                canEdit={canEdit}
                isDragging={isDragging}
                isGroupingMode={isGroupingMode}
                isSelected={isSelected}
                onSelect={onSelect}
            />
        </div>
    );
};

export default SortableCard;
