import React from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { Card, EmojiReaction } from '../../types/card';
import { ColumnType } from '../../types/retrospective';
import SortableCard from './SortableCard';
import DraggableCard from './DraggableCard';

interface DragDropColumnProps {
    cards: Card[];
    column: ColumnType;
    onCardUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onCardDelete: (cardId: string) => Promise<void>;
    onCardVote: (cardId: string, increment: boolean) => Promise<void>;
    onCardLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onCardReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onCardReactionRemove: (cardId: string, userId: string) => Promise<void>;
    onCardsReorder: (updates: Array<{ cardId: string; order: number; column?: string }>) => Promise<void>;
    currentUser?: string;
    canEdit?: boolean;
    children?: React.ReactNode;
}

const DragDropColumn: React.FC<DragDropColumnProps> = ({
    cards,
    column,
    onCardUpdate,
    onCardDelete,
    onCardVote,
    onCardLike,
    onCardReaction,
    onCardReactionRemove,
    onCardsReorder,
    currentUser,
    canEdit = true,
    children
}) => {
    const [activeCard, setActiveCard] = React.useState<Card | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Sort cards by order
    const sortedCards = React.useMemo(() => {
        return [...cards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [cards]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const card = cards.find(c => c.id === active.id);
        setActiveCard(card || null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Handle dragging between columns if needed
        // For now, we'll focus on reordering within the same column
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);

        if (!over || active.id === over.id) {
            return;
        }

        const activeCard = cards.find(c => c.id === active.id);
        const overCard = cards.find(c => c.id === over.id);

        if (!activeCard || !overCard) {
            return;
        }

        // If cards are in different columns, we could handle cross-column moves here
        if (activeCard.column !== overCard.column) {
            // For now, we'll keep cards in their original columns
            return;
        }

        const oldIndex = sortedCards.findIndex(c => c.id === active.id);
        const newIndex = sortedCards.findIndex(c => c.id === over.id);

        if (oldIndex !== newIndex) {
            const newOrder = arrayMove(sortedCards, oldIndex, newIndex);

            // Calculate new order values
            const updates = newOrder.map((card, index) => ({
                cardId: card.id,
                order: index,
                column: card.column
            }));

            onCardsReorder(updates);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={sortedCards.map(card => card.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-3">
                    {children}
                    {sortedCards.map((card) => (
                        <SortableCard
                            key={card.id}
                            card={card}
                            onUpdate={onCardUpdate}
                            onDelete={onCardDelete}
                            onVote={onCardVote}
                            onLike={onCardLike}
                            onReaction={onCardReaction}
                            onReactionRemove={onCardReactionRemove}
                            currentUser={currentUser}
                            canEdit={canEdit}
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeCard ? (
                    <DraggableCard
                        card={activeCard}
                        isDragging={true}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default DragDropColumn;
