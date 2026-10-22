import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { SortingStrategy } from '@dnd-kit/sortable';
import { Card, EmojiReaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import SortableCard from '@/features/boards/retrospective/components/SortableCard';

/**
 * A SortableContext plus the card list (spec 059, T031). The DndContext, sensors,
 * DragOverlay and drop handling live in ColumnDndProvider, so this component is only the
 * `section:<authorId>` list used in mode `user`; the provider routes the section reorder.
 */
interface DragDropColumnProps {
    /** SortableContext id, e.g. `section:<authorId>`; the provider uses it to confine reorders. */
    id?: string;
    strategy?: SortingStrategy;
    cards: Card[];
    column: string; // Changed from ColumnType to string for dynamic column support
    onCardUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onCardDelete: (cardId: string) => Promise<void>;
    onCardVote: (cardId: string, increment: boolean) => Promise<void>;
    onCardLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onCardReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onCardReactionRemove: (cardId: string, userId: string) => Promise<void>;
    /** Accepted for call-site compatibility only: ColumnDndProvider performs the reorder. */
    onCardsReorder?: (updates: Array<{ cardId: string; order: number; column?: string }>) => Promise<void>;
    currentUser?: string;
    canEdit?: boolean;
    children?: React.ReactNode;
    // New props for grouping functionality
    isGroupingMode?: boolean;
    selectedCards?: Set<string>;
    onCardSelect?: (cardId: string) => void;
    // Props para elementos de acción
    participants?: Participant[];
    canConvertToAction?: boolean;
    onConvertToAction?: (cardContent: string, assignedTo?: string, assignedToName?: string) => void;
}

const DragDropColumn: React.FC<DragDropColumnProps> = ({
    id,
    strategy = verticalListSortingStrategy,
    cards,
    column: _column,
    onCardUpdate,
    onCardDelete,
    onCardVote,
    onCardLike,
    onCardReaction,
    onCardReactionRemove,
    onCardsReorder: _onCardsReorder,
    currentUser,
    canEdit = true,
    children,
    isGroupingMode = false,
    selectedCards = new Set(),
    onCardSelect,
    participants,
    canConvertToAction,
    onConvertToAction,
}) => {
    // Sort cards by order and filter out any cards with invalid IDs
    const sortedCards = React.useMemo(() => {
        const validCards = cards.filter(card =>
            card?.id &&
            typeof card.id === 'string' &&
            card.id.length > 0
        );
        return [...validCards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [cards]);

    return (
        <SortableContext
            id={id}
            items={sortedCards.map(card => `card:${card.id}`)}
            strategy={strategy}
        >
            <div className="space-y-3">
                {children}
                {/* AnimatePresence must directly parent the list whose members mount/
                    unmount for a card's exit animation to run at all — it was previously
                    nested one level too deep, inside DraggableCard itself, where React
                    unmounts the whole subtree (including that inner AnimatePresence)
                    before it ever sees the real removal (design audit finding, spec 028). */}
                <AnimatePresence>
                    {React.useMemo(() => sortedCards.map((card) => {
                        return (
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
                                isGroupingMode={isGroupingMode}
                                isSelected={selectedCards.has(card.id)}
                                onSelect={onCardSelect}
                                participants={participants}
                                canConvertToAction={canConvertToAction}
                                onConvertToAction={onConvertToAction}
                            />
                        );
                    }), [sortedCards, onCardUpdate, onCardDelete, onCardVote, onCardLike, onCardReaction, onCardReactionRemove, currentUser, canEdit, isGroupingMode, selectedCards, onCardSelect, participants, canConvertToAction, onConvertToAction])}
                </AnimatePresence>
            </div>
        </SortableContext>
    );
};

export default DragDropColumn;
