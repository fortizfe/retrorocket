import React from 'react';
import { motion } from 'framer-motion';
import { EmojiReaction, GroupedReaction } from '@/features/boards/types/card';

interface ReactionBadgeProps {
    reaction: GroupedReaction;
    /** Whether the current user has reacted with this emoji. */
    isMine: boolean;
    disabled?: boolean;
    onToggle: (emoji: EmojiReaction) => void;
    /** Localized tooltip / accessible description. */
    tooltip: string;
}

/**
 * A single existing-reaction pill (emoji + count). The "mine" state is conveyed by
 * more than color alone: a thicker border (border-2 vs border) and `aria-pressed`
 * for assistive tech, per WCAG 2.1 AA use-of-color (Principle VIII). Colors come
 * from semantic tokens only.
 */
const ReactionBadge: React.FC<ReactionBadgeProps> = ({
    reaction,
    isMine,
    disabled = false,
    onToggle,
    tooltip,
}) => (
    <motion.button
        type="button"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onToggle(reaction.emoji)}
        disabled={disabled}
        aria-pressed={isMine}
        aria-label={tooltip}
        title={tooltip}
        className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs
            transition-all duration-200 min-w-[2rem] justify-center
            focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1
            ${isMine
                ? 'bg-info-bg border-2 border-info-fg text-info-fg font-semibold'
                : 'bg-surface hover:bg-surface-raised border border-border-default text-text-secondary'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
    >
        <span className="text-sm">{reaction.emoji}</span>
        <span className="font-medium">{reaction.count}</span>
    </motion.button>
);

export default ReactionBadge;
