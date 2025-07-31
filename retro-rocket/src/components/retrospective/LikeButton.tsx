import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Like } from '../../types/card';

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
    // Create tooltip text showing usernames
    const createTooltipText = () => {
        if (likesCount === 0) {
            return 'Dar like a esta tarjeta';
        }

        const usernames = likes.map(like => like.username);

        if (likesCount === 1) {
            return `${usernames[0]} le ha dado like`;
        } else if (likesCount === 2) {
            return `${usernames[0]} y ${usernames[1]} les ha dado like`;
        } else if (likesCount <= 5) {
            const allButLast = usernames.slice(0, -1).join(', ');
            const last = usernames[usernames.length - 1];
            return `${allButLast} y ${last} les ha dado like`;
        } else {
            const first3 = usernames.slice(0, 3).join(', ');
            const remaining = likesCount - 3;
            return `${first3} y ${remaining} más les ha dado like`;
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
