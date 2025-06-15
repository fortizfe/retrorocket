import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Hash } from 'lucide-react';
import { Card as CardType, EmojiReaction } from '../../types/card';
import { GroupingCriteria } from '../../types/columnGrouping';
import DragDropColumn from './DragDropColumn';

interface GroupedCardListProps {
    groupedCards: { [groupName: string]: CardType[] };
    groupBy: GroupingCriteria;
    onCardUpdate: (cardId: string, updates: Partial<CardType>) => Promise<void>;
    onCardDelete: (cardId: string) => Promise<void>;
    onCardVote: (cardId: string, increment: boolean) => Promise<void>;
    onCardLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onCardReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onCardReactionRemove: (cardId: string, userId: string) => Promise<void>;
    onCardsReorder: (updates: Array<{ cardId: string; order: number; column?: string }>) => Promise<void>;
    currentUser?: string;
}

const GroupedCardList: React.FC<GroupedCardListProps> = ({
    groupedCards,
    groupBy,
    onCardUpdate,
    onCardDelete,
    onCardVote,
    onCardLike,
    onCardReaction,
    onCardReactionRemove,
    onCardsReorder,
    currentUser
}) => {
    const groupNames = Object.keys(groupedCards);

    // If no grouping, render cards directly
    if (groupBy === 'none') {
        // When no grouping, cards should be in the 'ungrouped' key
        const cards = groupedCards['ungrouped'] || [];
        return (
            <DragDropColumn
                cards={cards}
                column={cards[0]?.column || 'what-went-well'} // Use column from first card or default
                onCardUpdate={onCardUpdate}
                onCardDelete={onCardDelete}
                onCardVote={onCardVote}
                onCardLike={onCardLike}
                onCardReaction={onCardReaction}
                onCardReactionRemove={onCardReactionRemove}
                onCardsReorder={onCardsReorder}
                currentUser={currentUser}
                canEdit={true}
            />
        );
    }

    // Render grouped cards with headers
    return (
        <div className="space-y-4">
            <AnimatePresence>
                {groupNames.map((groupName, index) => {
                    const cardsInGroup = groupedCards[groupName];
                    if (cardsInGroup.length === 0) return null;

                    return (
                        <motion.div
                            key={groupName}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="relative"
                        >
                            {/* Group Header */}
                            <div className="flex items-center gap-2 mb-3 px-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {groupBy === 'user' ? (
                                        <Users className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                    ) : (
                                        <Hash className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                                    )}
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                        {groupName}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span>{cardsInGroup.length}</span>
                                    <span>tarjeta{cardsInGroup.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            {/* Group Separator Line */}
                            <div className="absolute left-0 top-6 w-8 h-px bg-gradient-to-r from-slate-300 dark:from-slate-600 to-transparent"></div>

                            {/* Cards in this group */}
                            <div className="pl-6 border-l-2 border-slate-100 dark:border-slate-700">
                                <DragDropColumn
                                    cards={cardsInGroup}
                                    column={cardsInGroup[0]?.column || 'what-went-well'} // Use column from first card or default
                                    onCardUpdate={onCardUpdate}
                                    onCardDelete={onCardDelete}
                                    onCardVote={onCardVote}
                                    onCardLike={onCardLike}
                                    onCardReaction={onCardReaction}
                                    onCardReactionRemove={onCardReactionRemove}
                                    onCardsReorder={onCardsReorder}
                                    currentUser={currentUser}
                                    canEdit={true}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default GroupedCardList;
