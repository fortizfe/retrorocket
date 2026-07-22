import React from 'react';
import { motion } from 'framer-motion';
import { Smile } from 'lucide-react';
import { EmojiReaction, GroupedReaction } from '@/features/boards/types/card';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useEmojiPicker } from '@/features/boards/retrospective/hooks/useEmojiPicker';
import ReactionBadge from '@/features/boards/retrospective/components/ReactionBadge';
import ReactionPicker from '@/features/boards/retrospective/components/ReactionPicker';

interface EmojiReactionsProps {
    cardId: string;
    groupedReactions: GroupedReaction[];
    currentUserId?: string;
    userReaction?: string | null;
    onReaction?: (emoji: EmojiReaction) => void;
    onAddReaction?: (emoji: EmojiReaction) => void;
    onRemoveReaction: () => void;
    disabled?: boolean;
}

/**
 * Card reaction control: existing-reaction badges plus a trigger that opens an
 * anchored emoji picker. Positioning/dismissal live in `useEmojiPicker`
 * (Floating UI); rendering is split into `ReactionBadge` and `ReactionPicker`
 * (Library-First / SRP).
 */
const EmojiReactions: React.FC<EmojiReactionsProps> = ({
    groupedReactions = [],
    currentUserId,
    userReaction: userReactionProp,
    onReaction,
    onAddReaction,
    onRemoveReaction,
    disabled = false,
}) => {
    const { t } = useLanguage();

    // Current user's reaction: explicit prop wins, otherwise derive from the data.
    const computedReaction = groupedReactions.find((reaction) =>
        currentUserId ? reaction.users?.includes(currentUserId) : false
    )?.emoji || null;
    const userReaction = typeof userReactionProp !== 'undefined' ? userReactionProp : computedReaction;

    const handleSelect = (emoji: EmojiReaction) => {
        if (onAddReaction) onAddReaction(emoji);
        else if (onReaction) onReaction(emoji);
    };

    const picker = useEmojiPicker({
        disabled,
        userReaction,
        onSelect: handleSelect,
        onRemove: onRemoveReaction,
    });

    // Tooltip text for an existing reaction pill.
    const createReactionTooltipText = (reaction: GroupedReaction) => {
        const { emoji, count, users } = reaction;
        if (count === 0) {
            return t('retrospective.emojiReactions.reactions.tooltips.none', { emoji });
        }
        if (count === 1) {
            return t('retrospective.emojiReactions.reactions.tooltips.single', { user: users[0], emoji });
        }
        if (count === 2) {
            return t('retrospective.emojiReactions.reactions.tooltips.double', {
                user1: users[0],
                user2: users[1],
                emoji,
            });
        }
        if (count <= 5) {
            const allButLast = users.slice(0, -1).join(', ');
            const last = users[users.length - 1];
            return t('retrospective.emojiReactions.reactions.tooltips.multiple', {
                users: allButLast,
                lastUser: last,
                emoji,
            });
        }
        const first3 = users.slice(0, 3).join(', ');
        const remaining = count - 3;
        return t('retrospective.emojiReactions.reactions.tooltips.many', { users: first3, remaining, emoji });
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-1 flex-wrap">
                {groupedReactions.map((reaction) => (
                    <ReactionBadge
                        key={reaction.emoji}
                        reaction={reaction}
                        isMine={userReaction === reaction.emoji}
                        disabled={disabled}
                        onToggle={picker.selectEmoji}
                        tooltip={createReactionTooltipText(reaction)}
                    />
                ))}

                {/* Add-reaction trigger */}
                <motion.button
                    ref={picker.refs.setReference}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={disabled}
                    title={t('retrospective.emojiReactions.picker.addReaction')}
                    aria-label={t('retrospective.emojiReactions.picker.addReactionButton')}
                    className={`
                        flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1
                        ${picker.open
                            ? 'bg-info-bg text-info-fg border-2 border-info-fg'
                            : 'bg-surface hover:bg-surface-raised text-text-muted border border-border-default'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
                    `}
                    {...picker.getReferenceProps()}
                >
                    <Smile size={16} />
                </motion.button>
            </div>

            {picker.open && (
                <ReactionPicker
                    context={picker.context}
                    setFloating={picker.refs.setFloating}
                    floatingStyles={picker.floatingStyles}
                    getFloatingProps={picker.getFloatingProps}
                    userReaction={userReaction}
                    onSelect={picker.selectEmoji}
                    disabled={disabled}
                />
            )}
        </div>
    );
};

export default EmojiReactions;
