import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface LikeButtonProps {
    cardId: string;
    likesCount: number;
    isLiked: boolean;
    onToggleLike: () => void;
    disabled?: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
    cardId,
    likesCount,
    isLiked,
    onToggleLike,
    disabled = false
}) => {
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
                    ? 'bg-blue-100 border border-blue-300 text-blue-600'
                    : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600'
                }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
      `}
            title={isLiked ? 'Remove like' : 'Like this card'}
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
