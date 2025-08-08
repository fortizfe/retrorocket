import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Like } from '../../types/card';
import { useLanguage } from '../../hooks/useLanguage';

interface LikeButtonProps {
    cardId: string;
    likesCount: number;
    isLiked: boolean;
    onToggleLike: () => void;
    disabled?: boolean;
    likes?: Like[]; // Array of like objects with usernames
}

const LikeButton: React.FC<LikeButtonProps> = ({
    cardId,
    likesCount,
    isLiked,
    onToggleLike,
    disabled = false,
    likes = []
}) => {
    const { t } = useLanguage();

    // Create tooltip text showing usernames
    const createTooltipText = () => {
        if (likesCount === 0) {
            return t('retrospective.likeButton.likeCard');
        }

        const usernames = likes.map(like => like.username);

        if (likesCount === 1) {
            return t('retrospective.likeButton.singleLike', { username: usernames[0] });
        } else if (likesCount === 2) {
            return t('retrospective.likeButton.doubleLike', {
                username1: usernames[0],
                username2: usernames[1]
            });
        } else if (likesCount <= 5) {
            const allButLast = usernames.slice(0, -1).join(', ');
            const last = usernames[usernames.length - 1];
            return t('retrospective.likeButton.multipleLikes', {
                usernames: allButLast,
                lastUser: last
            });
        } else {
            const first3 = usernames.slice(0, 3).join(', ');
            const remaining = likesCount - 3;
            return t('retrospective.likeButton.manyLikes', {
                usernames: first3,
                remaining
            });
        }
    };
    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            onClick={onToggleLike}
            disabled={disabled}
            className={`
        flex items-center gap-1 px-2 py-1 rounded-full text-sm
        transition-all duration-200 min-w-[2.5rem] justify-center
        ${isLiked
                    ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
      `}
            title={createTooltipText()}
        >
            <motion.div
                animate={{
                    scale: isLiked ? [1, 1.3, 1] : 1,
                }}
                transition={{
                    duration: 0.3,
                    ease: "easeInOut"
                }}
            >
                <Plus
                    size={14}
                    className={isLiked ? 'fill-current' : ''}
                />
            </motion.div>
            <span className="font-medium">{likesCount}</span>
        </motion.button>
    );
};

export default LikeButton;
